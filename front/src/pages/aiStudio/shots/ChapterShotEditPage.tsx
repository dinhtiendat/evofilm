import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Divider, Empty, Layout, List, Modal, Popconfirm, Segmented, Space, Spin, Tabs, Tooltip, Typography, message } from 'antd'
import { ArrowLeftOutlined, ClearOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import type {
  EntityNameExistenceItem,
  ShotAssetOverviewItem,
  ShotAssetsOverviewRead,
  ShotDetailRead,
  ShotDialogLineRead,
  ShotDialogLineUpdate,
  ShotExtractionSummaryRead,
  ShotExtractedDialogueCandidateRead,
  ShotPreparationStateRead,
  ShotRead,
} from '../../../services/generated'
import {
  ScriptProcessingService,
  StudioChaptersService,
  StudioEntitiesService,
  StudioProjectsService,
  StudioShotDetailsService,
  StudioShotDialogLinesService,
  StudioShotsService,
} from '../../../services/generated'
import { executeAsyncTaskCreate, executeTaskCancel, notifyExistingTask } from '../components/taskActionHelpers'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getChapterShotEditPath, getChapterShotsPath, getChapterStudioPath } from '../project/ProjectWorkbench/routes'
import { DisplayImageCard } from '../assets/components/DisplayImageCard'
import { ChapterShotAssetConfirmation } from './components/ChapterShotAssetConfirmation'
import { ChapterShotBasicInfoSection } from './components/ChapterShotBasicInfoSection'
import { ChapterShotDialogueConfirmation } from './components/ChapterShotDialogueConfirmation'
import { ChapterShotPreparationGuide } from './components/ChapterShotPreparationGuide'
import { useRelationTaskNotification } from '../components/taskNotificationHelpers'
import { useTaskPageContext } from '../components/taskPageContext'
import { createTaskSettledReloader } from '../components/taskResultHelpers'
import { TASK_COPY } from '../components/taskCopy'
import {
  SCRIPT_EXTRACTION_RELATION_TYPE,
  useCancelableRelationTask,
} from '../project/ProjectWorkbench/chapterDivisionTasks'
import { StudioEntitiesApi } from '../../../services/studioEntities'
import { resolveAssetUrl } from '../assets/utils'

const { Header, Content } = Layout
const extractTaskCopy = TASK_COPY.scriptExtract

type AssetKind = 'scene' | 'actor' | 'prop' | 'costume'
type NamedDraft = { name: string; thumbnail?: string | null; id?: string | null; file_id?: string | null; description?: string | null }
type AssetVM = NamedDraft & {
  kind: AssetKind
  status: 'linked' | 'new'
  candidateId?: number
  candidateStatus?: ShotAssetOverviewItem['candidate_status']
}
type ShotListFilter = 'all' | 'not_extracted' | 'pending'

type ShotAssetCreatedAndLinkedMessage = {
  type: 'studio-shot-asset-created-and-linked'
  projectId?: string
  chapterId?: string
  shotId?: string
  assetId?: string | null
  assetName?: string
}

const DEFAULT_EXTRACTION_SUMMARY: ShotExtractionSummaryRead = {
  state: 'not_extracted',
  has_extracted: false,
  last_extracted_at: null,
  asset_candidate_total: 0,
  dialogue_candidate_total: 0,
  pending_asset_count: 0,
  pending_dialogue_count: 0,
}

function getExtractionStateMeta(
  shot: ShotRead | null,
  pendingConfirmCount: number,
): {
  tone: 'green' | 'gold' | 'blue'
  title: string
  description: string
} {
  const state = shot?.extraction?.state
  if (state === 'skipped') {
    return {
      tone: 'green',
      title: 'Phân cảnh hiện tại đã được đánh dấu là không cần trích xuất',
      description: 'Hệ thống sẽ xử lý như "hoàn tất xác nhận trích xuất". Nếu cần khôi phục luồng trích xuất chính thức, vui lòng dùng thao tác bảo trì phía trên.',
    }
  }
  if (state === 'not_extracted') {
    return {
      tone: 'gold',
      title: 'Phân cảnh hiện tại chưa thực hiện trích xuất thông tin',
      description: 'sau khi bấm "trích xuất và làm mới ứng viên", hệ thống sẽ đồng thời trích xuất ứng viên tài nguyên và thoại.',
    }
  }
  if (state === 'extracted_empty') {
    return {
      tone: 'blue',
      title: 'Phân cảnh hiện tại đã hoàn tất trích xuất, nhưng chưa nhận diện được ứng viên nào',
      description: 'điều này cho thấy hệ thống đã chạy qua luồng trích xuất, chỉ là hiện chưa nhận ra ứng viên tài nguyên hay thoại.',
    }
  }
  if (state === 'extracted_resolved') {
    return {
      tone: 'green',
      title: 'Kết quả trích xuất của phân cảnh hiện tại đã xác nhận xong',
      description: 'ứng viên tài nguyên và thoại đều đã xử lý xong, có thể tiếp tục vào luồng sinh sau.',
    }
  }
  return {
    tone: 'gold',
    title: 'Phân cảnh hiện tại vẫn còn kết quả trích xuất chờ xác nhận',
    description: `Còn ${pendingConfirmCount} mục chờ xử lý, nên hoàn tất xác nhận tài nguyên và thoại trước.`,
  }
}

function getShotExtractionSummary(shot: ShotRead | null | undefined): ShotExtractionSummaryRead {
  return shot?.extraction ?? DEFAULT_EXTRACTION_SUMMARY
}

function getExtractionListStatus(shot: ShotRead): {
  text: string
  background: string
  color: string
} {
  const state = getShotExtractionSummary(shot).state
  if (state === 'skipped') {
    return { text: 'Đã bỏ qua', background: '#e0f2fe', color: '#075985' }
  }
  if (state === 'not_extracted') {
    return { text: 'Chưa trích xuất', background: '#fef3c7', color: '#92400e' }
  }
  if (state === 'extracted_empty') {
    return { text: 'Đã trích xuất, không có kết quả', background: '#dbeafe', color: '#1d4ed8' }
  }
  if (state === 'extracted_resolved' || shot.status === 'ready') {
    return { text: 'Đã xác nhận', background: '#dbeafe', color: '#1d4ed8' }
  }
  return { text: 'Chờ xác nhận', background: '#fef3c7', color: '#92400e' }
}

function isPendingExtractionConfirmation(shot: ShotRead): boolean {
  return getShotExtractionSummary(shot).state === 'extracted_pending'
}

function isActionablePreparationShot(shot: ShotRead): boolean {
  const state = getShotExtractionSummary(shot).state
  return state === 'not_extracted' || state === 'extracted_pending'
}

function getShotPreparationIssueSummary(shot: ShotRead): {
  text: string
  tone: 'gold' | 'blue' | 'green'
} {
  const basicReady = !!shot.title?.trim() && !!shot.script_excerpt?.trim()
  const extractionState = getShotExtractionSummary(shot).state
  if (!basicReady) {
    return { text: 'Cơ bản còn thiếu', tone: 'gold' }
  }
  if (extractionState === 'not_extracted') {
    return { text: 'Chờ thực thi trích xuất', tone: 'gold' }
  }
  if (extractionState === 'extracted_pending') {
    return { text: 'Ứng viên chờ xác nhận', tone: 'gold' }
  }
  if (extractionState === 'extracted_empty') {
    return { text: 'Đã trích xuất không có kết quả', tone: 'blue' }
  }
  if (extractionState === 'skipped') {
    return { text: 'Đã bỏ qua trích xuất', tone: 'blue' }
  }
  return { text: 'Chuẩn bị xong', tone: 'green' }
}

function overviewTypeToAssetKind(kind: ShotAssetOverviewItem['type']): AssetKind {
  return kind === 'character' ? 'actor' : kind
}

export function ChapterShotEditPage() {
  const navigate = useNavigate()
  const { projectId, chapterId, shotId } = useParams<{
    projectId: string
    chapterId: string
    shotId: string
  }>()

  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterIndex, setChapterIndex] = useState<number | null>(null)
  const [projectVisualStyle, setProjectVisualStyle] = useState<'live_action' | 'anime'>('live_action')
  const [projectStyle, setProjectStyle] = useState<string>('real_people_city')
  const [shots, setShots] = useState<ShotRead[]>([])
  const [shot, setShot] = useState<ShotRead | null>(null)
  const [title, setTitle] = useState('')
  const [scriptExcerpt, setScriptExcerpt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [semanticSaving, setSemanticSaving] = useState(false)
  const [preparationState, setPreparationState] = useState<ShotPreparationStateRead | null>(null)
  const [shotDetail, setShotDetail] = useState<ShotDetailRead | null>(null)
  const [shotAssetsOverview, setShotAssetsOverview] = useState<ShotAssetsOverviewRead | null>(null)
  const preparationStateRequestSeqRef = useRef(0)
  const [extractingAssets, setExtractingAssets] = useState(false)
  const [batchExtractingAssets, setBatchExtractingAssets] = useState(false)
  const [skipExtractionUpdating, setSkipExtractionUpdating] = useState(false)
  const extractInFlightRef = useRef(false)
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>(shotId ? [shotId] : [])
  const pendingExternalAssetCreateRef = useRef(false)

  const [linkingOpen, setLinkingOpen] = useState(false)
  const [linkingLoading, setLinkingLoading] = useState(false)
  const [linkingActionLoading, setLinkingActionLoading] = useState(false)
  const [linkingHint, setLinkingHint] = useState<string>('')
  const [linkingKind, setLinkingKind] = useState<AssetKind>('scene')
  const [linkingName, setLinkingName] = useState<string>('')
  const [linkingThumb, setLinkingThumb] = useState<string | undefined>(undefined)
  const [linkingItem, setLinkingItem] = useState<EntityNameExistenceItem | null>(null)

  const [existenceByKindName, setExistenceByKindName] = useState<Record<AssetKind, Record<string, EntityNameExistenceItem>>>({
    scene: {},
    actor: {},
    prop: {},
    costume: {},
  })
  const existenceInFlightRef = useRef<Record<AssetKind, boolean>>({
    scene: false,
    actor: false,
    prop: false,
    costume: false,
  })

  const [dialogLoading, setDialogLoading] = useState(false)
  const [savedDialogLines, setSavedDialogLines] = useState<ShotDialogLineRead[]>([])
  const [extractedDialogLines, setExtractedDialogLines] = useState<ShotExtractedDialogueCandidateRead[]>([])
  const [dialogDeletingIds, setDialogDeletingIds] = useState<Record<number, boolean>>({})
  const [dialogAddingKeys, setDialogAddingKeys] = useState<Record<string, boolean>>({})
  const [batchDialogAdding, setBatchDialogAdding] = useState(false)
  const [candidateActionIds, setCandidateActionIds] = useState<Record<number, boolean>>({})
  const [editorTabKey, setEditorTabKey] = useState<'basic' | 'confirm'>('basic')
  const [shotListFilter, setShotListFilter] = useState<ShotListFilter>('all')
  const dialogDebounceTimersRef = useRef<Map<number, number>>(new Map())
  const tabAutoInitShotIdRef = useRef<string | null>(null)
  const editorTabMemoryRef = useRef<Record<string, 'basic' | 'confirm'>>({})

  const shotsSorted = useMemo(
    () => [...shots].sort((a, b) => a.index - b.index),
    [shots],
  )
  const selectedShots = useMemo(
    () => shotsSorted.filter((item) => selectedShotIds.includes(item.id)),
    [selectedShotIds, shotsSorted],
  )
  const multiSelectActive = selectedShotIds.length > 1
  const shotListFilterCounts = useMemo(
    () => ({
      all: shotsSorted.length,
      not_extracted: shotsSorted.filter((item) => getShotExtractionSummary(item).state === 'not_extracted').length,
      pending: shotsSorted.filter((item) => isPendingExtractionConfirmation(item)).length,
    }),
    [shotsSorted],
  )
  const shotListFilterOptions = useMemo<Array<{ label: string; value: ShotListFilter }>>(
    () => [
      { label: `Tất cả ${shotListFilterCounts.all}`, value: 'all' },
      { label: `Chưa trích xuất ${shotListFilterCounts.not_extracted}`, value: 'not_extracted' },
      { label: `Chờ xác nhận ${shotListFilterCounts.pending}`, value: 'pending' },
    ],
    [shotListFilterCounts.all, shotListFilterCounts.not_extracted, shotListFilterCounts.pending],
  )
  const filteredShots = useMemo(() => {
    if (shotListFilter === 'all') return shotsSorted
    if (shotListFilter === 'not_extracted') {
      return shotsSorted.filter((item) => getShotExtractionSummary(item).state === 'not_extracted')
    }
    return shotsSorted.filter((item) => isPendingExtractionConfirmation(item))
  }, [shotListFilter, shotsSorted])
  const nextActionableShot = useMemo(() => {
    if (!shotId) return shotsSorted.find((item) => isActionablePreparationShot(item)) ?? null
    const currentIndex = shotsSorted.findIndex((item) => item.id === shotId)
    if (currentIndex < 0) {
      return shotsSorted.find((item) => isActionablePreparationShot(item)) ?? null
    }
    for (let i = currentIndex + 1; i < shotsSorted.length; i += 1) {
      if (isActionablePreparationShot(shotsSorted[i])) return shotsSorted[i]
    }
    for (let i = 0; i < currentIndex; i += 1) {
      if (isActionablePreparationShot(shotsSorted[i])) return shotsSorted[i]
    }
    return null
  }, [shotId, shotsSorted])

  const unionAssets = useMemo(() => {
    const groups: Record<AssetKind, AssetVM[]> = {
      scene: [],
      actor: [],
      prop: [],
      costume: [],
    }
    for (const item of shotAssetsOverview?.items ?? []) {
      if (item.candidate_status === 'ignored') continue
      const kind = overviewTypeToAssetKind(item.type)
      groups[kind].push({
        kind,
        name: item.name,
        thumbnail: item.thumbnail ?? null,
        id: item.linked_entity_id ?? null,
        file_id: item.file_id ?? null,
        description: item.description ?? null,
        status: item.is_linked ? 'linked' : 'new',
        candidateId: item.candidate_id ?? undefined,
        candidateStatus: item.candidate_status ?? undefined,
      })
    }
    return groups
  }, [shotAssetsOverview])

  const [expandedKinds, setExpandedKinds] = useState<Record<AssetKind, boolean>>({
    scene: false,
    actor: false,
    prop: false,
    costume: false,
  })

  const toggleExpanded = (kind: AssetKind) => {
    setExpandedKinds((prev) => ({ ...prev, [kind]: !prev[kind] }))
  }

  const loadPage = useCallback(async () => {
    if (!chapterId || !shotId || !projectId) return
    setLoading(true)
    setDialogLoading(true)
    try {
      const [projectRes, chRes, listRes, preparationRes, detailRes] = await Promise.all([
        StudioProjectsService.getProjectApiV1StudioProjectsProjectIdGet({ projectId }),
        StudioChaptersService.getChapterApiV1StudioChaptersChapterIdGet({ chapterId }),
        StudioShotsService.listShotsApiV1StudioShotsGet({
          chapterId,
          page: 1,
          pageSize: 100,
          order: 'index',
          isDesc: false,
        }),
        StudioShotsService.getShotPreparationStateApiApiV1StudioShotsShotIdPreparationStateGet({ shotId }),
        StudioShotDetailsService.getShotDetailApiV1StudioShotDetailsShotIdGet({ shotId }),
      ])
      const nextVisualStyle = projectRes.data?.visual_style
      const nextStyle = projectRes.data?.style
      if (nextVisualStyle === 'live_action' || nextVisualStyle === 'anime') {
        setProjectVisualStyle(nextVisualStyle)
      }
      if (typeof nextStyle === 'string' && nextStyle.trim()) {
        setProjectStyle(nextStyle)
      }

      const c = chRes.data
      setChapterTitle(c?.title ?? '')
      setChapterIndex(typeof c?.index === 'number' ? c.index : null)

      const items = listRes.data?.items ?? []
      const preparationState = preparationRes.data ?? null
      const detail = detailRes.data ?? null
      const s = preparationState?.shot ?? null

      if (!s) {
        message.error('Phân cảnh không tồn tại')
        navigate(getChapterShotsPath(projectId, chapterId), { replace: true })
        return
      }
      if (s.chapter_id !== chapterId) {
        message.error('Phân cảnh không thuộc chương hiện tại')
        navigate(getChapterShotsPath(projectId, chapterId), { replace: true })
        return
      }

      setPreparationState(preparationState)
      setShotDetail(detail)
      setShot(s)
      setTitle(s.title ?? '')
      setScriptExcerpt(s.script_excerpt ?? '')
      setShots(items.map((item) => (item.id === s.id ? s : item)))
      setShotAssetsOverview(preparationState?.assets_overview ?? null)
      setSavedDialogLines(preparationState?.saved_dialogue_lines ?? [])
      setExtractedDialogLines(
        (preparationState?.dialogue_candidates ?? []).filter((item) => item.candidate_status === 'pending'),
      )
    } catch {
      message.error('Tải thất bại')
      navigate(getChapterShotsPath(projectId, chapterId), { replace: true })
    } finally {
      setDialogLoading(false)
      setLoading(false)
    }
  }, [chapterId, navigate, projectId, shotId])

  const clearDialogDebounceTimers = useCallback(() => {
    for (const [, timer] of dialogDebounceTimersRef.current.entries()) {
      window.clearTimeout(timer)
    }
    dialogDebounceTimersRef.current.clear()
  }, [])

  const applyPreparationState = useCallback(
    (state: ShotPreparationStateRead, options?: { syncBasicInfo?: boolean }) => {
      setPreparationState(state)
      const nextShot = state.shot
      setShot(nextShot)
      setShots((prev) => prev.map((item) => (item.id === nextShot.id ? nextShot : item)))
      setShotAssetsOverview(state.assets_overview ?? null)
      setSavedDialogLines(state.saved_dialogue_lines ?? [])
      setExtractedDialogLines((state.dialogue_candidates ?? []).filter((item) => item.candidate_status === 'pending'))
      if (options?.syncBasicInfo) {
        setTitle(nextShot.title ?? '')
        setScriptExcerpt(nextShot.script_excerpt ?? '')
      }
    },
    [],
  )

  const loadPreparationState = useCallback(
    async (options?: { syncBasicInfo?: boolean; silent?: boolean }) => {
      if (!shotId) return null
      const reqSeq = ++preparationStateRequestSeqRef.current
      setDialogLoading(true)
      try {
        const res = await StudioShotsService.getShotPreparationStateApiApiV1StudioShotsShotIdPreparationStateGet({
          shotId,
        })
        if (reqSeq !== preparationStateRequestSeqRef.current) return null
        const data = res.data ?? null
        if (!data) return null
        applyPreparationState(data, { syncBasicInfo: options?.syncBasicInfo })
        return data
      } catch {
        if (!options?.silent) {
          message.error('Nạp trạng thái chuẩn bị thất bại')
        }
        return null
      } finally {
        if (reqSeq === preparationStateRequestSeqRef.current) {
          setDialogLoading(false)
        }
      }
    },
    [applyPreparationState, shotId],
  )

  const reloadAfterExtractTaskSettled = useCallback(
    createTaskSettledReloader(loadPage),
    [loadPage],
  )
  const { task: extractTask, settledTask: extractSettledTask, trackTaskData: trackExtractTaskData, applyCancelData: applyExtractCancelData } = useCancelableRelationTask({
    enabled: !!chapterId,
    relationType: SCRIPT_EXTRACTION_RELATION_TYPE,
    relationEntityId: chapterId,
    onTaskSettled: reloadAfterExtractTaskSettled,
  })
  useTaskPageContext(
    chapterId
      ? [
          {
            relationType: SCRIPT_EXTRACTION_RELATION_TYPE,
            relationEntityId: chapterId,
          },
        ]
      : [],
  )
  const extractTaskActive = !!extractTask

  const scheduleSaveDialogLine = useCallback(
    (lineId: number, patch: ShotDialogLineUpdate) => {
      const prev = dialogDebounceTimersRef.current.get(lineId)
      if (prev) window.clearTimeout(prev)
      const timer = window.setTimeout(async () => {
        try {
          await StudioShotDialogLinesService.updateShotDialogLineApiV1StudioShotDialogLinesLineIdPatch({
            lineId,
            requestBody: patch,
          })
        } catch {
          message.error('Lưu lời thoại thất bại')
        }
      }, 1000)
      dialogDebounceTimersRef.current.set(lineId, timer)
    },
    [],
  )

  const updateSavedDialogText = useCallback(
    (lineId: number, text: string) => {
      setSavedDialogLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, text } : l)))
      scheduleSaveDialogLine(lineId, { text })
    },
    [scheduleSaveDialogLine],
  )

  const deleteSavedDialogLine = useCallback(
    async (lineId: number) => {
      if (dialogDeletingIds[lineId]) return
      const prevTimer = dialogDebounceTimersRef.current.get(lineId)
      if (prevTimer) window.clearTimeout(prevTimer)
      dialogDebounceTimersRef.current.delete(lineId)
      setDialogDeletingIds((m) => ({ ...m, [lineId]: true }))
      try {
        await StudioShotDialogLinesService.deleteShotDialogLineApiV1StudioShotDialogLinesLineIdDelete({ lineId })
        setSavedDialogLines((prev) => prev.filter((l) => l.id !== lineId))
        message.success('Đã xóa')
      } catch {
        message.error('Xóa thất bại')
      } finally {
        setDialogDeletingIds((m) => ({ ...m, [lineId]: false }))
      }
    },
    [dialogDeletingIds],
  )

  const updateExtractedDialogText = useCallback((candidateId: number, text: string) => {
    setExtractedDialogLines((prev) => prev.map((l) => (l.id === candidateId ? { ...l, text } : l)))
  }, [])

  const acceptExtractedDialogLine = useCallback(
    async (line: ShotExtractedDialogueCandidateRead, options?: { silent?: boolean }): Promise<ShotPreparationStateRead | null> => {
      const text = (line.text ?? '').trim()
      if (!text) {
        if (!options?.silent) message.warning('vui lòng điền nội dung thoại trước')
        return null
      }
      const res = await StudioShotsService.acceptExtractedDialogueCandidateApiV1StudioShotsExtractedDialogueCandidatesCandidateIdAcceptPatch({
        candidateId: line.id,
        requestBody: {
          index: line.index,
          text,
          line_mode: line.line_mode,
          speaker_name: line.speaker_name ?? null,
          target_name: line.target_name ?? null,
        },
      })
      return res.data?.state ?? null
    },
    [],
  )

  const addExtractedDialogLine = useCallback(
    async (line: ShotExtractedDialogueCandidateRead) => {
      const loadingKey = String(line.id)
      if (dialogAddingKeys[loadingKey]) return
      setDialogAddingKeys((m) => ({ ...m, [loadingKey]: true }))
      try {
        const created = await acceptExtractedDialogLine(line)
        if (created) {
          applyPreparationState(created)
          message.success('Đã chấp nhận')
        }
      } catch {
        message.error('Chấp nhận thất bại')
      } finally {
        setDialogAddingKeys((m) => ({ ...m, [loadingKey]: false }))
      }
    },
    [acceptExtractedDialogLine, applyPreparationState, dialogAddingKeys],
  )

  const acceptAllExtractedDialogLines = useCallback(async () => {
    if (batchDialogAdding || extractedDialogLines.length === 0) return
    setBatchDialogAdding(true)
    try {
      let acceptedCount = 0
      let lastState: ShotPreparationStateRead | null = null
      for (const line of extractedDialogLines) {
        try {
          const accepted = await acceptExtractedDialogLine(line, { silent: true })
          if (accepted) {
            acceptedCount += 1
            lastState = accepted
          }
        } catch {
          // Dung sai từng mục, cuối cùng phản hồi thống nhất.
        }
      }
      if (lastState) {
        applyPreparationState(lastState)
      } else if (acceptedCount > 0) {
        await loadPreparationState({ silent: true })
      }
      if (acceptedCount === extractedDialogLines.length) {
        message.success(`đã chấp nhận ${acceptedCount} thoại`)
      } else if (acceptedCount > 0) {
        message.warning(`Đã chấp nhận ${acceptedCount} mục, ${extractedDialogLines.length - acceptedCount} mục còn lại vui lòng kiểm tra từng dòng`)
      } else {
        message.error('Chấp nhận hàng loạt thất bại')
      }
    } finally {
      setBatchDialogAdding(false)
    }
  }, [acceptExtractedDialogLine, applyPreparationState, batchDialogAdding, extractedDialogLines, loadPreparationState])

  const ignoreExtractedDialogLine = useCallback(
    async (
      line: ShotExtractedDialogueCandidateRead,
      options?: { silent?: boolean; applyState?: boolean },
    ): Promise<ShotPreparationStateRead | null> => {
      const loadingKey = String(line.id)
      if (dialogAddingKeys[loadingKey]) return null
      setDialogAddingKeys((m) => ({ ...m, [loadingKey]: true }))
      try {
        const res = await StudioShotsService.ignoreExtractedDialogueCandidateApiV1StudioShotsExtractedDialogueCandidatesCandidateIdIgnorePatch({
          candidateId: line.id,
        })
        const nextState = res.data?.state ?? null
        if (nextState && options?.applyState !== false) {
          applyPreparationState(nextState)
        } else if (!nextState) {
          await loadPreparationState({ silent: true })
        }
        if (!options?.silent) message.success('đã bỏ qua')
        return nextState
      } catch {
        if (!options?.silent) message.error('bỏ qua thất bại')
        throw new Error('ignore failed')
      } finally {
        setDialogAddingKeys((m) => ({ ...m, [loadingKey]: false }))
      }
    },
    [applyPreparationState, dialogAddingKeys, loadPreparationState],
  )

  const ignoreAllExtractedDialogLines = useCallback(async () => {
    if (batchDialogAdding || extractedDialogLines.length === 0) return
    setBatchDialogAdding(true)
    try {
      let ignoredCount = 0
      let lastState: ShotPreparationStateRead | null = null
      for (const line of extractedDialogLines) {
        try {
          const ignored = await ignoreExtractedDialogLine(line, { silent: true, applyState: false })
          ignoredCount += 1
          if (ignored) lastState = ignored
        } catch {
          // Dung sai từng mục, cuối cùng phản hồi thống nhất.
        }
      }
      if (lastState) {
        applyPreparationState(lastState)
      } else if (ignoredCount > 0) {
        await loadPreparationState({ silent: true })
      }
      if (ignoredCount === extractedDialogLines.length) {
        message.success(`đã bỏ qua ${ignoredCount} thoại`)
      } else if (ignoredCount > 0) {
        message.warning(`Đã bỏ qua ${ignoredCount} mục, ${extractedDialogLines.length - ignoredCount} mục còn lại vui lòng kiểm tra từng dòng`)
      } else {
        message.error('Bỏ qua hàng loạt thất bại')
      }
    } finally {
      setBatchDialogAdding(false)
    }
  }, [applyPreparationState, batchDialogAdding, extractedDialogLines, ignoreExtractedDialogLine, loadPreparationState])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!shotId) {
      setSelectedShotIds([])
      return
    }
    setSelectedShotIds((prev) => {
      if (prev.length === 0) return [shotId]
      if (!prev.includes(shotId) && prev.length <= 1) return [shotId]
      return prev
    })
  }, [shotId])

  useEffect(() => {
    if (!projectId || !chapterId || !shotId) return

    const resetExistenceCache = () => {
      setExistenceByKindName({
        scene: {},
        actor: {},
        prop: {},
        costume: {},
      })
    }

    const refreshAfterExternalCreate = async () => {
      pendingExternalAssetCreateRef.current = false
      resetExistenceCache()
      await loadPreparationState({ silent: true })
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as ShotAssetCreatedAndLinkedMessage | null
      if (!data || data.type !== 'studio-shot-asset-created-and-linked') return
      if (data.projectId !== projectId || data.chapterId !== chapterId || data.shotId !== shotId) return
      void refreshAfterExternalCreate()
    }

    const handleFocus = () => {
      if (!pendingExternalAssetCreateRef.current) return
      void refreshAfterExternalCreate()
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [chapterId, loadPreparationState, projectId, shotId])

  // Khi chuyển phân cảnh: dọn debounce thoại, trạng thái chuẩn bị được loadPage tải thống nhất
  useEffect(() => {
    clearDialogDebounceTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotId])

  useEffect(() => () => clearDialogDebounceTimers(), [clearDialogDebounceTimers])

  const saveShot = useCallback(async () => {
    if (!shot || !title.trim()) {
      message.warning('Vui lòng điền tiêu đề')
      return
    }
    setSaving(true)
    setSemanticSaving(true)
    try {
      const [shotRes, detailRes] = await Promise.all([
        StudioShotsService.updateShotApiV1StudioShotsShotIdPatch({
          shotId: shot.id,
          requestBody: {
            title: title.trim(),
            script_excerpt: scriptExcerpt.trim() ? scriptExcerpt.trim() : null,
          },
        }),
        shotDetail
          ? StudioShotDetailsService.updateShotDetailApiV1StudioShotDetailsShotIdPatch({
              shotId: shot.id,
              requestBody: {
                camera_shot: shotDetail.camera_shot,
                angle: shotDetail.angle,
                movement: shotDetail.movement,
                duration: shotDetail.duration ?? 4,
                action_beats: shotDetail.action_beats ?? [],
              },
            })
          : Promise.resolve({ data: null } as any),
      ])

      const next = shotRes.data
      const nextDetail = detailRes.data ?? null
      if (nextDetail) {
        setShotDetail(nextDetail)
      }
      if (next) {
        setShot(next)
        setShots((prev) => prev.map((x) => (x.id === next.id ? next : x)))
        message.success('Đã lưu thông tin cơ bản và ngôn ngữ phân cảnh')
      }
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
      setSemanticSaving(false)
    }
  }, [scriptExcerpt, shot, shotDetail, title])

  const updateShotSemantic = useCallback((patch: {
    camera_shot?: ShotDetailRead['camera_shot']
    angle?: ShotDetailRead['angle']
    movement?: ShotDetailRead['movement']
    duration?: number
    action_beats?: Array<string>
  }) => {
    setShotDetail((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ...patch,
      }
    })
  }, [])

  const updateSkipExtraction = useCallback(
    async (skip: boolean) => {
      if (!shotId) return
      setSkipExtractionUpdating(true)
      try {
        const res = await StudioShotsService.updateShotSkipExtractionApiV1StudioShotsShotIdSkipExtractionPatch({
          shotId,
          requestBody: { skip },
        })
        const nextState = res.data?.state ?? null
        if (nextState) {
          applyPreparationState(nextState)
        } else {
          await loadPreparationState({ silent: true })
        }
        message.success(skip ? 'đã đánh dấu không cần trích xuất' : 'đã khôi phục luồng xác nhận trích xuất')
      } catch {
        message.error(skip ? 'đánh dấu không cần trích xuất thất bại' : 'khôi phục trích xuất thất bại')
      } finally {
        setSkipExtractionUpdating(false)
      }
    },
    [applyPreparationState, loadPreparationState, shotId],
  )

  const extractAssets = useCallback(async () => {
    if (!projectId || !chapterId || !shot) return
    if (extractInFlightRef.current) return
    if (notifyExistingTask(extractTask, {
      cancellingMessage: extractTaskCopy.cancellingMessage,
      runningMessage: extractTaskCopy.runningMessage,
    })) {
      return
    }
    extractInFlightRef.current = true
    setExtractingAssets(true)
    try {
      const scriptDivision = {
        total_shots: 1,
        shots: [
          {
            index: shot.index,
            start_line: 1,
            end_line: 1,
            script_excerpt: shot.script_excerpt ?? '',
            shot_name: shot.title ?? '',
          },
        ],
      }
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.extractScriptAsyncApiV1ScriptProcessingExtractAsyncPost({
            requestBody: {
              project_id: projectId,
              chapter_id: chapterId,
              script_division: scriptDivision as any,
              consistency: undefined,
              refresh_cache: true,
            } as any,
          }),
        trackTaskData: trackExtractTaskData,
        startedMessage: extractTaskCopy.startedMessage,
        reusedMessage: extractTaskCopy.reusedMessage,
        fallbackErrorMessage: 'Trích xuất thất bại',
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setExtractingAssets(false)
      extractInFlightRef.current = false
    }
  }, [chapterId, extractTask, projectId, shot])

  const batchExtractAssets = useCallback(async () => {
    if (!projectId || !chapterId || selectedShots.length === 0) return
    if (extractInFlightRef.current) return
    if (notifyExistingTask(extractTask, {
      cancellingMessage: extractTaskCopy.cancellingMessage,
      runningMessage: extractTaskCopy.runningMessage,
    })) {
      return
    }

    const actionableShots = selectedShots
      .filter((item) => !item.skip_extraction)
      .sort((a, b) => a.index - b.index)

    if (actionableShots.length === 0) {
      message.info('các shot đang chọn đều đã đánh dấu không cần trích xuất, nếu muốn điều chỉnh vui lòng khôi phục trích xuất trước')
      return
    }

    extractInFlightRef.current = true
    setBatchExtractingAssets(true)
    try {
      const scriptDivision = {
        total_shots: actionableShots.length,
        shots: actionableShots.map((item) => ({
          index: item.index,
          start_line: 1,
          end_line: 1,
          script_excerpt: item.script_excerpt ?? '',
          shot_name: item.title ?? '',
        })),
      }
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.extractScriptAsyncApiV1ScriptProcessingExtractAsyncPost({
            requestBody: {
              project_id: projectId,
              chapter_id: chapterId,
              script_division: scriptDivision as any,
              consistency: undefined,
              refresh_cache: true,
            } as any,
          }),
        trackTaskData: trackExtractTaskData,
        startedMessage: actionableShots.length > 1 ? `Đã bắt đầu trích xuất ${actionableShots.length} phân cảnh` : extractTaskCopy.startedMessage,
        reusedMessage: extractTaskCopy.reusedMessage,
        fallbackErrorMessage: 'Trích xuất hàng loạt thất bại',
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setBatchExtractingAssets(false)
      extractInFlightRef.current = false
    }
  }, [chapterId, extractTask, projectId, selectedShots])

  const cancelExtractTask = useCallback(async () => {
    if (!extractTask?.taskId) return
    try {
      await executeTaskCancel({
        taskId: extractTask.taskId,
        reason: 'Người dùng hủy tác vụ trích xuất tại trang chỉnh sửa phân cảnh',
        applyCancelData: applyExtractCancelData,
        cancelledImmediatelyMessage: extractTaskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: extractTaskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ trích xuất thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    }
  }, [applyExtractCancelData, extractTask])

  useRelationTaskNotification({
    task: extractTask,
    settledTask: extractSettledTask,
    title: extractTaskCopy.title,
    sourceLabel: shot?.title ? `Phân cảnh: ${shot.title}` : 'Trang chỉnh sửa phân cảnh',
    runningDescription: extractTaskCopy.runningDescription,
    cancellingDescription: extractTaskCopy.cancellingDescription,
    successDescription: extractTaskCopy.successDescription,
    cancelledDescription: extractTaskCopy.cancelledDescription,
    failedDescription: extractTaskCopy.failedDescription,
    onCancel: extractTask ? () => void cancelExtractTask() : null,
    onNavigate:
      projectId && chapterId && shotId
        ? () => navigate(getChapterShotEditPath(projectId, chapterId, shotId))
        : null,
  })

  const goShot = (id: string) => {
    if (!projectId || !chapterId || id === shotId) return
    setSelectedShotIds([id])
    navigate(`/projects/${projectId}/chapters/${chapterId}/shots/${id}/edit`)
  }
  const handleShotListClick = useCallback(
    (targetShotId: string, e: React.MouseEvent) => {
      const isToggle = e.metaKey || e.ctrlKey
      if (isToggle) {
        setSelectedShotIds((prev) =>
          prev.includes(targetShotId) ? prev.filter((id) => id !== targetShotId) : [...prev, targetShotId],
        )
        return
      }
      goShot(targetShotId)
    },
    [goShot],
  )
  const goNextActionableShot = useCallback(() => {
    if (!nextActionableShot) return
    goShot(nextActionableShot.id)
  }, [nextActionableShot])

  const openLinkingModal = useCallback(
    async (kind: AssetKind, name: string, item: EntityNameExistenceItem, hint: string) => {
      setLinkingKind(kind)
      setLinkingName(name)
      setLinkingItem(item)
      setLinkingHint(hint)
      setLinkingThumb(undefined)
      setLinkingOpen(true)
      if (!item.asset_id) return
      setLinkingLoading(true)
      try {
        const entityType =
          kind === 'scene' ? 'scene' : kind === 'prop' ? 'prop' : kind === 'costume' ? 'costume' : 'character'
        const res = await StudioEntitiesApi.get(entityType as any, item.asset_id)
        const data: any = res.data
        const thumb = resolveAssetUrl(data?.thumbnail ?? data?.images?.[0]?.thumbnail ?? '')
        setLinkingThumb(thumb || undefined)
      } catch {
        // ignore
      } finally {
        setLinkingLoading(false)
      }
    },
    [],
  )

  const doLink = useCallback(async () => {
    if (!projectId || !chapterId || !shotId) return
    if (!linkingItem?.asset_id) return
    setLinkingActionLoading(true)
    try {
      const res = await StudioShotsService.linkExistingAssetForPreparationApiApiV1StudioShotsShotIdPreparationLinkPost({
        shotId,
        requestBody: {
          project_id: projectId,
          chapter_id: chapterId,
          entity_type: linkingKind === 'actor' ? 'character' : linkingKind,
          linked_entity_id: linkingItem.asset_id,
        },
      })
      message.success('Đã liên kết')
      if (res.data?.state) {
        applyPreparationState(res.data.state)
      } else {
        await loadPreparationState({ silent: true })
      }
      setLinkingOpen(false)
    } catch {
      message.error('Liên kết thất bại')
    } finally {
      setLinkingActionLoading(false)
    }
  }, [applyPreparationState, chapterId, linkingItem?.asset_id, linkingKind, loadPreparationState, projectId, shotId])

  const handleNewAsset = useCallback(
    async (asset: AssetVM) => {
      if (!projectId || !chapterId || !shotId) return
      const name = asset.name.trim()
      if (!name) return
      try {
        const req: any = { project_id: projectId, shot_id: shotId }
        if (asset.kind === 'scene') req.scene_names = [name]
        else if (asset.kind === 'prop') req.prop_names = [name]
        else if (asset.kind === 'costume') req.costume_names = [name]
        else req.character_names = [name]

        const res = await StudioEntitiesService.checkEntityNamesExistenceApiV1StudioEntitiesExistenceCheckPost({
          requestBody: req,
        })
        const data = res.data
        const bucket =
          asset.kind === 'scene'
            ? data?.scenes
            : asset.kind === 'prop'
              ? data?.props
              : asset.kind === 'costume'
                ? data?.costumes
                : data?.characters
        const item = (bucket?.[0] as EntityNameExistenceItem | undefined) ?? null
        if (!item) {
          message.error('existence-check trả về rỗng')
          return
        }

        if (!item.exists) {
          Modal.confirm({
            title: 'Hiện không có tài nguyên để liên kết, có tạo mới không?',
            okText: 'Tạo mới',
            cancelText: 'Hủy',
            onOk: () => {
              pendingExternalAssetCreateRef.current = true
              const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
              const descQ = asset.description?.trim()
                ? `&desc=${encodeURIComponent(asset.description.trim())}`
                : ''
              const styleQ =
                `&visualStyle=${encodeURIComponent(projectVisualStyle)}` +
                `&style=${encodeURIComponent(projectStyle)}`
              const ctxQ =
                `&projectId=${encodeURIComponent(projectId)}` +
                `&chapterId=${encodeURIComponent(chapterId)}` +
                `&shotId=${encodeURIComponent(shotId)}` +
                styleQ
              if (asset.kind === 'scene' || asset.kind === 'prop' || asset.kind === 'costume') {
                open(
                  `/assets?tab=${asset.kind}&create=1&name=${encodeURIComponent(name)}${descQ}${ctxQ}`,
                )
                return
              }
              open(
                `/projects/${encodeURIComponent(projectId)}?tab=roles&create=1&name=${encodeURIComponent(name)}${descQ}${ctxQ}`,
              )
            },
          })
          return
        }

        if (item.exists && !item.linked_to_project) {
          await openLinkingModal(asset.kind, name, item, 'Trong thư viện tài nguyên tồn tại tài nguyên trùng tên, có thể liên kết')
          return
        }
        if (item.exists && item.linked_to_project && !item.linked_to_shot) {
          await openLinkingModal(asset.kind, name, item, 'Trong dự án tồn tại tài nguyên trùng tên, có thể liên kết')
          return
        }

        message.info('Tài nguyên này đã được liên kết vào phân cảnh hiện tại')
      } catch {
        message.error('Gọi existence-check thất bại')
      }
    },
    [openLinkingModal, chapterId, projectId, projectStyle, projectVisualStyle, shotId],
  )

  const ignoreCandidate = useCallback(
    async (asset: AssetVM) => {
      if (!asset.candidateId) return
      if (candidateActionIds[asset.candidateId]) return
      setCandidateActionIds((prev) => ({ ...prev, [asset.candidateId!]: true }))
      try {
        const res = await StudioShotsService.ignoreExtractedCandidateApiV1StudioShotsExtractedCandidatesCandidateIdIgnorePatch({
          candidateId: asset.candidateId,
        })
        if (res.data?.state) {
          applyPreparationState(res.data.state)
        } else {
          await loadPreparationState({ silent: true })
        }
        message.success('Đã bỏ qua ứng viên này')
      } catch {
        message.error('Bỏ qua thất bại')
      } finally {
        setCandidateActionIds((prev) => ({ ...prev, [asset.candidateId!]: false }))
      }
    },
    [applyPreparationState, candidateActionIds, loadPreparationState],
  )


  const prefetchExistenceForNewAssets = useCallback(
    async (kind: AssetKind, items: AssetVM[]) => {
      if (!projectId || !shotId) return
      if (existenceInFlightRef.current[kind]) return
      const missingNames = items
        .filter((x) => x.status === 'new')
        .map((x) => x.name.trim())
        .filter(Boolean)
        .filter((n) => !existenceByKindName[kind][n])
      if (missingNames.length === 0) return

      existenceInFlightRef.current[kind] = true
      try {
        const req: any = { project_id: projectId, shot_id: shotId }
        if (kind === 'scene') req.scene_names = missingNames
        else if (kind === 'prop') req.prop_names = missingNames
        else if (kind === 'costume') req.costume_names = missingNames
        else req.character_names = missingNames

        const res = await StudioEntitiesService.checkEntityNamesExistenceApiV1StudioEntitiesExistenceCheckPost({
          requestBody: req,
        })
        const data = res.data
        const bucket =
          kind === 'scene'
            ? data?.scenes
            : kind === 'prop'
              ? data?.props
              : kind === 'costume'
                ? data?.costumes
                : data?.characters
        const list = Array.isArray(bucket) ? (bucket as EntityNameExistenceItem[]) : []
        if (list.length === 0) return
        setExistenceByKindName((prev) => {
          const next = { ...prev, [kind]: { ...prev[kind] } }
          for (const it of list) {
            const key = it?.name?.trim?.() ? it.name.trim() : ''
            if (!key) continue
            next[kind][key] = it
          }
          return next
        })
      } catch {
        // Im lặng: tránh toast liên tục
      } finally {
        existenceInFlightRef.current[kind] = false
      }
    },
    [existenceByKindName, projectId, shotId],
  )

  useEffect(() => {
    void prefetchExistenceForNewAssets('scene', unionAssets.scene)
    void prefetchExistenceForNewAssets('actor', unionAssets.actor)
    void prefetchExistenceForNewAssets('prop', unionAssets.prop)
    void prefetchExistenceForNewAssets('costume', unionAssets.costume)
  }, [prefetchExistenceForNewAssets, unionAssets])

  if (!projectId || !chapterId || !shotId) {
    return <Navigate to="/projects" replace />
  }

  const hasTitleAndExcerpt = preparationState?.basic_info_ready ?? (!!title.trim() && !!scriptExcerpt.trim())
  const hasSemanticDefaults = preparationState?.semantic_defaults_ready
    ?? (!!shotDetail?.camera_shot && !!shotDetail?.angle && !!shotDetail?.movement && (shotDetail?.duration ?? 0) > 0)
  const actionBeatsCount = preparationState?.action_beats_count
    ?? (shotDetail?.action_beats ?? []).filter((item) => item.trim().length > 0).length
  const actionBeatsReady = preparationState?.action_beats_ready ?? (actionBeatsCount > 0)
  const linkedAssetCount = shotAssetsOverview?.summary.linked_count ?? 0
  const pendingAssetCount = shotAssetsOverview?.summary.pending_count ?? 0
  const pendingConfirmCount = preparationState?.pending_confirm_count ?? (pendingAssetCount + extractedDialogLines.length)
  const assetsReady = !!shotAssetsOverview && pendingAssetCount === 0
  const dialogsReady = extractedDialogLines.length === 0
  const statusReady = preparationState?.ready_for_generation ?? (shot?.status === 'ready')
  const basicInfoReady = hasTitleAndExcerpt && hasSemanticDefaults
  const confirmReady = pendingConfirmCount === 0
  const currentShotActionable = shot ? isActionablePreparationShot(shot) || !basicInfoReady || !actionBeatsReady : false
  const extractionSummary = getShotExtractionSummary(shot)
  const extractionStateMeta = getExtractionStateMeta(shot, pendingConfirmCount)
  const goToStudio = () => navigate(getChapterStudioPath(projectId, chapterId), {
    state: { focusShotId: shotId, selectedShotIds: shotId ? [shotId] : [] },
  })
  const nextStepTitle = statusReady ? 'Bước tiếp theo: vào studio phân cảnh để tiếp tục tạo' : 'Bước tiếp theo: hoàn tất chuẩn bị phân cảnh trước, rồi vào studio'
  const nextStepDescription = statusReady
    ? 'Xác nhận trích xuất thông tin của phân cảnh hiện tại đã hoàn tất, tiếp theo nên đến studio phân cảnh để tiếp tục khung hình chính, ảnh tham chiếu, prompt video và tạo video.'
    : actionBeatsReady
      ? 'Phân cảnh hiện tại vẫn còn ứng viên trích xuất, thoại hoặc thông tin cơ bản phân cảnh đang chờ xác nhận. Hãy hoàn tất chuẩn bị ở đây trước, sau đó mới vào studio phân cảnh để tiếp tục tạo.'
      : 'mốc hành động của shot hiện tại chưa được xác nhận. Đề xuất hoàn thiện trình tự hành động trước, rồi vào studio tiếp tục sinh khung hình chính và video.'

  const checklistItems = [
    {
      key: 'script',
      label: 'Tiêu đề, trích đoạn và ngôn ngữ điện ảnh',
      tone: basicInfoReady ? 'success' : 'warning',
      text: basicInfoReady ? 'Đã xác nhận thông tin cơ bản và ngôn ngữ điện ảnh' : 'Vui lòng bổ sung tiêu đề, trích đoạn kịch bản và ngôn ngữ điện ảnh trước',
    },
    {
      key: 'action_beats',
      label: 'Mốc hành động',
      tone: actionBeatsReady ? 'success' : 'warning',
      text: actionBeatsReady
        ? `Đã xác nhận ${actionBeatsCount} mốc hành động`
        : 'Vui lòng xác nhận trước trình tự thay đổi hành động của phân cảnh hiện tại',
    },
    {
      key: 'assets',
      label: 'Tài nguyên',
      tone: assetsReady ? 'success' : shotAssetsOverview ? 'warning' : 'default',
      text: assetsReady
        ? extractionSummary.state === 'skipped'
          ? 'Đã bỏ qua trích xuất tài nguyên'
          : extractionSummary.state === 'extracted_empty'
            ? 'Đã trích xuất, không có ứng viên'
            : linkedAssetCount > 0
              ? 'Đã xác nhận xong tài nguyên'
              : 'Đã xác nhận xong tài nguyên'
        : extractionSummary.state === 'not_extracted'
          ? 'Chưa trích xuất'
          : extractionSummary.state === 'extracted_empty'
            ? 'Đã trích xuất, không có ứng viên'
            : shotAssetsOverview
              ? `Chờ xử lý ${pendingAssetCount}`
              : 'Chờ xử lý',
    },
    {
      key: 'dialogs',
      label: 'Th đoởi thoại',
      tone: dialogsReady ? 'success' : extractedDialogLines.length > 0 ? 'warning' : 'default',
      text: dialogsReady
        ? extractionSummary.state === 'skipped'
          ? 'Đã bỏ qua trích xuất thoại'
          : extractionSummary.state === 'extracted_empty'
            ? 'Đã trích xuất, không có ứng viên'
            : savedDialogLines.length > 0
              ? 'Đã xác nhận xong thoại'
              : 'Đã xác nhận xong thoại'
        : extractionSummary.state === 'not_extracted'
          ? 'Chưa trích xuất'
          : extractionSummary.state === 'extracted_empty'
            ? 'Đã trích xuất, không có ứng viên'
            : extractedDialogLines.length > 0
              ? `Chờ xử lý ${extractedDialogLines.length}`
              : 'Chờ xử lý',
    },
    {
      key: 'shoot',
      label: 'Chuẩn bị quay',
      tone: statusReady ? 'success' : 'default',
      text: statusReady
        ? 'Đã đủ điều kiện tiền đề để vào luồng tạo video'
        : 'Vui lòng hoàn thành xác nhận trích xuất thông tin trước',
    },
  ] as const

  useEffect(() => {
    if (!shotId) return
    if (loading || !shot) return
    const rememberedTab = editorTabMemoryRef.current[shotId]
    if (rememberedTab) {
      if (editorTabKey !== rememberedTab) setEditorTabKey(rememberedTab)
      tabAutoInitShotIdRef.current = shotId
      return
    }
    if (tabAutoInitShotIdRef.current === shotId) return
    setEditorTabKey(pendingConfirmCount > 0 ? 'confirm' : 'basic')
    tabAutoInitShotIdRef.current = shotId
  }, [editorTabKey, loading, pendingConfirmCount, shot, shotId])

  const handleEditorTabChange = useCallback(
    (key: string) => {
      const nextKey = key as 'basic' | 'confirm'
      setEditorTabKey(nextKey)
      if (shotId) {
        editorTabMemoryRef.current[shotId] = nextKey
        tabAutoInitShotIdRef.current = shotId
      }
    },
    [shotId],
  )

  const editorTabItems = [
    {
      key: 'basic',
      label: (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: basicInfoReady ? '#22c55e' : '#f59e0b' }}
          />
          <span>1 Thông tin cơ bản</span>
        </div>
      ),
      children: (
        <ChapterShotBasicInfoSection
          title={title}
          scriptExcerpt={scriptExcerpt}
          saving={saving}
          semanticSaving={semanticSaving}
          semantic={{
            camera_shot: shotDetail?.camera_shot ?? undefined,
            angle: shotDetail?.angle ?? undefined,
            movement: shotDetail?.movement ?? undefined,
            duration: shotDetail?.duration ?? 4,
            action_beats: shotDetail?.action_beats ?? [],
          }}
          actionBeatPhases={preparationState?.action_beat_phases ?? []}
          onTitleChange={setTitle}
          onScriptExcerptChange={setScriptExcerpt}
          onSemanticChange={updateShotSemantic}
          onSave={() => void saveShot()}
        />
      ),
    },
    {
      key: 'confirm',
      label: (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: confirmReady ? '#22c55e' : '#f59e0b' }}
          />
          <span>2 Xác nhận trích xuất</span>
          {pendingConfirmCount > 0 ? <Badge count={pendingConfirmCount} size="small" /> : null}
        </div>
      ),
      children: (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">Khu làm việc trích xuất & xác nhận</div>
              <div className="text-[11px] text-slate-500 mt-1">
                ở đây tập trung xử lý ứng viên tài nguyên và thoại do hệ thống trích xuất, sau khi xác nhận xong shot hiện tại mới thực sự vào giai đoạn sinh.
              </div>
              <div
                className="mt-3 rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor:
                    extractionStateMeta.tone === 'green'
                      ? '#86efac'
                      : extractionStateMeta.tone === 'blue'
                        ? '#93c5fd'
                        : '#fcd34d',
                  background:
                    extractionStateMeta.tone === 'green'
                      ? '#f0fdf4'
                      : extractionStateMeta.tone === 'blue'
                        ? '#eff6ff'
                        : '#fffbeb',
                  color:
                    extractionStateMeta.tone === 'green'
                      ? '#166534'
                      : extractionStateMeta.tone === 'blue'
                        ? '#1d4ed8'
                        : '#92400e',
                }}
              >
                <div className="font-medium">{extractionStateMeta.title}</div>
                <div className="mt-1 opacity-90">{extractionStateMeta.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                size="small"
                loading={extractingAssets || extractTaskActive}
                disabled={extractTaskActive}
                onClick={() => void extractAssets()}
              >
                Trích xuất và làm mới ứng viên
              </Button>
              {extractTask ? (
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  disabled={extractTask.cancelRequested}
                  onClick={() => void cancelExtractTask()}
                >
                  {extractTask.cancelRequested ? 'đang hủy' : 'hủy trích xuất'}
                </Button>
              ) : null}
              {shot?.skip_extraction ? (
                <Button
                  size="small"
                  loading={skipExtractionUpdating}
                  onClick={() => void updateSkipExtraction(false)}
                >
                  Khôi phục trích xuất
                </Button>
              ) : (
                <Popconfirm
                  title="Xác nhận đánh dấu là không cần trích xuất?"
                  description="Sau khi đánh dấu, phân cảnh hiện tại sẽ được xử lý trực tiếp theo 'xác nhận trích xuất đã hoàn thành'."
                  okText="Xác nhận"
                  cancelText="Hủy"
                  onConfirm={() => void updateSkipExtraction(true)}
                  okButtonProps={{ danger: true, loading: skipExtractionUpdating }}
                  cancelButtonProps={{ disabled: skipExtractionUpdating }}
                >
                  <Button
                    size="small"
                    danger
                    loading={skipExtractionUpdating}
                  >
                    Không cần trích xuất
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>

          <ChapterShotAssetConfirmation
            projectId={projectId}
            extraction={extractionSummary}
            unionAssets={unionAssets}
            expandedKinds={expandedKinds}
            candidateActionIds={candidateActionIds}
            existenceByKindName={existenceByKindName}
            onToggleExpanded={toggleExpanded}
            onIgnoreCandidate={(asset) => void ignoreCandidate(asset)}
            onHandleNewAsset={(asset) => void handleNewAsset(asset)}
          />

          <Divider className="!my-1" />
          <ChapterShotDialogueConfirmation
            extraction={extractionSummary}
            savedDialogLines={savedDialogLines}
            extractedDialogLines={extractedDialogLines}
            batchDialogAdding={batchDialogAdding}
            dialogLoading={dialogLoading}
            dialogDeletingIds={dialogDeletingIds}
            dialogAddingKeys={dialogAddingKeys}
            onAcceptAll={() => void acceptAllExtractedDialogLines()}
            onIgnoreAll={() => void ignoreAllExtractedDialogLines()}
            onDeleteSavedDialogLine={(lineId) => void deleteSavedDialogLine(lineId)}
            onUpdateSavedDialogText={updateSavedDialogText}
            onAddExtractedDialogLine={(line) => void addExtractedDialogLine(line)}
            onIgnoreExtractedDialogLine={(line) => void ignoreExtractedDialogLine(line)}
            onUpdateExtractedDialogText={updateExtractedDialogText}
          />
        </div>
      ),
    },
  ] as const

  return (
    <Layout style={{ height: '100%', minHeight: 0, background: '#eef2f7' }}>
      <Header
        style={{
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          to={getChapterShotsPath(projectId, chapterId)}
          className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
        >
          <ArrowLeftOutlined /> Quay lại danh sách phân cảnh
        </Link>
        <Divider type="vertical" />

        <div className="min-w-0 flex-1 overflow-hidden">
          <Typography.Text
            strong
            className="truncate block"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {chapterIndex !== null ? `Tập${chapterIndex}chương · ${chapterTitle || 'Chưa đặt tên'}` : chapterTitle || 'chương'}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            className="text-xs truncate block"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            Chuẩn bị phân cảnh và xác nhận thông tin
          </Typography.Text>
        </div>
      </Header>

      <Content
        style={{
          padding: 16,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Card
          title="Chuẩn bị phân cảnh"
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{
            padding: 12,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <Spin size="large" />
            </div>
          ) : !shot ? (
            <Empty description="Không thể tải phân cảnh" />
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
              <Card
                size="small"
                title={
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <Space size={8} className="min-w-0 overflow-hidden">
                      <span className="font-medium shrink-0">{`Phân cảnh (${shotsSorted.length})`}</span>
                      {!multiSelectActive ? (
                        <Space size={4} className="min-w-0 text-[11px] text-slate-500">
                          <ReloadOutlined className="shrink-0" />
                          <span className="truncate" title="Command/Ctrl + click chọn nhiều">
                            Command/Ctrl + nhấn để chọn nhiều
                          </span>
                        </Space>
                      ) : (
                        <span className="text-xs font-normal text-slate-500 shrink-0">{`Đã chọn ${selectedShotIds.length} mục`}</span>
                      )}
                    </Space>
                    {multiSelectActive ? (
                      <Space size={6} className="shrink-0">
                        <Tooltip title="Trích xuất hàng loạt và làm mới">
                          <Button
                            size="small"
                            type="primary"
                            shape="circle"
                            icon={<ReloadOutlined />}
                            loading={batchExtractingAssets || extractTaskActive}
                            disabled={extractTaskActive}
                            onClick={() => void batchExtractAssets()}
                          />
                        </Tooltip>
                        <Tooltip title="Xóa bỏ chọn">
                          <Button
                            size="small"
                            shape="circle"
                            icon={<ClearOutlined />}
                            onClick={() => setSelectedShotIds(shotId ? [shotId] : [])}
                          />
                        </Tooltip>
                      </Space>
                    ) : null}
                  </div>
                }
                style={{
                  width: 320,
                  minWidth: 260,
                  maxWidth: 420,
                  height: '100%',
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                bodyStyle={{ padding: 8, flex: 1, minHeight: 0, overflow: 'auto' }}
              >
                <div className="mb-3">
                  <Segmented
                    block
                    size="small"
                    value={shotListFilter}
                    onChange={(value) => setShotListFilter(value as ShotListFilter)}
                    options={shotListFilterOptions}
                  />
                  <div className="mt-2">
                    <Button
                      block
                      size="small"
                      disabled={!nextActionableShot || nextActionableShot.id === shotId}
                      type={!currentShotActionable && nextActionableShot && nextActionableShot.id !== shotId ? 'primary' : 'default'}
                      onClick={goNextActionableShot}
                    >
                      {nextActionableShot
                        ? !currentShotActionable && nextActionableShot.id !== shotId
                          ? `tiếp tục xử lý shot chờ tiếp theo:#${nextActionableShot.index}`
                          : `Mục tiếp theo chờ xử lý: #${nextActionableShot.index}`
                        : 'Hiện không có phân cảnh cần xử lý'}
                    </Button>
                  </div>
                </div>
                <List
                  size="small"
                  dataSource={filteredShots}
                  locale={{ emptyText: <Empty description="Chưa có phân cảnh" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  renderItem={(item) => {
                    const active = item.id === shotId
                    const selected = selectedShotIds.includes(item.id)
                    const itemBasicReady = !!item.title?.trim() && !!item.script_excerpt?.trim()
                    const itemConfirmStatus = getExtractionListStatus(item)
                    const itemIssueSummary = getShotPreparationIssueSummary(item)
                    const itemActionable = isActionablePreparationShot(item) || !itemBasicReady
                    const itemCompleted = itemBasicReady && !itemActionable
                    return (
                      <List.Item
                        onClick={(e) => handleShotListClick(item.id, e)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 10,
                          padding: '8px 10px',
                          background: active
                            ? itemCompleted
                              ? 'rgba(34,197,94,0.12)'
                              : 'rgba(59,130,246,0.10)'
                            : selected
                              ? 'rgba(59,130,246,0.06)'
                            : itemActionable
                              ? 'rgba(245,158,11,0.06)'
                              : itemCompleted
                                ? 'rgba(34,197,94,0.04)'
                              : undefined,
                          border: active
                            ? itemCompleted
                              ? '1px solid rgba(34,197,94,0.28)'
                              : '1px solid rgba(59,130,246,0.25)'
                            : selected
                              ? '1px solid rgba(59,130,246,0.18)'
                            : itemActionable
                              ? '1px solid rgba(245,158,11,0.22)'
                              : itemCompleted
                                ? '1px solid rgba(34,197,94,0.16)'
                              : '1px solid transparent',
                          boxShadow: active && itemCompleted ? '0 0 0 1px rgba(34,197,94,0.08) inset' : undefined,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">
                              #{item.index} · {item.title?.trim() ? item.title : 'Phân cảnh không tên'}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {active && itemCompleted ? (
                                <span
                                  className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: '#dcfce7',
                                    color: '#166534',
                                  }}
                                >
                                  Hiện đã hoàn thành
                                </span>
                              ) : null}
                              <span
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  background:
                                    itemIssueSummary.tone === 'green'
                                      ? '#dcfce7'
                                      : itemIssueSummary.tone === 'blue'
                                        ? '#dbeafe'
                                        : '#fef3c7',
                                  color:
                                    itemIssueSummary.tone === 'green'
                                      ? '#166534'
                                      : itemIssueSummary.tone === 'blue'
                                        ? '#1d4ed8'
                                        : '#92400e',
                                }}
                              >
                                {itemIssueSummary.text}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 truncate">{item.script_excerpt ?? ''}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                background: itemBasicReady ? '#dcfce7' : '#fef3c7',
                                color: itemBasicReady ? '#166534' : '#92400e',
                              }}
                            >
                              {itemBasicReady ? 'Cơ bản đã xong' : 'Cơ bản còn thiếu'}
                            </span>
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                background: itemConfirmStatus.background,
                                color: itemConfirmStatus.color,
                              }}
                            >
                              {itemConfirmStatus.text}
                            </span>
                          </div>
                        </div>
                      </List.Item>
                    )
                  }}
                />
              </Card>

              <Card
                size="small"
                title={
                  <div className="space-y-3 min-w-0">
                    <div className="font-medium">{`Chi tiết phân cảnh #${shot.index}`}</div>
                    <ChapterShotPreparationGuide
                      statusReady={statusReady}
                      checklistItems={checklistItems}
                      nextStepTitle={nextStepTitle}
                      nextStepDescription={nextStepDescription}
                      onGoToStudio={goToStudio}
                    />
                  </div>
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                bodyStyle={{ padding: 12, flex: 1, minHeight: 0, overflow: 'auto' }}
              >
                <Tabs
                  activeKey={editorTabKey}
                  onChange={handleEditorTabChange}
                  items={editorTabItems as any}
                />
              </Card>
            </div>
          )}
        </Card>
      </Content>

      <Modal
        title="Liên kết tài nguyên"
        open={linkingOpen}
        onCancel={() => setLinkingOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setLinkingOpen(false)} disabled={linkingActionLoading}>
            Hủy
          </Button>,
          <Button
            key="link"
            type="primary"
            loading={linkingActionLoading}
            disabled={!linkingItem?.asset_id}
            onClick={() => void doLink()}
          >
            liên kết
          </Button>,
        ]}
        width={520}
      >
        <div className="space-y-3">
          <Typography.Text>{linkingHint}</Typography.Text>
          <DisplayImageCard
            title={<div className="truncate">{linkingName || '—'}</div>}
            imageAlt={linkingName || 'asset'}
            imageUrl={linkingThumb}
            placeholder={linkingLoading ? <Spin /> : 'chưa có ảnh'}
            enablePreview
            hoverable={false}
            size="small"
            imageHeightClassName="h-44"
          />
        </div>
      </Modal>
    </Layout>
  )
}
