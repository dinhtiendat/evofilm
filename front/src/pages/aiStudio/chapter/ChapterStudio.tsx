import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Divider,
  Dropdown,
  Image,
  Input,
  Layout,
  Modal,
  Radio,
  Segmented,
  Select,
  Slider,
  Spin,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd'
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  MergeCellsOutlined,
  PauseCircleOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  ScissorOutlined,
  SettingOutlined,
  SoundOutlined,
  StopOutlined,
  TagOutlined,
  ToolOutlined,
  VideoCameraOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  UploadOutlined,
  VideoCameraAddOutlined,
  PlusOutlined,
  UserOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useLocation, useParams, Link } from 'react-router-dom'
import {
  FilmService,
  LlmService,
  StudioChaptersService,
  StudioEntitiesService,
  StudioFilesService,
  StudioImageTasksService,
  StudioProjectsService,
  StudioShotCharacterLinksService,
  StudioShotDetailsService,
  StudioShotDialogLinesService,
  StudioShotFrameImagesService,
  StudioShotLinksService,
  StudioShotsService,
} from '../../../services/generated'
import { StudioEntitiesApi } from '../../../services/studioEntities'
import type {
  CameraAngle,
  CameraMovement,
  CameraShotType,
  ChapterRead,
  EntityNameExistenceItem,
  ImageGenerationOptionsRead,
  ProjectActorLinkRead,
  ProjectCostumeLinkRead,
  ShotDetailRead,
  ShotDialogLineRead,
  ShotExtractedCandidateRead,
  ShotExtractedDialogueCandidateRead,
  ShotAssetsOverviewRead,
  ShotFrameImageRead,
  ShotCharacterLinkRead,
  ProjectPropLinkRead,
  ShotFramePromptMappingRead,
  ShotRead,
  ShotVideoReadinessRead,
  ShotRuntimeSummaryRead,
  ProjectSceneLinkRead,
  ShotStatus,
  ShotVideoPromptPackRead,
} from '../../../services/generated'
import { listTaskLinksNormalized } from '../../../services/filmTaskLinks'
import { buildFileDownloadUrl, resolveAssetUrl } from '../assets/utils'
import type { Chapter } from '../../../mocks/data'
import { executeTaskCancel } from '../components/taskActionHelpers'
import { useRelationTaskNotification } from '../components/taskNotificationHelpers'
import { TASK_COPY } from '../components/taskCopy'
import { ChapterStudioBatchToolbar } from './components/ChapterStudioBatchToolbar'
import { ChapterStudioMaintenancePanel } from './components/ChapterStudioMaintenancePanel'
import { ChapterStudioReadinessDiagnosisPanel } from './components/ChapterStudioReadinessDiagnosisPanel'
import { ChapterStudioVideoReadinessPanel } from './components/ChapterStudioVideoReadinessPanel'
import { useGenerationDraft, type GenerationDraftState } from '../hooks/useGenerationDraft'
import { useTaskPageContext } from '../components/taskPageContext'
import type { RelationTaskState } from '../project/ProjectWorkbench/chapterDivisionTasks'
import { toRelationTaskStateFromStatusRead } from '../project/ProjectWorkbench/chapterDivisionTasks'
import { useProjectStyleOptions } from '../project/useProjectStyleOptions'
import './chapterStudio.separation.css'

const { Sider, Content } = Layout
const { TextArea } = Input

const FRAME_FILE_TAG_ADOPT = 'áp dụng'
const FRAME_FILE_TAG_ABANDON = 'Loại bỏ'

type ShotFramePromptDebugContext = Record<string, unknown>
type ShotFramePromptQualityChecks = {
  passed: boolean
  issues: string[]
} | null
type FramePromptDerived = {
  basePrompt: string
  renderedPrompt: string
  selectedGuidance: string[]
  droppedGuidance: string[]
  selectedGuidanceDetails: Array<{ text: string; category: string; reasonTag: string; reason: string }>
  droppedGuidanceDetails: Array<{ text: string; category: string; reasonTag: string; reason: string }>
  images: string[]
  mappings: ShotFramePromptMappingRead[]
}
type VideoReferenceMode = 'first' | 'last' | 'key' | 'first_last' | 'first_last_key' | 'text_only'
type VideoPromptDerived = {
  prompt: string
  images: string[]
  pack: ShotVideoPromptPackRead | null
}

function normalizeFrameExclusiveTags(tags: string[]): string[] {
  const cleaned = (tags || []).map((x) => String(x ?? '').trim()).filter(Boolean)
  const hasAdopt = cleaned.includes(FRAME_FILE_TAG_ADOPT)
  const hasAbandon = cleaned.includes(FRAME_FILE_TAG_ABANDON)
  const rest = cleaned.filter((t) => t !== FRAME_FILE_TAG_ADOPT && t !== FRAME_FILE_TAG_ABANDON)
  if (hasAdopt && !hasAbandon) return [FRAME_FILE_TAG_ADOPT, ...rest]
  if (!hasAdopt && hasAbandon) return [FRAME_FILE_TAG_ABANDON, ...rest]
  // Cả hai đều không có hoặc đồng thời tồn tại: khi đồng thời tồn tại thì mặc định giữ “chấp nhận”
  if (hasAdopt && hasAbandon) return [FRAME_FILE_TAG_ADOPT, ...rest]
  return rest
}

function readDebugContextText(
  context: ShotFramePromptDebugContext | null,
  key: string,
): string {
  if (!context) return ''
  const value = context[key]
  return typeof value === 'string' ? value.trim() : ''
}

function buildKeyframeGuidanceSummary(items: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  items
    .flatMap((item) => item.split('；'))
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (seen.has(item)) return
      seen.add(item)
      result.push(item)
    })
  return result
}

function stripDirectiveLevelPrefix(item: string): string {
  const text = String(item || '').trim()
  if (text.startsWith('Bắt buộc：')) return text.slice(3).trim()
  if (text.startsWith('Ưu tiên：')) return text.slice(3).trim()
  return text
}

function parseDirectorCommandSummary(summary: string): Array<{
  level: 'must' | 'prefer'
  text: string
}> {
  return String(summary || '')
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item.startsWith('Bắt buộc:')) {
        return { level: 'must' as const, text: item.slice(3).trim() }
      }
      if (item.startsWith('Ưu tiên:')) {
        return { level: 'prefer' as const, text: item.slice(3).trim() }
      }
      return { level: 'prefer' as const, text: item }
    })
}

function buildGuidanceLevelSummary(
  parsedDirectorCommands: Array<{ level: 'must' | 'prefer'; text: string }>,
  guidanceSummary: string[],
): { must: number; prefer: number; normal: number } {
  const must = parsedDirectorCommands.filter((item) => item.level === 'must').length
  const prefer = parsedDirectorCommands.filter((item) => item.level === 'prefer').length
  const parsedTexts = new Set(parsedDirectorCommands.map((item) => item.text.trim()).filter(Boolean))
  const normal = guidanceSummary
    .map((item) => stripDirectiveLevelPrefix(item))
    .filter((item) => item && !parsedTexts.has(item)).length
  return { must, prefer, normal }
}

function buildActionBeatPhaseTags(summary: string): Array<{ text: string; phaseLabel: string }> {
  return String(summary || '')
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const matched = item.match(/^\d+\.\s*(kích hoạt|đỉnh|khép lại)\s*·\s*(.+)$/)
      if (!matched) {
        return { phaseLabel: 'Giai đoạn', text: item }
      }
      return {
        phaseLabel: matched[1],
        text: matched[2].trim(),
      }
    })
}

type InspectorMode = 'push' | 'overlay'
type ShotFilter = 'all' | 'pendingConfirm' | 'generating' | 'ready' | 'hidden' | 'problem'

type StudioShot = ShotRead & {
  hidden?: boolean
  hasProblem?: boolean
  hasSpeech?: boolean
  hasMusic?: boolean
}

type ShotRuntimeState = {
  has_active_tasks: boolean
  has_active_video_tasks: boolean
  has_active_prompt_tasks: boolean
  has_active_frame_tasks: boolean
  active_task_count: number
}

type LayoutPrefs = {
  leftWidth: number
  rightWidth: number
  inspectorOpen: boolean
  inspectorMode: InspectorMode
  autoOpenInspector: boolean
  timelineCollapsed: boolean
}

type KeyframeCardState = {
  loading: boolean
  taskStatus: string | null
  taskId: string | null
  thumbs: Array<{ linkId: number; fileId: string; thumbUrl: string }>
  modalOpen: boolean
  applyingFileId: string | null
}

type KeyframeResolutionProfile = 'standard' | 'high'

type InspectorTabKey = 'ops' | 'camera' | 'prompt_image' | 'dialogue' | 'keyframe_gen' | 'gen_ref'

const LAYOUT_STORAGE_KEY = 'jellyfish_chapter_studio_layout_v1'
type PromptFrameType = 'first' | 'key' | 'last'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getResolutionProfileLabel(profile: KeyframeResolutionProfile): string {
  return profile === 'high' ? 'cao (3K)' : 'chuẩn (2K)'
}

function resolveKeyframePixelSize(
  options: ImageGenerationOptionsRead | null,
  ratio: string,
  profile: KeyframeResolutionProfile,
): string {
  const normalizedRatio = String(ratio ?? '').trim()
  if (!options || !normalizedRatio) return ''
  const profiles = options.ratio_size_profiles?.[normalizedRatio] ?? null
  if (!profiles) return ''
  return profiles[profile] ?? profiles.standard ?? ''
}

function mapGenerationDraftStateToRenderState(
  state: GenerationDraftState,
): 'idle' | 'stale' | 'syncing' | 'clean' | 'error' {
  if (state === 'derived' || state === 'submitted') return 'clean'
  if (state === 'deriving' || state === 'submitting') return 'syncing'
  if (state === 'draft_changed' || state === 'context_changed') return 'stale'
  if (state === 'error') return 'error'
  return 'idle'
}

function getKeyframeRenderStatusMeta(state: GenerationDraftState) {
  const renderState = mapGenerationDraftStateToRenderState(state)
  if (renderState === 'clean') {
    return {
      color: 'green' as const,
      label: 'Đã đồng bộ',
      description: 'prompt cuối hiện tại đã giữ nhất quán với prompt nền và thứ tự ảnh tham chiếu.',
    }
  }
  if (renderState === 'syncing') {
    return {
      color: 'blue' as const,
      label: 'Đang đồng bộ',
      description: 'đang cập nhật prompt cuối dựa trên prompt nền và thứ tự ảnh tham chiếu hiện tại…',
    }
  }
  if (renderState === 'error') {
    return {
      color: 'red' as const,
      label: 'Đồng bộ thất bại',
      description: 'cập nhật tự động thất bại, vui lòng thử lại. Nếu vấn đề vẫn tiếp diễn, vui lòng kiểm tra prompt nền và ảnh tham chiếu.',
    }
  }
  if (renderState === 'idle') {
    return {
      color: 'default' as const,
      label: 'Chờ tạo',
      description: 'Vui lòng nhập prompt cơ bản trước, hệ thống sẽ tự sinh prompt cuối cùng.'
    }
  }
  return {
    color: 'gold' as const,
    label: 'Chờ đồng bộ',
    description: 'prompt nền hoặc thứ tự ảnh tham chiếu đã thay đổi, prompt cuối đang chờ cập nhật.',
  }
}

function applyTaskCancelState(
  currentTask: RelationTaskState | null,
  data?: { task_id?: string | null; status?: string | null; cancel_requested?: boolean | null } | null,
): RelationTaskState | null {
  if (!currentTask) return null
  return {
    ...currentTask,
    taskId: data?.task_id || currentTask.taskId,
    status: (data?.status ?? currentTask.status) as RelationTaskState['status'],
    cancelRequested: data?.cancel_requested ?? true,
  }
}

function reorder<T>(list: T[], startIndex: number, endIndex: number) {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

function normalizeAssetName(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function uniqueNames(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach((value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return
    const key = normalizeAssetName(raw)
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(raw)
  })
  return result
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

function toUIChapter(c: ChapterRead): Chapter {
  return {
    id: c.id,
    projectId: c.project_id,
    index: c.index,
    title: c.title,
    summary: c.summary ?? '',
    storyboardCount: c.shot_count ?? c.storyboard_count ?? 0,
    status: c.status ?? 'draft',
    updatedAt: new Date().toISOString(),
  }
}

const CAMERA_SHOT_OPTIONS: { value: CameraShotType; label: string }[] = [
  { value: 'ECU', label: 'Cận cực lớn' },
  { value: 'CU', label: 'Cận cảnh' },
  { value: 'MCU', label: 'Cảnh trung gần' },
  { value: 'MS', label: 'Cảnh trung' },
  { value: 'MLS', label: 'Cảnh trung xa' },
  { value: 'LS', label: 'Cảnh xa' },
  { value: 'ELS', label: 'Toàn cảnh lớn' },
]

const CAMERA_ANGLE_OPTIONS: { value: CameraAngle; label: string }[] = [
  { value: 'EYE_LEVEL', label: 'Ngang tầm mắt' },
  { value: 'HIGH_ANGLE', label: 'Góc cao' },
  { value: 'LOW_ANGLE', label: 'Góc thấp' },
  { value: 'BIRD_EYE', label: 'Góc nhìn từ trên cao' },
  { value: 'DUTCH', label: 'nghiêng' },
  { value: 'OVER_SHOULDER', label: 'Vượt vai' },
]

const CAMERA_MOVEMENT_OPTIONS: { value: CameraMovement; label: string }[] = [
  { value: 'STATIC', label: 'cố định' },
  { value: 'PAN', label: 'quay ngang' },
  { value: 'TILT', label: 'Xoay trục dọc' },
  { value: 'DOLLY_IN', label: 'Tiến về phía trước' },
  { value: 'DOLLY_OUT', label: 'Kéo ra' },
  { value: 'TRACK', label: 'Quay theo' },
  { value: 'CRANE', label: 'nâng hạ' },
  { value: 'HANDHELD', label: 'Tay cầm' },
  { value: 'STEADICAM', label: 'Máy steadicam' },
  { value: 'ZOOM_IN', label: 'Zoom tiến' },
  { value: 'ZOOM_OUT', label: 'Zoom kéo xa' },
]

function useLocalStoragePrefs() {
  const [prefs, setPrefs] = useState<LayoutPrefs>(() => {
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (!raw) {
        return {
          leftWidth: 280,
          rightWidth: 420,
          inspectorOpen: false,
          inspectorMode: 'push',
          autoOpenInspector: true,
          timelineCollapsed: false,
        }
      }
      const parsed = JSON.parse(raw) as Partial<LayoutPrefs>
      return {
        leftWidth: typeof parsed.leftWidth === 'number' ? parsed.leftWidth : 280,
        rightWidth: typeof parsed.rightWidth === 'number' ? parsed.rightWidth : 420,
        inspectorOpen: typeof parsed.inspectorOpen === 'boolean' ? parsed.inspectorOpen : false,
        inspectorMode: parsed.inspectorMode === 'overlay' ? 'overlay' : 'push',
        autoOpenInspector: typeof parsed.autoOpenInspector === 'boolean' ? parsed.autoOpenInspector : true,
        timelineCollapsed: typeof parsed.timelineCollapsed === 'boolean' ? parsed.timelineCollapsed : false,
      }
    } catch {
      return {
        leftWidth: 280,
        rightWidth: 420,
        inspectorOpen: false,
        inspectorMode: 'push',
        autoOpenInspector: true,
        timelineCollapsed: false,
      }
    }
  })

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  return [prefs, setPrefs] as const
}

const ChapterStudio: React.FC = () => {
  const { projectId, chapterId } = useParams<{
    projectId?: string
    chapterId?: string
  }>()
  const location = useLocation()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [projectVisualStyle, setProjectVisualStyle] = useState<'live_action' | 'anime'>('live_action')
  const [projectStyle, setProjectStyle] = useState<string>('real_people_city')
  const [projectDefaultVideoRatio, setProjectDefaultVideoRatio] = useState<string>('')
  const { videoRatioOptions, defaultVideoRatio: capabilityDefaultVideoRatio } = useProjectStyleOptions()
  const [imageGenerationOptions, setImageGenerationOptions] = useState<ImageGenerationOptionsRead | null>(null)
  const [shots, setShots] = useState<StudioShot[]>([])
  const [shotRuntimeMap, setShotRuntimeMap] = useState<Record<string, ShotRuntimeState>>({})
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([])
  const locationSelectionAppliedRef = useRef(false)
  const lastSelectedIndexRef = useRef<number>(-1)
  const [shotDetail, setShotDetail] = useState<ShotDetailRead | null>(null)
  const [dialogLines, setDialogLines] = useState<ShotDialogLineRead[]>([])
  const [frameImages, setFrameImages] = useState<ShotFrameImageRead[]>([])
  const [sceneLinks, setSceneLinks] = useState<ProjectSceneLinkRead[]>([])
  const [actorImageLinks, setActorImageLinks] = useState<ProjectActorLinkRead[]>([])
  const [propLinks, setPropLinks] = useState<ProjectPropLinkRead[]>([])
  const [costumeLinks, setCostumeLinks] = useState<ProjectCostumeLinkRead[]>([])
  const [shotCharacterLinks, setShotCharacterLinks] = useState<ShotCharacterLinkRead[]>([])
  const [shotCandidateItems, setShotCandidateItems] = useState<ShotExtractedCandidateRead[]>([])
  const [shotDialogueCandidateItems, setShotDialogueCandidateItems] = useState<ShotExtractedDialogueCandidateRead[]>([])
  const shotCandidatesRequestSeqRef = useRef(0)
  const [shotDurations, setShotDurations] = useState<Record<string, number>>({})
  const [loadingShots, setLoadingShots] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [prefs, setPrefs] = useLocalStoragePrefs()
  const [generating, setGenerating] = useState(false)
  const [batchSkipExtractionUpdating, setBatchSkipExtractionUpdating] = useState(false)
  const [batchVideoReadinessOpen, setBatchVideoReadinessOpen] = useState(false)
  const [batchVideoReadinessLoading, setBatchVideoReadinessLoading] = useState(false)
  const [batchVideoReadinessItems, setBatchVideoReadinessItems] = useState<
    Array<{ shot: StudioShot; readiness: ShotVideoReadinessRead | null; error?: string }>
  >([])
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const cameraPatchSeqRef = useRef(0)
  const [cameraUpdating, setCameraUpdating] = useState(false)
  const [promptAssetsUpdating, setPromptAssetsUpdating] = useState(false)

  const [frameTab, setFrameTab] = useState<'head' | 'keyframes' | 'tail' | 'compare'>('keyframes')
  const [keyframeResolutionProfile, setKeyframeResolutionProfile] = useState<KeyframeResolutionProfile>('standard')
  const [frameFileTagsMap, setFrameFileTagsMap] = useState<Record<string, string[]>>({})
  const [frameFileTagsLoading, setFrameFileTagsLoading] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [loopCurrent, setLoopCurrent] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [previewVideoFileId, setPreviewVideoFileId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTime, setVideoTime] = useState(0)

  const [filter, setFilter] = useState<ShotFilter>('all')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null)
  const [dragOverShotId, setDragOverShotId] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await LlmService.getImageGenerationOptionsApiV1LlmImageGenerationOptionsGet()
        if (!active) return
        setImageGenerationOptions(res.data ?? null)
      } catch {
        if (!active) return
        setImageGenerationOptions(null)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<null | { type: 'left' | 'right'; startX: number; startLeft: number; startRight: number }>(null)
  const resizeRafRef = useRef<number | null>(null)
  const pendingResizeRef = useRef<null | { leftWidth?: number; rightWidth?: number }>(null)
  const showPreviewMinimizeButton = false
  const showPreviewFrameSegmented = false
  const showChapterTimeline = false
  const resolveShotVideoRatio = useCallback(
    (detail?: ShotDetailRead | null) => {
      const shotRatio = String(detail?.override_video_ratio ?? '').trim()
      const projectRatio = String(projectDefaultVideoRatio ?? '').trim()
      const fallbackRatio = String(capabilityDefaultVideoRatio ?? '').trim()
      return shotRatio || projectRatio || fallbackRatio
    },
    [capabilityDefaultVideoRatio, projectDefaultVideoRatio],
  )

  const hiddenKey = useMemo(() => (chapterId ? `jellyfish_hidden_shots_${chapterId}` : null), [chapterId])
  const hiddenIds = useMemo(() => {
    if (!hiddenKey) return new Set<string>()
    try {
      const raw = window.localStorage.getItem(hiddenKey)
      const arr = raw ? (JSON.parse(raw) as unknown) : []
      return new Set(Array.isArray(arr) ? (arr.filter((x) => typeof x === 'string') as string[]) : [])
    } catch {
      return new Set<string>()
    }
  }, [hiddenKey])

  const saveHiddenIds = (next: Set<string>) => {
    if (!hiddenKey) return
    try {
      window.localStorage.setItem(hiddenKey, JSON.stringify(Array.from(next)))
    } catch {
      // ignore
    }
  }

  const toggleHiddenShots = (ids: string[]) => {
    if (!hiddenKey) return
    const next = new Set(hiddenIds)
    ids.forEach((id) => {
      if (next.has(id)) next.delete(id)
      else next.add(id)
    })
    saveHiddenIds(next)
    setShots((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, hidden: next.has(s.id) } : s)))
  }

  const loadShots = async () => {
    if (!chapterId) return
    setLoadingShots(true)
    try {
      const [res, runtimeRes] = await Promise.all([
        StudioShotsService.listShotsApiV1StudioShotsGet({
          chapterId,
          page: 1,
          pageSize: 100,
          order: 'index',
          isDesc: false,
        }),
        StudioShotsService.listShotRuntimeSummaryApiV1StudioShotsRuntimeSummaryGet({
          chapterId,
        }),
      ])
      const arr = res.data?.items ?? []
      const runtimeItems: ShotRuntimeSummaryRead[] = runtimeRes.data ?? []
      setShotRuntimeMap(
        Object.fromEntries(
          runtimeItems.map((item) => [
            item.shot_id,
            {
              has_active_tasks: item.has_active_tasks,
              has_active_video_tasks: item.has_active_video_tasks,
              has_active_prompt_tasks: item.has_active_prompt_tasks,
              has_active_frame_tasks: item.has_active_frame_tasks,
              active_task_count: item.active_task_count,
            },
          ]),
        ),
      )
      // Bổ sung một số trường hiển thị “trạng thái đài làm việc” cho phân cảnh (sau này có thể do backend trả về)
      const enriched: StudioShot[] = arr
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((s, idx) => ({
          ...s,
          hidden: hiddenIds.has(s.id),
          hasProblem: idx === 4,
          hasSpeech: false,
          hasMusic: idx % 3 !== 0,
        }))

      setShots(enriched)

      const locationState = location.state as { focusShotId?: string; selectedShotIds?: string[] } | null
      if (!locationSelectionAppliedRef.current && locationState) {
        const nextSelectedIds = (locationState.selectedShotIds ?? []).filter((id) =>
          enriched.some((shot) => shot.id === id),
        )
        const focusShotId =
          locationState.focusShotId && enriched.some((shot) => shot.id === locationState.focusShotId)
            ? locationState.focusShotId
            : nextSelectedIds[0] ?? null

        if (nextSelectedIds.length > 0) {
          setSelectedShotIds(nextSelectedIds)
        }
        if (focusShotId) {
          setSelectedShotId(focusShotId)
        }
        locationSelectionAppliedRef.current = true
        return
      }

      const selectedExists = selectedShotId ? enriched.some((s) => s.id === selectedShotId) : false
      if (!selectedShotId || !selectedExists) {
        const firstUnfinished = enriched.find((s) => !s.hidden && s.status !== 'ready')
        const firstVisible = enriched.find((s) => !s.hidden)
        setSelectedShotId((firstUnfinished ?? firstVisible ?? enriched[0])?.id ?? null)
      }
    } catch {
      message.error('Tải phân cảnh thất bại')
    } finally {
      setLoadingShots(false)
    }
  }

  const patchShotInList = (shotId: string, patch: Partial<StudioShot>) => {
    setShots((prev) => prev.map((s) => (s.id === shotId ? { ...s, ...patch } : s)))
  }

  const updateShotTitleInOps = async (shotId: string, title: string) => {
    try {
      const res = await StudioShotsService.updateShotApiV1StudioShotsShotIdPatch({
        shotId,
        requestBody: { title },
      } as any)
      if (res.data) patchShotInList(shotId, res.data as any)
      message.success('Đã lưu tiêu đề')
    } catch {
      message.error('Lưu tiêu đề thất bại')
    }
  }

  const updateShotScriptExcerptInOps = async (shotId: string, script_excerpt: string) => {
    try {
      const res = await StudioShotsService.updateShotApiV1StudioShotsShotIdPatch({
        shotId,
        requestBody: { script_excerpt },
      } as any)
      if (res.data) patchShotInList(shotId, res.data as any)
      message.success('Đã lưu ghi chú')
    } catch {
      message.error('Lưu ghi chú thất bại')
    }
  }

  const deleteShotFromOps = async (shotId: string) => {
    try {
      await StudioShotsService.deleteShotApiV1StudioShotsShotIdDelete({ shotId })
      await loadShots()
      message.success('Đã xóa')
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const loadChapter = async () => {
    if (!chapterId) return
    try {
      const [chapterRes, projectRes] = await Promise.all([
        StudioChaptersService.getChapterApiV1StudioChaptersChapterIdGet({ chapterId }),
        projectId ? StudioProjectsService.getProjectApiV1StudioProjectsProjectIdGet({ projectId }) : Promise.resolve(null),
      ])
      const data = chapterRes.data
      if (!data) {
        setChapter(null)
        return
      }
      setChapter(toUIChapter(data))
      const nextVisualStyle = projectRes?.data?.visual_style
      const nextStyle = projectRes?.data?.style
      const nextDefaultRatio = typeof projectRes?.data?.default_video_ratio === 'string' ? projectRes.data.default_video_ratio : ''
      if (nextVisualStyle === 'live_action' || nextVisualStyle === 'anime') {
        setProjectVisualStyle(nextVisualStyle)
      }
      if (typeof nextStyle === 'string' && nextStyle.trim()) {
        setProjectStyle(nextStyle)
      }
      setProjectDefaultVideoRatio(nextDefaultRatio)
    } catch {
      // Thông tin chương chỉ dùng để hiển thị tiêu đề, thất bại không chặn bàn làm việc
      setChapter(null)
      setProjectDefaultVideoRatio('')
    }
  }

  useEffect(() => {
    void loadShots()
    void loadChapter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, location.state, projectId])

  useEffect(() => {
    if (!selectedShotId) {
      shotCandidatesRequestSeqRef.current += 1
      setShotDetail(null)
      setDialogLines([])
      setFrameImages([])
      setSceneLinks([])
      setActorImageLinks([])
      setPropLinks([])
      setCostumeLinks([])
      setShotCharacterLinks([])
      setShotCandidateItems([])
      setShotDialogueCandidateItems([])
      return
    }
    setLoadingDetail(true)
    const reqSeq = ++shotCandidatesRequestSeqRef.current
    setShotCandidateItems([])
    setShotDialogueCandidateItems([])
    Promise.all([
      StudioShotDetailsService.getShotDetailApiV1StudioShotDetailsShotIdGet({ shotId: selectedShotId }).then((r: any) => r.data ?? null),
      StudioShotDialogLinesService.listShotDialogLinesApiV1StudioShotDialogLinesGet({
        shotDetailId: selectedShotId,
        q: null,
        order: 'index',
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotFrameImagesService.listShotFrameImagesApiV1StudioShotFrameImagesGet({
        shotDetailId: selectedShotId,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'scene',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId: selectedShotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'actor',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId: selectedShotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'prop',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId: selectedShotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'costume',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId: selectedShotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => r.data?.items ?? []),
      StudioShotCharacterLinksService.listShotCharacterLinksApiV1StudioShotCharacterLinksGet({
        shotId: selectedShotId,
      }).then((r: any) => (r.data ?? []) as ShotCharacterLinkRead[]),
      StudioShotsService.getShotExtractedCandidatesApiV1StudioShotsShotIdExtractedCandidatesGet({
        shotId: selectedShotId,
      }).then((r) => r.data ?? []),
      StudioShotsService.getShotExtractedDialogueCandidatesApiV1StudioShotsShotIdExtractedDialogueCandidatesGet({
        shotId: selectedShotId,
      }).then((r) => r.data ?? []),
    ])
      .then(([detail, dialogs, frames, scenes, actors, props, costumes, shotCharacters, candidates, dialogueCandidates]) => {
        if (reqSeq !== shotCandidatesRequestSeqRef.current) return
        setShotDetail(detail)
        lastSavedDetailRef.current = detail
        setDialogLines(dialogs)
        setFrameImages(frames)
        setSceneLinks(scenes)
        setActorImageLinks(actors)
        setPropLinks(props)
        setCostumeLinks(costumes)
        setShotCharacterLinks(shotCharacters)
        setShotCandidateItems(candidates as ShotExtractedCandidateRead[])
        setShotDialogueCandidateItems(dialogueCandidates as ShotExtractedDialogueCandidateRead[])
        if (detail?.duration != null) {
          setShotDurations((prev) => ({ ...prev, [selectedShotId]: detail.duration ?? 0 }))
        }
      })
      .catch(() => {
        if (reqSeq !== shotCandidatesRequestSeqRef.current) return
        message.error('Nạp chi tiết phân cảnh thất bại')
      })
      .finally(() => {
        if (reqSeq !== shotCandidatesRequestSeqRef.current) return
        setLoadingDetail(false)
      })
  }, [selectedShotId])

  useEffect(() => {
    // Đồng bộ "mục chọn chính" của chế độ chọn nhiều khi chọn phân cảnh
    if (!selectedShotId) return
    if (selectedShotIds.includes(selectedShotId)) return
    setSelectedShotIds([selectedShotId])
  }, [selectedShotId, selectedShotIds])

  const selectedShot = useMemo(() => shots.find((s) => s.id === selectedShotId) ?? null, [shots, selectedShotId])
  useTaskPageContext(
    selectedShotId
      ? [
          {
            relationType: 'shot',
            relationEntityId: selectedShotId,
          },
        ]
      : [],
  )
  const selectedShots = useMemo(
    () => shots.filter((shot) => selectedShotIds.includes(shot.id)),
    [selectedShotIds, shots],
  )
  const currentPreviewVideoFileId = previewVideoFileId || selectedShot?.generated_video_file_id || null
  const currentPreviewVideoUrl = currentPreviewVideoFileId ? buildFileDownloadUrl(currentPreviewVideoFileId) ?? '' : ''

  useEffect(() => {
    // Khi đổi phân cảnh: video vùng preview chính bám theo phân cảnh (xóa video preview đã chọn thủ công)
    setPreviewVideoFileId(null)
  }, [selectedShotId])

  const refreshDialogLines = async (shotId: string) => {
    const res = await StudioShotDialogLinesService.listShotDialogLinesApiV1StudioShotDialogLinesGet({
      shotDetailId: shotId,
      q: null,
      order: 'index',
      isDesc: false,
      page: 1,
      pageSize: 100,
    })
    setDialogLines(res.data?.items ?? [])
  }

  const refreshShotFrameImages = useCallback(async () => {
    if (!selectedShotId) return
    try {
      const res = await StudioShotFrameImagesService.listShotFrameImagesApiV1StudioShotFrameImagesGet({
        shotDetailId: selectedShotId,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      })
      setFrameImages((res.data?.items ?? []) as ShotFrameImageRead[])
    } catch {
      message.error('Làm mới loại khung hình chính thất bại')
    }
  }, [selectedShotId])

  const deleteDialogLine = async (lineId: number) => {
    if (!selectedShotId) return
    await StudioShotDialogLinesService.deleteShotDialogLineApiV1StudioShotDialogLinesLineIdDelete({ lineId })
    await refreshDialogLines(selectedShotId)
  }

  const refreshPromptAssetLinks = async (shotId: string) => {
    const [scenes, actors, props, costumes] = await Promise.all([
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'scene',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => (r.data?.items ?? []) as ProjectSceneLinkRead[]),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'actor',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => (r.data?.items ?? []) as ProjectActorLinkRead[]),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'prop',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => (r.data?.items ?? []) as ProjectPropLinkRead[]),
      StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: 'costume',
        projectId: projectId ?? null,
        chapterId: chapterId ?? null,
        shotId,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 100,
      }).then((r: any) => (r.data?.items ?? []) as ProjectCostumeLinkRead[]),
    ])
    setSceneLinks(scenes)
    setActorImageLinks(actors)
    setPropLinks(props)
    setCostumeLinks(costumes)
  }

  const loadShotCandidateItems = useCallback(async (shotId: string) => {
    try {
      const res = await StudioShotsService.getShotExtractedCandidatesApiV1StudioShotsShotIdExtractedCandidatesGet({
        shotId,
      })
      setShotCandidateItems(res.data ?? [])
    } catch {
      setShotCandidateItems([])
    }
  }, [])

  const loadShotDialogueCandidateItems = useCallback(async (shotId: string) => {
    try {
      const res = await StudioShotsService.getShotExtractedDialogueCandidatesApiV1StudioShotsShotIdExtractedDialogueCandidatesGet({
        shotId,
      })
      setShotDialogueCandidateItems(res.data ?? [])
    } catch {
      setShotDialogueCandidateItems([])
    }
  }, [])

  const batchUpdateSkipExtraction = useCallback(
    async (skip: boolean) => {
      const targetShots = selectedShots.filter((shot) => Boolean(shot.skip_extraction) !== skip)
      if (targetShots.length === 0) {
        message.info(skip ? 'Tất cả phân cảnh được chọn đã được đánh dấu không cần trích xuất' : 'Tất cả phân cảnh được chọn đã được khôi phục trích xuất')
        return
      }
      setBatchSkipExtractionUpdating(true)
      try {
        const results = await Promise.all(
          targetShots.map(async (shot) => {
            const res = await StudioShotsService.updateShotSkipExtractionApiV1StudioShotsShotIdSkipExtractionPatch({
              shotId: shot.id,
              requestBody: { skip },
            })
            return { shotId: shot.id, data: res.data?.state.shot ?? null }
          }),
        )
        results.forEach(({ shotId, data }) => {
          if (data) {
            patchShotInList(shotId, data as Partial<StudioShot>)
          } else {
            patchShotInList(shotId, { skip_extraction: skip })
          }
        })
        if (selectedShotId && targetShots.some((shot) => shot.id === selectedShotId)) {
          await Promise.all([
            loadShotCandidateItems(selectedShotId),
            loadShotDialogueCandidateItems(selectedShotId),
          ])
        }
        message.success(
          skip
            ? `Đã đánh dấu hàng loạt ${targetShots.length} phân cảnh không cần trích xuất`
            : `đã khôi phục hàng loạt luồng xác nhận trích xuất của ${targetShots.length} phân cảnh`,
        )
      } catch {
        message.error(skip ? 'đánh dấu hàng loạt không cần trích xuất thất bại' : 'khôi phục trích xuất hàng loạt thất bại')
      } finally {
        setBatchSkipExtractionUpdating(false)
      }
    },
    [loadShotCandidateItems, loadShotDialogueCandidateItems, patchShotInList, selectedShotId, selectedShots],
  )

  const fetchBatchVideoReadiness = useCallback(async () => {
    if (selectedShots.length === 0) {
      message.info('Vui lòng chọn phân cảnh video cần kiểm tra trước')
      return [] as Array<{ shot: StudioShot; readiness: ShotVideoReadinessRead | null; error?: string }>
    }
    return Promise.all(
      selectedShots
        .slice()
        .sort((a, b) => a.index - b.index)
        .map(async (shot) => {
          try {
            const res = await StudioShotsService.getShotVideoReadinessApiApiV1StudioShotsShotIdVideoReadinessGet({
              shotId: shot.id,
              referenceMode: 'text_only',
            })
            return {
              shot,
              readiness: (res.data ?? null) as ShotVideoReadinessRead | null,
            }
          } catch {
            return {
              shot,
              readiness: null,
              error: 'Kiểm tra độ sẵn sàng tạo video thất bại, vui lòng thử lại sau',
            }
          }
        }),
    )
  }, [selectedShots])

  const batchInspectVideoReadiness = useCallback(async () => {
    setBatchVideoReadinessOpen(true)
    setBatchVideoReadinessLoading(true)
    try {
      const results = await fetchBatchVideoReadiness()
      setBatchVideoReadinessItems(results)
    } finally {
      setBatchVideoReadinessLoading(false)
    }
  }, [fetchBatchVideoReadiness])

  const runBatchGenerate = useCallback(
    async (targetShotIds: string[]) => {
      for (const id of targetShotIds) {
        const framesRes = await StudioShotFrameImagesService.listShotFrameImagesApiV1StudioShotFrameImagesGet({
          shotDetailId: id,
          order: null,
          isDesc: false,
          page: 1,
          pageSize: 100,
        })
        const frames = framesRes.data?.items ?? []
        const target = frames.find((x) => x.frame_type === 'key') ?? frames[0]
        if (!target) continue

        const detailRes: any = await StudioShotDetailsService.getShotDetailApiV1StudioShotDetailsShotIdGet({ shotId: id })
        const d = detailRes?.data as any
        const prompt =
          (target.frame_type === 'first'
            ? d?.first_frame_prompt
            : target.frame_type === 'last'
              ? d?.last_frame_prompt
              : d?.key_frame_prompt) ?? ''
        if (!String(prompt || '').trim()) continue

        const linked = await StudioShotsService.listShotLinkedAssetsApiV1StudioShotsShotIdLinkedAssetsGet({
          shotId: id,
          page: 1,
          pageSize: 100,
        })
        const items = (linked.data?.items ?? []) as any[]
        const extractFileId = (thumbnail?: string | null): string | null => {
          const v = (thumbnail || '').trim()
          if (!v) return null
          if (!v.includes('/') && !v.includes(':')) return v
          try {
            const url = new URL(v, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
            const m = url.pathname.match(/\/api\/v1\/studio\/files\/([^/]+)\/download\/?$/)
            if (m?.[1]) return decodeURIComponent(m[1])
          } catch {
            // ignore
          }
          return null
        }
        const imagesPayload = items
          .map((x) => {
            const fileId = typeof x?.file_id === 'string' && x.file_id.trim() ? x.file_id.trim() : extractFileId(x?.thumbnail)
            return fileId
              ? {
                  type: x?.type as any,
                  id: String(x?.id ?? ''),
                  name: String(x?.name ?? x?.id ?? ''),
                  file_id: fileId,
                }
              : null
          })
          .filter(Boolean)
        const targetRatio = resolveShotVideoRatio(d)
        if (!targetRatio) continue
        await StudioImageTasksService.createShotFrameImageGenerationTaskApiV1StudioImageTasksShotShotIdFrameImageTasksPost({
          shotId: id,
          requestBody: {
            frame_type: target.frame_type as any,
            model_id: null,
            prompt,
            images: imagesPayload,
            target_ratio: targetRatio,
            resolution_profile: keyframeResolutionProfile,
          } as any,
        })
      }
    },
    [keyframeResolutionProfile, resolveShotVideoRatio],
  )

  const updatePromptProps = async (propIds: string[]) => {
    if (!selectedShotId || !projectId) return
    const next = Array.from(new Set(propIds.map((x) => x.trim()).filter(Boolean)))
    setPromptAssetsUpdating(true)
    try {
      const currentLinks = propLinks.filter((l) => (l.shot_id ?? null) === selectedShotId)
      await Promise.all(currentLinks.map((l) => StudioShotLinksService.deleteProjectPropLinkApiV1StudioShotLinksPropLinkIdDelete({ linkId: l.id })))
      await Promise.all(
        next.map((pid) =>
          StudioShotLinksService.createProjectPropLinkApiV1StudioShotLinksPropPost({
            requestBody: { project_id: projectId, chapter_id: chapterId ?? null, shot_id: selectedShotId, asset_id: pid },
          }),
        ),
      )
      await refreshPromptAssetLinks(selectedShotId)
      await loadShotCandidateItems(selectedShotId)
    } catch {
      message.error('Cập nhật đạo cụ thất bại')
    } finally {
      setPromptAssetsUpdating(false)
    }
  }

  const updatePromptCostumes = async (costumeIds: string[]) => {
    if (!selectedShotId || !projectId) return
    const next = Array.from(new Set(costumeIds.map((x) => x.trim()).filter(Boolean)))
    setPromptAssetsUpdating(true)
    try {
      const currentLinks = costumeLinks.filter((l) => (l.shot_id ?? null) === selectedShotId)
      await Promise.all(currentLinks.map((l) => StudioShotLinksService.deleteProjectCostumeLinkApiV1StudioShotLinksCostumeLinkIdDelete({ linkId: l.id })))
      await Promise.all(
        next.map((cid) =>
          StudioShotLinksService.createProjectCostumeLinkApiV1StudioShotLinksCostumePost({
            requestBody: { project_id: projectId, chapter_id: chapterId ?? null, shot_id: selectedShotId, asset_id: cid },
          }),
        ),
      )
      await refreshPromptAssetLinks(selectedShotId)
      await loadShotCandidateItems(selectedShotId)
    } catch {
      message.error('Cập nhật trang phục thất bại')
    } finally {
      setPromptAssetsUpdating(false)
    }
  }

  const updatePromptScene = async (sceneId?: string) => {
    if (!selectedShotId || !projectId) return
    setPromptAssetsUpdating(true)
    try {
      const currentLinks = sceneLinks.filter((l) => (l.shot_id ?? null) === selectedShotId)
      await Promise.all(currentLinks.map((l) => StudioShotLinksService.deleteProjectSceneLinkApiV1StudioShotLinksSceneLinkIdDelete({ linkId: l.id })))
      const nextSceneId = (sceneId ?? '').trim()
      if (nextSceneId) {
        await StudioShotLinksService.createProjectSceneLinkApiV1StudioShotLinksScenePost({
          requestBody: {
            project_id: projectId,
            chapter_id: chapterId ?? null,
            shot_id: selectedShotId,
            asset_id: nextSceneId,
          },
        })
      }
      await refreshPromptAssetLinks(selectedShotId)
      await loadShotCandidateItems(selectedShotId)
      patchShotDetailLocal({ scene_id: nextSceneId || null })
    } catch {
      message.error('Cập nhật bối cảnh thất bại')
    } finally {
      setPromptAssetsUpdating(false)
    }
  }

  const updatePromptActors = async (actorIds: string[]) => {
    if (!selectedShotId) return
    const next = Array.from(new Set(actorIds.map((x) => x.trim()).filter(Boolean)))
    const current = shotCharacterLinks
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((x) => x.character_id)
    const removed = current.filter((id) => !next.includes(id))
    if (removed.length > 0) {
      message.warning('API hiện tại chưa hỗ trợ gỡ nhân vật đã liên kết, chỉ thêm hoặc sắp xếp lại')
    }
    if (next.length === 0) return
    setPromptAssetsUpdating(true)
    try {
      await Promise.all(
        next.map((characterId, index) =>
          StudioShotCharacterLinksService.upsertShotCharacterLinkApiV1StudioShotCharacterLinksPost({
            requestBody: { shot_id: selectedShotId, character_id: characterId, index, note: '' },
          }),
        ),
      )
      const refreshed = await StudioShotCharacterLinksService.listShotCharacterLinksApiV1StudioShotCharacterLinksGet({ shotId: selectedShotId })
      setShotCharacterLinks((refreshed.data ?? []) as ShotCharacterLinkRead[])
      await loadShotCandidateItems(selectedShotId)
    } catch {
      message.error('Cập nhật nhân vật thất bại')
    } finally {
      setPromptAssetsUpdating(false)
    }
  }

  const generateFrameImageTask = async () => {
    if (!selectedShotId) return
    const target =
      (frameTab === 'head' && frameImages.find((x) => x.frame_type === 'first')) ||
      (frameTab === 'tail' && frameImages.find((x) => x.frame_type === 'last')) ||
      frameImages.find((x) => x.frame_type === 'key') ||
      frameImages[0]
    if (!target) {
      message.warning('vui lòng thêm một ảnh khung phân cảnh (frame image) trước')
      return
    }
    const prompt =
      (target.frame_type === 'first'
        ? shotDetail?.first_frame_prompt
        : target.frame_type === 'last'
          ? shotDetail?.last_frame_prompt
          : shotDetail?.key_frame_prompt) ?? ''
    if (!prompt.trim()) {
      message.warning('Vui lòng tạo hoặc nhập prompt trước')
      return
    }
    setGenerating(true)
    try {
      const linked = await StudioShotsService.listShotLinkedAssetsApiV1StudioShotsShotIdLinkedAssetsGet({
        shotId: selectedShotId,
        page: 1,
        pageSize: 100,
      })
      const items = (linked.data?.items ?? []) as any[]
      const extractFileId = (thumbnail?: string | null): string | null => {
        const v = (thumbnail || '').trim()
        if (!v) return null
        if (!v.includes('/') && !v.includes(':')) return v
        try {
          const url = new URL(v, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
          const m = url.pathname.match(/\/api\/v1\/studio\/files\/([^/]+)\/download\/?$/)
          if (m?.[1]) return decodeURIComponent(m[1])
        } catch {
          // ignore
        }
        return null
      }
      const imagesPayload = items
        .map((x) => {
          const fileId = typeof x?.file_id === 'string' && x.file_id.trim() ? x.file_id.trim() : extractFileId(x?.thumbnail)
          return fileId
            ? {
                type: x?.type as any,
                id: String(x?.id ?? ''),
                name: String(x?.name ?? x?.id ?? ''),
                file_id: fileId,
              }
            : null
        })
        .filter(Boolean)
      const targetRatio = resolveShotVideoRatio(shotDetail)
      if (!targetRatio) {
        message.warning('Vui lòng đặt tỷ lệ video trước')
        return
      }
      await StudioImageTasksService.createShotFrameImageGenerationTaskApiV1StudioImageTasksShotShotIdFrameImageTasksPost({
        shotId: selectedShotId,
        requestBody: {
          frame_type: target.frame_type as any,
          model_id: null,
          prompt,
          images: imagesPayload,
          target_ratio: targetRatio,
          resolution_profile: keyframeResolutionProfile,
        } as any,
      })
      message.success('Đã tạo tác vụ sinh')
    } catch {
      message.error('Tạo tác vụ sinh thất bại')
    } finally {
      setGenerating(false)
    }
  }

  const currentFrameSlot = useMemo(() => {
    if (frameTab === 'head') return frameImages.find((x) => x.frame_type === 'first') ?? null
    if (frameTab === 'tail') return frameImages.find((x) => x.frame_type === 'last') ?? null
    return frameImages.find((x) => x.frame_type === 'key') ?? frameImages[0] ?? null
  }, [frameImages, frameTab])

  const currentFrameFileId = useMemo(() => {
    const fid = currentFrameSlot?.file_id ?? null
    return fid ? String(fid) : null
  }, [currentFrameSlot?.file_id])

  const currentFrameFileTags = useMemo(() => {
    if (!currentFrameFileId) return []
    return frameFileTagsMap[currentFrameFileId] ?? []
  }, [currentFrameFileId, frameFileTagsMap])

  useEffect(() => {
    if (!currentFrameFileId) return
    if (frameFileTagsMap[currentFrameFileId]) return
    let canceled = false
    setFrameFileTagsLoading(true)
    void (async () => {
      try {
        const res = await StudioFilesService.getFileDetailApiV1StudioFilesFileIdGet({ fileId: currentFrameFileId })
        if (canceled) return
        const tagsRaw = Array.isArray((res.data as any)?.tags) ? ((res.data as any).tags as string[]).filter(Boolean) : []
        setFrameFileTagsMap((prev) => ({ ...prev, [currentFrameFileId]: normalizeFrameExclusiveTags(tagsRaw) }))
      } catch {
        if (!canceled) setFrameFileTagsMap((prev) => ({ ...prev, [currentFrameFileId]: [] }))
      } finally {
        if (!canceled) setFrameFileTagsLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [currentFrameFileId, frameFileTagsMap])

  const updateCurrentFrameFileTags = useCallback(
    async (nextTags: string[]) => {
      if (!currentFrameFileId) return
      const cleaned = Array.from(
        new Set(
          (nextTags || [])
            .map((x) => String(x ?? '').trim())
            .filter((x) => x.length > 0),
        ),
      )
      const normalized = normalizeFrameExclusiveTags(cleaned)
      setFrameFileTagsLoading(true)
      setFrameFileTagsMap((prev) => ({ ...prev, [currentFrameFileId]: normalized }))
      try {
        await StudioFilesService.updateFileMetaApiV1StudioFilesFileIdPatch({
          fileId: currentFrameFileId,
          requestBody: { tags: normalized } as any,
        })
      } catch {
        message.error('Cập nhật nhãn thất bại')
      } finally {
        setFrameFileTagsLoading(false)
      }
    },
    [currentFrameFileId],
  )

  // Sau khi chọn phân cảnh, nếu bật tự động mở panel thuộc tính: mặc định ở trạng thái mở (đặc biệt với phân cảnh chưa sẵn sàng)
  useEffect(() => {
    if (!selectedShot) return
    if (!prefs.autoOpenInspector) return
    if (prefs.inspectorOpen) return
    // "tự động mở khi chưa có video": ở đây dùng status !== ready làm phán đoán gần đúng
    if (selectedShot.status !== 'ready') {
      setPrefs((p) => ({ ...p, inspectorOpen: true }))
    }
  }, [prefs.autoOpenInspector, prefs.inspectorOpen, selectedShot, setPrefs])

  const lastSavedDetailRef = useRef<ShotDetailRead | null>(null)

  const patchShotDetailLocal = (patch: Partial<ShotDetailRead>) => {
    setShotDetail((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const patchShotDetailImmediate = async (patch: Partial<ShotDetailRead>) => {
    if (!selectedShotId) return
    patchShotDetailLocal(patch)
    setCameraUpdating(true)
    const seq = ++cameraPatchSeqRef.current
    try {
      const r: any = await StudioShotDetailsService.updateShotDetailApiV1StudioShotDetailsShotIdPatch({
        shotId: selectedShotId,
        requestBody: patch as any,
      })
      if (seq !== cameraPatchSeqRef.current) return
      if (r.data) {
        setShotDetail(r.data)
        lastSavedDetailRef.current = r.data
        if (r.data.duration != null) {
          setShotDurations((m) => ({ ...m, [selectedShotId]: r.data?.duration ?? 0 }))
        }
      }
    } catch {
      if (seq !== cameraPatchSeqRef.current) return
      message.error('Cập nhật ngôn ngữ phân cảnh thất bại')
    } finally {
      if (seq === cameraPatchSeqRef.current) setCameraUpdating(false)
    }
  }

  // Lưu tự động (debounce): shotDetail đổi thì PATCH lên backend
  useEffect(() => {
    if (!selectedShotId || !shotDetail) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    setSaving(true)
    saveTimerRef.current = window.setTimeout(() => {
      const prev = lastSavedDetailRef.current
      const next = shotDetail
      const patch: Record<string, unknown> = {}
      const assignIfChanged = <K extends keyof ShotDetailRead>(key: K) => {
        if (prev?.[key] !== next[key]) patch[key] = next[key] ?? null
      }
      assignIfChanged('scene_id')
      // Các trường ngôn ngữ điện ảnh (camera_shot/angle/movement/duration) cập nhật tức thì, không debounce-gửi ở đây
      // array / object fields
      if (JSON.stringify(prev?.mood_tags ?? null) !== JSON.stringify(next.mood_tags ?? null)) patch.mood_tags = next.mood_tags ?? null
      assignIfChanged('atmosphere')
      assignIfChanged('follow_atmosphere')
      assignIfChanged('has_bgm')
      assignIfChanged('override_video_ratio')
      assignIfChanged('vfx_type')
      assignIfChanged('vfx_note')
      assignIfChanged('first_frame_prompt')
      assignIfChanged('key_frame_prompt')
      assignIfChanged('last_frame_prompt')

      const keys = Object.keys(patch)
      if (keys.length === 0) {
        setSaving(false)
        saveTimerRef.current = null
        return
      }

      void StudioShotDetailsService.updateShotDetailApiV1StudioShotDetailsShotIdPatch({
        shotId: selectedShotId,
        requestBody: patch as any,
      })
        .then((r: any) => {
          if (r.data) {
            setShotDetail(r.data)
            lastSavedDetailRef.current = r.data
            if (r.data.duration != null) {
              setShotDurations((m) => ({ ...m, [selectedShotId]: r.data?.duration ?? 0 }))
            }
          }
        })
        .catch(() => {
          message.error('Tự động lưu thất bại')
        })
        .finally(() => {
          setSaving(false)
          saveTimerRef.current = null
        })
    }, 1000)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [selectedShotId, shotDetail])

  // Trình phát: đồng bộ thời gian và trạng thái
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setVideoTime(v.currentTime || 0)
    const onLoaded = () => setVideoDuration(v.duration || 0)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoaded)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onLoaded)
    }
  }, [selectedShotId])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = loopCurrent
  }, [loopCurrent])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !currentPreviewVideoUrl) return
    v.load()
    void v.play().catch(() => {
      // Chính sách trình duyệt có thể chặn phát tự động, giữ sự thất bại im lặng
    })
  }, [currentPreviewVideoUrl])

  // Phím tắt: ←/→ chuyển phân cảnh, Space phát/tạm dừng, P/Ctrl+I bảng, H ẩn, M gộp, Ctrl/Cmd+Enter lưu và tạo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()

      if (key === 'p' || (key === 'i' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        setPrefs((p) => ({ ...p, inspectorOpen: !p.inspectorOpen }))
        return
      }

      if (key === ' ') {
        e.preventDefault()
        const v = videoRef.current
        if (!v) return
        if (v.paused) void v.play()
        else v.pause()
        return
      }

      if (key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault()
        const visible = shots.filter((s) => !s.hidden)
        const idx = visible.findIndex((s) => s.id === selectedShotId)
        if (idx === -1) return
        const next = key === 'arrowleft' ? visible[idx - 1] : visible[idx + 1]
        if (next) setSelectedShotId(next.id)
        return
      }

      if ((e.ctrlKey || e.metaKey) && key === 'enter') {
        e.preventDefault()
        void generateFrameImageTask()
        return
      }

      if (key === 'h') {
        e.preventDefault()
        if (!selectedShotId) return
        toggleHiddenShots([selectedShotId])
        return
      }

      if (key === 'm') {
        e.preventDefault()
        if (selectedShotIds.length < 2) {
          message.info('Vui lòng chọn nhiều ít nhất 2 phân cảnh trước khi hợp nhất')
          return
        }
        Modal.confirm({
          title: `Gộp ${selectedShotIds.length} phân cảnh?`,
          content: 'Gộp chúng thành một phân cảnh mới (hành vi Mock).',
          okText: 'Gộp',
          cancelText: 'Hủy',
          onOk: () => {
            message.success('Đã hợp nhất (Mock)')
          },
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedShotId, selectedShotIds.length, shots, setPrefs])

  const statusTag = (status: ShotStatus | undefined) => {
    const s = status ?? 'pending'
    const map = { pending: 'default', generating: 'processing', ready: 'success' } as const
    const text = { pending: 'Chờ xác nhận', generating: 'Đang tạo', ready: 'Đã sẵn sàng' } as const
    return <Tag color={map[s]}>{text[s]}</Tag>
  }

  const statusDotClass = (status: ShotStatus | undefined) => {
    if (status === 'generating') return 'cs-generating'
    if (status === 'ready') return 'cs-ready'
    return 'cs-pending'
  }

  const getShotReadinessFlags = useCallback((shot: StudioShot) => {
    const runtime = shotRuntimeMap[shot.id]
    const isReady = !shot.hidden && shot.status === 'ready'
    const isGenerating = !shot.hidden && Boolean(runtime?.has_active_tasks)
    const isPendingConfirm = !shot.hidden && shot.status === 'pending'
    const hasProblem = Boolean(shot.hasProblem)
    const missing: string[] = []
    if (isPendingConfirm) missing.push('chờ xác nhận')
    if (isGenerating) missing.push('Đang tạo')
    return {
      isReady,
      isGenerating,
      isPendingConfirm,
      hasProblem,
      missing,
    }
  }, [shotRuntimeMap])

  const getShotProgressCount = useCallback(
    (shot: StudioShot) => {
      return [shot.status !== 'pending', shot.status === 'ready'].filter(Boolean).length
    },
    [getShotReadinessFlags],
  )

  const getShotPrimaryHint = useCallback(
    (shot: StudioShot) => {
      const flags = getShotReadinessFlags(shot)
      if (flags.hasProblem) return 'Có vấn đề chờ xử lý'
      if (flags.isGenerating) {
        const runtime = shotRuntimeMap[shot.id]
        return `Có tác vụ liên quan phân cảnh đang chạy（${runtime?.active_task_count ?? 1}）`
      }
      if (flags.isPendingConfirm) {
        return shot.skip_extraction
          ? 'Đã đánh dấu không cần trích xuất, chờ hệ thống hoàn tất đồng bộ trạng thái quy trình'
          : 'Vui lòng hoàn thành xác nhận trích xuất thông tin trước'
      }
      return 'Phân cảnh đã có điều kiện tiền đề tạo video'
    },
    [getShotReadinessFlags, shotRuntimeMap],
  )

  const chapterTitle = useMemo(() => {
    if (!chapter) return 'Đài làm việc tạo cấp chương'
    return `Chương ${chapter.index} · ${chapter.title.replace(/^第\d+[集章：:\s]*/g, '').trim() || chapter.title}`
  }, [chapter])

  const filteredShots = useMemo(() => {
    const list = shots.slice().sort((a, b) => a.index - b.index)
    switch (filter) {
      case 'pendingConfirm':
        return list.filter((s) => getShotReadinessFlags(s).isPendingConfirm)
      case 'generating':
        return list.filter((s) => getShotReadinessFlags(s).isGenerating)
      case 'ready':
        return list.filter((s) => getShotReadinessFlags(s).isReady)
      case 'hidden':
        return list.filter((s) => Boolean(s.hidden))
      case 'problem':
        return list.filter((s) => !s.hidden && Boolean(s.hasProblem))
      default:
        return list
    }
  }, [filter, getShotReadinessFlags, shots])

  const shotFilterCounts = useMemo(() => {
    const list = shots.slice()
    return {
      all: list.length,
      pendingConfirm: list.filter((s) => getShotReadinessFlags(s).isPendingConfirm).length,
      generating: list.filter((s) => getShotReadinessFlags(s).isGenerating).length,
      ready: list.filter((s) => getShotReadinessFlags(s).isReady).length,
      hidden: list.filter((s) => Boolean(s.hidden)).length,
      problem: list.filter((s) => !s.hidden && Boolean(s.hasProblem)).length,
    } satisfies Record<ShotFilter, number>
  }, [getShotReadinessFlags, shots])

  const multiToolbarVisible = selectedShotIds.length > 1

  const handleSelectShot = (shotId: string, indexInFiltered: number, e: React.MouseEvent) => {
    setSelectedShotId(shotId)
    const isRange = e.shiftKey && lastSelectedIndexRef.current >= 0
    const isToggle = e.ctrlKey || e.metaKey

    if (isRange) {
      const start = Math.min(lastSelectedIndexRef.current, indexInFiltered)
      const end = Math.max(lastSelectedIndexRef.current, indexInFiltered)
      const rangeIds = filteredShots.slice(start, end + 1).map((s) => s.id)
      setSelectedShotIds(Array.from(new Set([...selectedShotIds, ...rangeIds])))
      return
    }

    if (isToggle) {
      setSelectedShotIds((prev) => (prev.includes(shotId) ? prev.filter((id) => id !== shotId) : [...prev, shotId]))
      lastSelectedIndexRef.current = indexInFiltered
      return
    }

    setSelectedShotIds([shotId])
    lastSelectedIndexRef.current = indexInFiltered
  }

  const matchesFilter = (s: StudioShot, f: ShotFilter) => {
    const flags = getShotReadinessFlags(s)
    switch (f) {
      case 'pendingConfirm':
        return flags.isPendingConfirm
      case 'generating':
        return flags.isGenerating
      case 'ready':
        return flags.isReady
      case 'hidden':
        return Boolean(s.hidden)
      case 'problem':
        return !s.hidden && flags.hasProblem
      default:
        return true
    }
  }

  const reorderWithinFilter = (sourceId: string, destId: string) => {
    if (sourceId === destId) return
    setShots((prev) => {
      const ordered = prev.slice().sort((a, b) => a.index - b.index)
      const subset = ordered.filter((s) => matchesFilter(s, filter))
      const sourceIndex = subset.findIndex((s) => s.id === sourceId)
      const destIndex = subset.findIndex((s) => s.id === destId)
      if (sourceIndex === -1 || destIndex === -1) return prev
      const movedSubset = reorder(subset, sourceIndex, destIndex)
      const movedQueue = [...movedSubset]
      const replaced = ordered.map((s) => (matchesFilter(s, filter) ? (movedQueue.shift() as StudioShot) : s))
      const next = replaced.map((s, idx) => ({ ...s, index: idx + 1 }))

      // Sắp xếp đồng bộ nền (không chặn UI)
      const beforeMap = new Map(prev.map((s) => [s.id, s.index]))
      void (async () => {
        try {
          const changed = next.filter((s) => beforeMap.get(s.id) !== s.index)
          await Promise.all(
            changed.map((s) =>
              StudioShotsService.updateShotApiV1StudioShotsShotIdPatch({
                shotId: s.id,
                requestBody: { index: s.index },
              }),
            ),
          )
        } catch {
          message.error('Đồng bộ sắp xếp thất bại')
        }
      })()

      return next
    })
  }

  const beginResize = (type: 'left' | 'right', e: React.PointerEvent) => {
    if (!containerRef.current) return
    const startX = e.clientX
    dragStateRef.current = {
      type,
      startX,
      startLeft: prefs.leftWidth,
      startRight: prefs.rightWidth,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setIsResizing(true)
  }

  const onResizeMove = (e: React.PointerEvent) => {
    const st = dragStateRef.current
    if (!st) return
    const dx = e.clientX - st.startX
    const minLeft = 240
    const maxLeft = 360
    const minRight = 360
    const maxRight = 720
    if (st.type === 'left') {
      pendingResizeRef.current = { leftWidth: clamp(st.startLeft + dx, minLeft, maxLeft) }
    } else {
      // Bên phải: cả đẩy/chồng đều tái sử dụng tùy chọn width
      pendingResizeRef.current = { rightWidth: clamp(st.startRight - dx, minRight, maxRight) }
    }

    if (resizeRafRef.current) return
    resizeRafRef.current = window.requestAnimationFrame(() => {
      const pending = pendingResizeRef.current
      pendingResizeRef.current = null
      resizeRafRef.current = null
      if (!pending) return
      setPrefs((p) => ({
        ...p,
        ...(typeof pending.leftWidth === 'number' ? { leftWidth: pending.leftWidth } : null),
        ...(typeof pending.rightWidth === 'number' ? { rightWidth: pending.rightWidth } : null),
      }))
    })
  }

  const endResize = () => {
    dragStateRef.current = null
    pendingResizeRef.current = null
    if (resizeRafRef.current) {
      window.cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = null
    }
    setIsResizing(false)
  }

  const shotContextMenu = (shot: StudioShot) => ([
    {
      key: 'copy',
      icon: <LinkOutlined />,
      label: 'Sao chép phân cảnh',
      onClick: () => message.success('đã copy(Mock)'),
    },
    {
      key: 'insert_after',
      icon: <VideoCameraAddOutlined />,
      label: 'Chèn phân cảnh mới ở phía sau',
      onClick: () => message.success('đã chèn(Mock)'),
    },
    {
      key: 'transition',
      icon: <ScissorOutlined />,
      label: 'Đặt làm điểm chuyển cảnh',
      onClick: () => message.success('đã đặt(Mock)'),
    },
    { type: 'divider' as const },
    {
      key: 'toggle_hide',
      icon: shot.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />,
      label: shot.hidden ? 'Bỏ ẩn' : 'Ẩn',
      onClick: () => toggleHiddenShots([shot.id]),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      danger: true,
      label: 'Xóa',
      onClick: () =>
        Modal.confirm({
          title: 'Xóa phân cảnh?',
          content: 'Thao tác này không thể thu hồi.',
          okText: 'Xóa',
          okButtonProps: { danger: true },
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              await StudioShotsService.deleteShotApiV1StudioShotsShotIdDelete({ shotId: shot.id })
              await loadShots()
              message.success('Đã xóa')
            } catch {
              message.error('Xóa thất bại')
            }
          },
        }),
    },
  ])

  const batchMenuItems = [
    {
      key: 'merge',
      icon: <MergeCellsOutlined />,
      label: 'Gộp',
      disabled: selectedShotIds.length < 2,
      onClick: () => {
        if (selectedShotIds.length < 2) return
        Modal.confirm({
          title: `Gộp ${selectedShotIds.length} phân cảnh?`,
          okText: 'Gộp',
          cancelText: 'Hủy',
          onOk: () => message.success('đã ghép(Mock)'),
        })
      },
    },
    {
      key: 'hide',
      icon: <EyeInvisibleOutlined />,
      label: 'Ẩn',
      onClick: () => toggleHiddenShots(selectedShotIds),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      danger: true,
      label: 'Xóa',
      onClick: () =>
        Modal.confirm({
          title: `xóa ${selectedShotIds.length} phân cảnh?`,
          okText: 'Xóa',
          okButtonProps: { danger: true },
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              await Promise.all(selectedShotIds.map((id) => StudioShotsService.deleteShotApiV1StudioShotsShotIdDelete({ shotId: id })))
              await loadShots()
              message.success('Đã xóa')
            } catch {
              message.error('Xóa thất bại')
            }
          },
        }),
    },
    { type: 'divider' as const },
    {
      key: 'skip-extraction',
      icon: <StopOutlined />,
      danger: true,
      label: 'Bảo trì: đánh dấu không cần trích xuất',
      onClick: () =>
        Modal.confirm({
          title: `Xác nhận đánh dấu ${selectedShotIds.length} phân cảnh không cần trích xuất theo cách bảo trì?`,
          content: 'điều này thuộc chỉnh sửa bảo trì ở giai đoạn chuẩn bị. Sau khi đánh dấu, các phân cảnh này sẽ được xử lý theo "xác nhận trích xuất đã hoàn thành".',
          okText: 'Xác nhận',
          okButtonProps: { danger: true, loading: batchSkipExtractionUpdating },
          cancelText: 'Hủy',
          cancelButtonProps: { disabled: batchSkipExtractionUpdating },
          onOk: () => batchUpdateSkipExtraction(true),
        }),
    },
    {
      key: 'restore-extraction',
      icon: <UndoOutlined />,
      label: 'Bảo trì: khôi phục trích xuất',
      disabled: batchSkipExtractionUpdating,
      onClick: () => batchUpdateSkipExtraction(false),
    },
    { type: 'divider' as const },
    {
      key: 'generate',
      icon: <ThunderboltOutlined />,
      label: 'Tạo hàng loạt',
      onClick: () => {
        if (selectedShotIds.length === 0) return
        Modal.confirm({
          title: `sinh hàng loạt ${selectedShotIds.length} phân cảnh?`,
          okText: 'Bắt đầu',
          cancelText: 'Hủy',
          onOk: async () => {
            setGenerating(true)
            try {
              const readinessResults = await fetchBatchVideoReadiness()
              const readyShots = readinessResults.filter((item) => item.readiness?.ready)
              const blockedShots = readinessResults.filter((item) => !item.readiness?.ready)

              if (blockedShots.length > 0) {
                setBatchVideoReadinessItems(readinessResults)
                setBatchVideoReadinessOpen(true)
              }

              if (readyShots.length === 0) {
                message.warning('phân cảnh đang chọn đều chưa qua kiểm tra độ sẵn sàng tạo video, đã mở kết quả kiểm tra cho bạn')
                return
              }

              if (blockedShots.length > 0) {
                message.warning(`Trong đó ${blockedShots.length} mục không vượt qua kiểm tra, đã tự động bỏ qua, chỉ tiếp tục tạo ${readyShots.length} mục`)
              }

              await runBatchGenerate(readyShots.map((item) => item.shot.id))
              message.success('Đã tạo tác vụ tạo hàng loạt')
            } catch {
              message.error('Tạo hàng loạt thất bại')
            } finally {
              setGenerating(false)
            }
          },
        })
      },
    },
  ]

  const batchMaintenanceMenuItems = batchMenuItems.filter((item) => item.key !== 'generate')

  const toolbarSettingsItems = [
    {
      key: 'mode',
      icon: <AppstoreOutlined />,
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>Chế độ bảng thuộc tính</span>
          <Select
            size="small"
            value={prefs.inspectorMode}
            style={{ width: 120 }}
            onChange={(v) => setPrefs((p) => ({ ...p, inspectorMode: v }))}
            options={[
              { value: 'push', label: 'Chế độ đẩy' },
              { value: 'overlay', label: 'Chế độ ghi đè' },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'autoOpen',
      icon: <SettingOutlined />,
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>Chọn phân cảnh tự động mở rộng</span>
          <Switch
            size="small"
            checked={prefs.autoOpenInspector}
            onChange={(v) => setPrefs((p) => ({ ...p, autoOpenInspector: v }))}
          />
        </div>
      ),
    },
  ]

  const subtitleLines = useMemo(() => {
    if (!selectedShot || dialogLines.length === 0) return []
    const dur = Math.max(1, shotDetail?.duration ?? shotDurations[selectedShot.id] ?? 1)
    const per = dur / dialogLines.length
    return dialogLines.map((d, i) => ({
      key: `${selectedShot.id}-${d.id}`,
      role: d.speaker_character_id ?? '—',
      text: d.text,
      start: i * per,
      end: (i + 1) * per,
    }))
  }, [dialogLines, selectedShot, shotDetail?.duration, shotDurations])

  const activeSubtitleIndex = useMemo(() => {
    if (!selectedShot || subtitleLines.length === 0) return -1
    const t = videoTime
    return subtitleLines.findIndex((l) => t >= l.start && t < l.end)
  }, [selectedShot, subtitleLines, videoTime])

  return (
    <div className={['cs-studio w-full h-full min-h-0 flex flex-col', isResizing ? 'cs-resizing' : ''].join(' ')} ref={containerRef}>
      {/* Thanh công cụ trên (cố định) */}
      <div
        className="cs-topbar flex items-center gap-4 px-4 py-3"
        style={{
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {projectId && (
            <Link
              to={`/projects/${projectId}?tab=chapters`}
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1 shrink-0"
            >
              <ArrowLeftOutlined /> Quay lại
            </Link>
          )}
          <Divider type="vertical" />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{chapterTitle}</div>
            <div className="text-xs text-gray-500">
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <ClockCircleOutlined /> Đang tự động lưu…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <CheckCircleOutlined /> Đã lưu
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 shrink-0">
          <Dropdown menu={{ items: toolbarSettingsItems }} trigger={['click']}>
            <Tooltip title="Cài đặt bàn làm việc">
              <Button size="small" icon={<SettingOutlined />} />
            </Tooltip>
          </Dropdown>
          <Tooltip title={prefs.inspectorOpen ? 'Thu gọn bảng thuộc tính (P / Ctrl/Cmd+I)' : 'Mở bảng thuộc tính (P / Ctrl/Cmd+I)'}>
            <Button
              size="small"
              icon={prefs.inspectorOpen ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
              onClick={() => setPrefs((p) => ({ ...p, inspectorOpen: !p.inspectorOpen }))}
            />
          </Tooltip>
        </div>
      </div>

      {/* Bố cục ba cột động */}
      <Layout
        className="flex-1 min-h-0"
        style={{
          background: 'transparent',
          position: 'relative',
          overflow: 'hidden',
        }}
        onPointerMove={onResizeMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
      >
        {/* Trái: danh sách phân cảnh */}
        <Sider
          width={prefs.leftWidth}
          collapsedWidth={0}
          className="cs-left flex flex-col"
          style={{
            overflow: 'hidden',
          }}
        >
          <div className="cs-group m-3 mb-2 flex flex-col gap-2 min-w-0">
            <div className="cs-group-title mb-0 flex items-center gap-2 shrink-0">
              <FileTextOutlined /> Danh sách phân cảnh
            </div>
            <div className="overflow-x-auto min-w-0 -mx-1 px-1">
              <Segmented
                size="small"
                value={filter}
                onChange={(v) => setFilter(v as ShotFilter)}
                options={[
                  { label: `Tất cả ${shotFilterCounts.all}`, value: 'all' },
                  { label: `Chờ xác nhận ${shotFilterCounts.pendingConfirm}`, value: 'pendingConfirm' },
                  { label: `Đang tạo ${shotFilterCounts.generating}`, value: 'generating' },
                  { label: `Sẵn sàng ${shotFilterCounts.ready}`, value: 'ready' },
                  { label: `Ẩn ${shotFilterCounts.hidden}`, value: 'hidden' },
                  { label: `Có vấn đề ${shotFilterCounts.problem}`, value: 'problem' },
                ]}
              />
            </div>
          </div>

          {multiToolbarVisible && (
            <ChapterStudioBatchToolbar
              selectedCount={selectedShotIds.length}
              batchVideoReadinessLoading={batchVideoReadinessLoading}
              generating={generating}
              maintenanceMenuItems={batchMaintenanceMenuItems}
              onBatchInspectVideoReadiness={() => void batchInspectVideoReadiness()}
              onBatchGenerate={() => batchMenuItems.find((item) => item.key === 'generate')?.onClick?.()}
            />
          )}

          {!multiToolbarVisible && selectedShotIds.length === 1 && (
            <div className="cs-group m-3 mt-0 mb-2">
              <div className="rounded-lg border border-solid border-gray-200 bg-white/80 px-3 py-2 text-xs text-gray-600">
                Đã chọn 1 mục, tiếp tục nhấn <span className="font-medium text-gray-700">Command/Ctrl + chuột</span> để thêm vào chọn nhiều
              </div>
            </div>
          )}

          <div className="cs-left-scroll px-3 pb-3">
            {loadingShots ? (
              <div className="text-gray-500 text-center py-4">Đang tải...</div>
            ) : (
              <div>
                {filteredShots.map((s, i) => {
                  const isActive = selectedShotId === s.id
                  const isSelected = selectedShotIds.includes(s.id)
                  const isDragging = draggingShotId === s.id
                  const isDragOver = dragOverShotId === s.id && draggingShotId && draggingShotId !== s.id
                  const readiness = getShotReadinessFlags(s)
                  const progressCount = getShotProgressCount(s)
                  const primaryHint = getShotPrimaryHint(s)
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingShotId(s.id)
                        setDragOverShotId(null)
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', s.id)
                      }}
                      onDragEnter={() => {
                        if (!draggingShotId || draggingShotId === s.id) return
                        setDragOverShotId(s.id)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const sourceId = e.dataTransfer.getData('text/plain') || draggingShotId
                        if (!sourceId) return
                        reorderWithinFilter(sourceId, s.id)
                        setDraggingShotId(null)
                        setDragOverShotId(null)
                      }}
                      onDragEnd={() => {
                        setDraggingShotId(null)
                        setDragOverShotId(null)
                      }}
                      style={{
                        opacity: isDragging ? 0.92 : 1,
                        outline: isDragOver ? '2px dashed var(--ant-color-primary)' : 'none',
                        borderRadius: 8,
                      }}
                    >
                      <Tooltip
                        title={
                          selectedShotIds.length === 0
                            ? 'Command/Ctrl + nhấn để chọn nhiều'
                            : selectedShotIds.length === 1 && !isSelected
                              ? 'Tiếp tục nhấn Command/Ctrl rồi nhấp để thêm vào chọn nhiều'
                              : undefined
                        }
                        placement="right"
                      >
                        <Dropdown menu={{ items: shotContextMenu(s) }} trigger={['contextMenu']}>
                          <Card
                            size="small"
                            className={[
                              'cs-shot-item mb-2 cursor-pointer transition-colors',
                              isSelected ? 'cs-shot-selected' : '',
                              isActive ? 'cs-shot-active' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                              opacity: s.hidden ? 0.55 : 1,
                            }}
                            onClick={(e) => handleSelectShot(s.id, i, e)}
                            onDoubleClick={() => {
                              setEditingTitleId(s.id)
                              setEditingTitleValue(s.title)
                            }}
                          >
                            <div className="flex gap-2">
                            <div className="w-16 h-10 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                              <span>16:9</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`cs-dot ${statusDotClass(s.status)}`} />
                                <span className="text-xs text-gray-500 shrink-0">
                                  {String(s.index).padStart(2, '0')}
                                </span>
                                {editingTitleId === s.id ? (
                                  <Input
                                    size="small"
                                    value={editingTitleValue}
                                    autoFocus
                                    onChange={(ev) => setEditingTitleValue(ev.target.value)}
                                    onBlur={() => {
                                      const nextTitle = editingTitleValue.trim()
                                      setShots((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: nextTitle || x.title } : x)))
                                      if (nextTitle && nextTitle !== s.title) {
                                        void StudioShotsService.updateShotApiV1StudioShotsShotIdPatch({
                                          shotId: s.id,
                                          requestBody: { title: nextTitle },
                                        }).catch(() => message.error('Lưu tiêu đề thất bại'))
                                      }
                                      setEditingTitleId(null)
                                    }}
                                    onKeyDown={(ev) => {
                                      if (ev.key === 'Enter') {
                                        (ev.currentTarget as HTMLInputElement).blur()
                                      }
                                      if (ev.key === 'Escape') {
                                        setEditingTitleId(null)
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="font-medium text-sm truncate" title="Nhấp đúp để chỉnh sửa tiêu đề">
                                    {s.title}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {shotDetail?.movement ? `${CAMERA_MOVEMENT_OPTIONS.find((x) => x.value === shotDetail.movement)?.label ?? shotDetail.movement} · ` : ''}
                                {((shotDurations[s.id] ?? shotDetail?.duration ?? 0) || 0).toFixed(1)}s
                              </div>
                              <div className="cs-shot-progress mt-1">
                                <div className="cs-shot-progress__dots" aria-hidden="true">
                                  {[0, 1].map((idx) => (
                                    <span
                                      key={idx}
                                      className={[
                                        'cs-shot-progress__dot',
                                        idx < progressCount ? 'is-on' : '',
                                      ].join(' ')}
                                    />
                                  ))}
                                </div>
                                <span className="cs-shot-progress__text">{progressCount}/2</span>
                              </div>
                              <div className="cs-shot-hint mt-1">
                                {primaryHint}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1 items-center">
                                {readiness.isReady ? (
                                  <Tag className="m-0" color="success">sẵn sàng</Tag>
                                ) : readiness.isGenerating ? (
                                  <Tag className="m-0" color="processing">đang sinh</Tag>
                                ) : (
                                  <Tag className="m-0" color="gold">chờ xác nhận</Tag>
                                )}
                                {s.skip_extraction && (
                                  <Tag className="m-0" color="cyan">
                                    Không cần trích xuất
                                  </Tag>
                                )}
                                {s.hasMusic && <Tag icon={<SoundOutlined />} className="m-0" color="default">Nhạc</Tag>}
                                {statusTag(s.status)}
                                {s.hidden && <Tag icon={<EyeInvisibleOutlined />} className="m-0">Ẩn</Tag>}
                                {s.hasProblem && <Tag color="error" className="m-0">Có vấn đề</Tag>}
                              </div>
                            </div>
                            </div>
                          </Card>
                        </Dropdown>
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Sider>

        {/* Thanh kéo trái */}
        <div
          role="separator"
          className="cs-sep h-full"
          style={{
            width: 10,
            cursor: 'col-resize',
            background: 'transparent',
            flexShrink: 0,
          }}
          onPointerDown={(e) => beginResize('left', e)}
          title="Kéo thả để điều chỉnh độ rộng bên trái"
        />

        {/* Giữa: vùng xem trước chính */}
        <Content className="cs-main min-w-0 min-h-0 flex flex-col" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
          <Card
            title={
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium">vùng preview chính</span>
                {selectedShot && (
                  <span className="text-xs text-gray-500 truncate">
                    Phân cảnh hiện tại: {String(selectedShot.index).padStart(2, '0')} · {selectedShot.title}
                  </span>
                )}
              </div>
            }
            extra={
              <Space size="small">
                {showPreviewMinimizeButton && (
                  <Tooltip title="Xem trước thu nhỏ (giữ chỗ)">
                    <Button size="small" icon={<DoubleRightOutlined />} onClick={() => message.info('Thu nhỏ bản xem trước (Mock)')} />
                  </Tooltip>
                )}
                <Tooltip title="Chụp khung hình hiện tại (Mock)">
                  <Button size="small" icon={<ScissorOutlined />} onClick={() => message.success('Đã cắt khung hình hiện tại (Mock)')} />
                </Tooltip>
                <Tooltip title={currentPreviewVideoFileId ? 'Tải xuống video xem trước hiện tại' : 'Tạm chưa có video để tải'}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    disabled={!currentPreviewVideoFileId || !currentPreviewVideoUrl}
                    onClick={() => {
                      if (!currentPreviewVideoUrl) return
                      window.open(currentPreviewVideoUrl, '_blank', 'noopener,noreferrer')
                    }}
                  />
                </Tooltip>
              </Space>
            }
            className="cs-preview-card flex-1 min-h-0"
            bodyStyle={{ height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div className="flex items-center justify-between gap-2">
              {showPreviewFrameSegmented ? (
                <Segmented
                  size="small"
                  value={frameTab}
                  onChange={(v) => setFrameTab(v as typeof frameTab)}
                  options={[
                    { label: 'Khung hình đầu', value: 'head' },
                    { label: 'Danh sách khung hình chính', value: 'keyframes' },
                    { label: 'Khung hình cuối', value: 'tail' },
                    { label: 'Đối chiếu tham khảo', value: 'compare' },
                  ]}
                />
              ) : (
                <div />
              )}
              <Space size="small">
                <Select
                  size="small"
                  value={playbackRate}
                  style={{ width: 86 }}
                  onChange={(v) => setPlaybackRate(v)}
                  options={[0.5, 1, 1.25, 1.5, 2].map((v) => ({ label: `${v}x`, value: v }))}
                />
                <Tooltip title="Lặp phân cảnh hiện tại">
                  <Switch size="small" checked={loopCurrent} onChange={setLoopCurrent} />
                </Tooltip>
                <Space size={4} className="max-w-[320px]">
                  <Radio.Group
                    size="small"
                    buttonStyle="solid"
                    disabled={!currentFrameFileId || frameFileTagsLoading}
                    value={currentFrameFileTags.includes(FRAME_FILE_TAG_ADOPT) ? FRAME_FILE_TAG_ADOPT : currentFrameFileTags.includes(FRAME_FILE_TAG_ABANDON) ? FRAME_FILE_TAG_ABANDON : ''}
                    onChange={(e) => {
                      const v = String(e?.target?.value ?? '')
                      const base = currentFrameFileTags.filter((t) => t !== FRAME_FILE_TAG_ADOPT && t !== FRAME_FILE_TAG_ABANDON)
                      if (!v) void updateCurrentFrameFileTags(base)
                      else void updateCurrentFrameFileTags([v, ...base])
                    }}
                  >
                    <Radio.Button value={FRAME_FILE_TAG_ADOPT}>Áp dụng</Radio.Button>
                    <Radio.Button value={FRAME_FILE_TAG_ABANDON}>Bỏ</Radio.Button>
                  </Radio.Group>
                  <Select
                    mode="tags"
                    size="small"
                    style={{ minWidth: 160, maxWidth: 220 }}
                    placeholder="Nhãn tùy chỉnh"
                    disabled={!currentFrameFileId || frameFileTagsLoading}
                    loading={frameFileTagsLoading}
                    value={currentFrameFileTags.filter((t) => t !== FRAME_FILE_TAG_ADOPT && t !== FRAME_FILE_TAG_ABANDON)}
                    onChange={(vals) => {
                      const base = Array.isArray(vals) ? (vals as any[]).map((v) => String(v)) : []
                      const keep =
                        currentFrameFileTags.find((t) => t === FRAME_FILE_TAG_ADOPT || t === FRAME_FILE_TAG_ABANDON) ?? null
                      void updateCurrentFrameFileTags(keep ? [keep, ...base] : base)
                    }}
                  />
                </Space>
                <Tooltip title="Dữ liệu phân cảnh hiện tại">
                  <Tag className="m-0">
                    Ảnh khung hình {frameImages.length} · Liên kết {sceneLinks.length + actorImageLinks.length + propLinks.length + costumeLinks.length}
                  </Tag>
                </Tooltip>
              </Space>
            </div>

            <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-8 pr-1">
              <div className="relative">
                <div className="cs-player-shell">
                  <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
                  {/* Mock: vẫn hiển thị được cấu trúc trình phát khi chưa có nguồn video thật */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls={false}
                    muted
                    playsInline
                    preload="metadata"
                    src={currentPreviewVideoUrl || undefined}
                  />
                  {!selectedShot && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      Vui lòng chọn phân cảnh
                    </div>
                  )}
                  {selectedShot && !currentPreviewVideoUrl && selectedShot.status !== 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Badge
                        status={shotRuntimeMap[selectedShot.id]?.has_active_tasks ? 'processing' : 'default'}
                        text={shotRuntimeMap[selectedShot.id]?.has_active_tasks ? 'Đang tạo…' : 'Chưa tạo'}
                      />
                    </div>
                  )}
                  </div>
                </div>

                {/* Thanh kiểm soát phát */}
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="small"
                    icon={<CaretLeftOutlined />}
                    onClick={() => message.info('Khung hình tiến (Mock)')}
                  />
                  <Button
                    size="small"
                    type="primary"
                    icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => {
                      const v = videoRef.current
                      if (!v) return
                      if (v.paused) void v.play()
                      else v.pause()
                    }}
                  >
                    {isPlaying ? 'Tạm dừng' : 'Phát'}
                  </Button>
                  <Button
                    size="small"
                    icon={<CaretRightOutlined />}
                    onClick={() => message.info('Khung hình lùi (Mock)')}
                  />
                  <div className="flex-1 min-w-0">
                    <Slider
                      tooltip={{ formatter: null }}
                      min={0}
                      max={Math.max(1, videoDuration || shotDetail?.duration || (selectedShotId ? shotDurations[selectedShotId] : 0) || 1)}
                      value={videoTime}
                      onChange={(v) => {
                        const vv = videoRef.current
                        if (!vv) return
                        vv.currentTime = Number(v)
                        setVideoTime(Number(v))
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 w-[110px] text-right">
                    {videoTime.toFixed(1)} / {Math.max(videoDuration || 0, shotDetail?.duration || (selectedShotId ? shotDurations[selectedShotId] : 0) || 0).toFixed(1)}s
                  </div>
                </div>

                {/* Thanh phụ đề thoại */}
                <div className="cs-subtitle mt-2 px-3 py-2">
                  {subtitleLines.length === 0 ? (
                    <div className="text-sm opacity-80">chưa có phụ đề thoại</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {subtitleLines.map((l, idx) => {
                        const active = idx === activeSubtitleIndex
                        return (
                          <div
                            key={l.key}
                            className="cs-sub-line text-sm cursor-pointer"
                            style={{ opacity: active ? 1 : 0.6, fontWeight: active ? 600 : 400 }}
                            onClick={() => {
                              const v = videoRef.current
                              if (!v) return
                              v.currentTime = l.start
                              setVideoTime(l.start)
                            }}
                          >
                            <span style={{ opacity: 0.9 }}>{l.role}：</span>
                            <span>{l.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trục thời gian cấp chương (thu gọn được, cố định ở đáy, không cuộn) */}
            {showChapterTimeline && (
              <div
                className="rounded border border-solid border-gray-200 flex-shrink-0 min-h-0 flex flex-col"
                style={{ background: 'var(--ant-color-bg-container)' }}
              >
                <div className="px-3 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="text-sm font-medium">trục thời gian chương</div>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setPrefs((p) => ({ ...p, timelineCollapsed: !p.timelineCollapsed }))}
                  >
                    {prefs.timelineCollapsed ? 'Mở' : 'Gấp'}
                  </Button>
                </div>
                {!prefs.timelineCollapsed && (
                  <div className="px-3 pb-3 flex-shrink-0 overflow-hidden">
                    <div className="flex items-center gap-2 overflow-x-auto py-1 min-h-[32px]">
                      {shots
                        .slice()
                        .sort((a, b) => a.index - b.index)
                        .filter((s) => !s.hidden)
                        .map((s) => {
                          const active = s.id === selectedShotId
                          return (
                            <div
                              key={s.id}
                              className="shrink-0 cursor-pointer rounded"
                              style={{
                                width: clamp(18 + ((shotDurations[s.id] ?? 1) || 1) * 6, 24, 96),
                                height: 14,
                                background:
                                  shotRuntimeMap[s.id]?.has_active_tasks
                                    ? 'rgba(59,130,246,0.45)'
                                    : s.status === 'ready'
                                    ? 'rgba(34,197,94,0.45)'
                                    : 'rgba(156,163,175,0.45)',
                                outline: active ? '2px solid var(--ant-color-primary)' : '1px solid rgba(0,0,0,0.06)',
                              }}
                              title={`${String(s.index).padStart(2, '0')} · ${s.title}`}
                              onClick={() => setSelectedShotId(s.id)}
                            />
                          )
                        })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Nhấn vào thanh khối để nhảy tới phân cảnh; phân cảnh ẩn không tham gia xem trước
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Content>

        {/* Bên phải: panel thuộc tính (đẩy / chồng) */}
        {prefs.inspectorMode === 'push' ? (
          <>
            {/* Thanh kéo phía phải (chế độ đẩy) */}
            {prefs.inspectorOpen && (
              <div
                role="separator"
                className="cs-sep cs-sep-strong h-full"
                style={{
                  width: 10,
                  cursor: 'col-resize',
                  background: 'transparent',
                  flexShrink: 0,
                }}
                onPointerDown={(e) => beginResize('right', e)}
                title="Kéo để chỉnh độ rộng bảng thuộc tính"
              />
            )}
            <Sider
              width={prefs.inspectorOpen ? prefs.rightWidth : 0}
              collapsedWidth={0}
              collapsed={!prefs.inspectorOpen}
              className="cs-right"
              style={{
                overflow: 'hidden',
              }}
            >
              <Inspector
                projectId={projectId}
                chapterId={chapterId}
                projectVisualStyle={projectVisualStyle}
                projectStyle={projectStyle}
                projectDefaultVideoRatio={projectDefaultVideoRatio}
                capabilityDefaultVideoRatio={capabilityDefaultVideoRatio}
                videoRatioOptions={videoRatioOptions}
                imageGenerationOptions={imageGenerationOptions}
                keyframeResolutionProfile={keyframeResolutionProfile}
                onChangeKeyframeResolutionProfile={setKeyframeResolutionProfile}
                loadingDetail={loadingDetail}
                shotDetail={shotDetail}
                dialogLines={dialogLines}
                frameImages={frameImages}
                sceneLinks={sceneLinks}
                propLinks={propLinks}
                costumeLinks={costumeLinks}
                shotCharacterLinks={shotCharacterLinks}
                shotCandidateItems={shotCandidateItems}
                shotDialogueCandidateItems={shotDialogueCandidateItems}
                cameraUpdating={cameraUpdating}
                promptAssetsUpdating={promptAssetsUpdating}
                onDeleteDialogLine={deleteDialogLine}
                onUpdatePromptScene={updatePromptScene}
                onUpdatePromptActors={updatePromptActors}
                onUpdatePromptProps={updatePromptProps}
                onUpdatePromptCostumes={updatePromptCostumes}
                selectedShot={selectedShot}
                onUpdateShotTitle={updateShotTitleInOps}
                onUpdateShotScriptExcerpt={updateShotScriptExcerptInOps}
                onDeleteShotOps={deleteShotFromOps}
                onPatchShotDetail={patchShotDetailLocal}
                onPatchShotDetailImmediate={patchShotDetailImmediate}
                onSelectPreviewVideo={setPreviewVideoFileId}
                onRefreshShotFrameImages={refreshShotFrameImages}
                onClose={() => setPrefs((p) => ({ ...p, inspectorOpen: false }))}
              />
            </Sider>

            {!prefs.inspectorOpen && (
              <div
                className="cs-right-strip"
                onClick={() => setPrefs((p) => ({ ...p, inspectorOpen: true }))}
                title="Mở bảng thuộc tính (P / Ctrl/Cmd+I)"
              >
                <span>Thuộc tính</span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Chế độ che phủ: ngăn kéo bên phải phủ lên phần trung tâm */}
            {prefs.inspectorOpen && (
              <div
                className="absolute top-0 right-0 h-full"
                style={{
                  width: prefs.rightWidth,
                  background: '#f9fafc',
                  borderLeft: '2px solid #cbd5e1',
                  zIndex: 20,
                  boxShadow: '-4px 0 12px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'row',
                }}
              >
                <div
                  role="separator"
                  className="cs-sep cs-sep-strong"
                  style={{ width: 10, flexShrink: 0 }}
                  onPointerDown={(e) => beginResize('right', e)}
                  title="Kéo thả để điều chỉnh độ rộng phủ"
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <Inspector
                    projectId={projectId}
                    chapterId={chapterId}
                    projectVisualStyle={projectVisualStyle}
                    projectStyle={projectStyle}
                    projectDefaultVideoRatio={projectDefaultVideoRatio}
                    capabilityDefaultVideoRatio={capabilityDefaultVideoRatio}
                    videoRatioOptions={videoRatioOptions}
                    imageGenerationOptions={imageGenerationOptions}
                    keyframeResolutionProfile={keyframeResolutionProfile}
                    onChangeKeyframeResolutionProfile={setKeyframeResolutionProfile}
                    loadingDetail={loadingDetail}
                    shotDetail={shotDetail}
                    dialogLines={dialogLines}
                    frameImages={frameImages}
                    sceneLinks={sceneLinks}
                    propLinks={propLinks}
                    costumeLinks={costumeLinks}
                    shotCharacterLinks={shotCharacterLinks}
                    shotCandidateItems={shotCandidateItems}
                    shotDialogueCandidateItems={shotDialogueCandidateItems}
                    cameraUpdating={cameraUpdating}
                    promptAssetsUpdating={promptAssetsUpdating}
                    onDeleteDialogLine={deleteDialogLine}
                    onUpdatePromptScene={updatePromptScene}
                    onUpdatePromptActors={updatePromptActors}
                    onUpdatePromptProps={updatePromptProps}
                    onUpdatePromptCostumes={updatePromptCostumes}
                    selectedShot={selectedShot}
                    onUpdateShotTitle={updateShotTitleInOps}
                    onUpdateShotScriptExcerpt={updateShotScriptExcerptInOps}
                    onDeleteShotOps={deleteShotFromOps}
                    onPatchShotDetail={patchShotDetailLocal}
                    onPatchShotDetailImmediate={patchShotDetailImmediate}
                    onSelectPreviewVideo={setPreviewVideoFileId}
                    onRefreshShotFrameImages={refreshShotFrameImages}
                    onClose={() => setPrefs((p) => ({ ...p, inspectorOpen: false }))}
                  />
                </div>
              </div>
            )}

            {/* Trong chế độ che phủ, công tắc thường trực ở mép phải */}
            <Tooltip title={prefs.inspectorOpen ? 'Thu gọn bảng thuộc tính' : 'Mở bảng thuộc tính'}>
              <Button
                size="small"
                className="absolute top-1/2 -translate-y-1/2"
                style={{ right: 4, zIndex: 30 }}
                icon={prefs.inspectorOpen ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
                onClick={() => setPrefs((p) => ({ ...p, inspectorOpen: !p.inspectorOpen }))}
              />
            </Tooltip>
          </>
        )}

        <Modal
          title={`Độ sẵn sàng video hàng loạt(${selectedShots.length} phân cảnh)`}
          open={batchVideoReadinessOpen}
          onCancel={() => {
            if (batchVideoReadinessLoading) return
            setBatchVideoReadinessOpen(false)
          }}
          footer={[
            <Button key="close" onClick={() => setBatchVideoReadinessOpen(false)} disabled={batchVideoReadinessLoading}>
              Đóng
            </Button>,
            <Button
              key="refresh"
              type="primary"
              icon={<VideoCameraOutlined />}
              loading={batchVideoReadinessLoading}
              onClick={() => void batchInspectVideoReadiness()}
            >
              Kiểm tra lại
            </Button>,
          ]}
          width={880}
          destroyOnClose={false}
        >
          {batchVideoReadinessLoading ? (
            <div className="py-10 text-center">
              <Spin />
            </div>
          ) : batchVideoReadinessItems.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có kết quả độ sẵn sàng tạo video theo lô</div>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="text-xs text-gray-500">
                Hiện đang kiểm tra lô phân cảnh này có đủ điều kiện tạo video theo chế độ tham chiếu <Tag className="!mx-1">text_only</Tag> hay không.
              </div>
              {batchVideoReadinessItems.map(({ shot, readiness, error }) => {
                const failedChecks = (readiness?.checks ?? []).filter((item) => !item.ok)
                return (
                  <div key={shot.id} className="rounded-lg border border-solid border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {String(shot.index).padStart(2, '0')} · {shot.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {error
                            ? error
                            : readiness?.ready
                              ? 'Phân cảnh hiện tại đã đủ điều kiện tạo video.'
                              : `Phân cảnh hiện tại còn ${failedChecks.length} mục cần bổ sung.`}
                        </div>
                      </div>
                      <Tag color={error ? 'red' : readiness?.ready ? 'green' : 'gold'}>
                        {error ? 'Kiểm tra thất bại' : readiness?.ready ? 'Sẵn sàng tạo' : 'Cần bổ sung'}
                      </Tag>
                    </div>
                    {!error ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(readiness?.checks ?? []).map((check) => (
                          <Tooltip key={check.key} title={check.message}>
                            <Tag color={check.ok ? 'green' : 'default'}>
                              {check.ok ? 'Đạt' : 'Chưa đạt'} · {check.key}
                            </Tag>
                          </Tooltip>
                        ))}
                      </div>
                    ) : null}
                    {!error && failedChecks.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        {failedChecks.map((check) => (
                          <div key={check.key} className="text-xs text-gray-600">
                            • {check.message}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      </Layout>
    </div>
  )
}

export default ChapterStudio

function Inspector(props: {
  projectId?: string
  chapterId?: string
  projectVisualStyle: 'live_action' | 'anime'
  projectStyle: string
  projectDefaultVideoRatio: string
  capabilityDefaultVideoRatio: string
  videoRatioOptions: Array<{ value: string; label: React.ReactNode }>
  imageGenerationOptions: ImageGenerationOptionsRead | null
  keyframeResolutionProfile: KeyframeResolutionProfile
  onChangeKeyframeResolutionProfile: (value: KeyframeResolutionProfile) => void
  loadingDetail: boolean
  shotDetail: ShotDetailRead | null
  dialogLines: ShotDialogLineRead[]
  frameImages: ShotFrameImageRead[]
  sceneLinks: ProjectSceneLinkRead[]
  propLinks: ProjectPropLinkRead[]
  costumeLinks: ProjectCostumeLinkRead[]
  shotCharacterLinks: ShotCharacterLinkRead[]
  shotCandidateItems: ShotExtractedCandidateRead[]
  shotDialogueCandidateItems: ShotExtractedDialogueCandidateRead[]
  cameraUpdating: boolean
  promptAssetsUpdating: boolean
  onDeleteDialogLine: (lineId: number) => Promise<void>
  onUpdatePromptScene: (sceneId?: string) => Promise<void>
  onUpdatePromptActors: (actorIds: string[]) => Promise<void>
  onUpdatePromptProps: (propIds: string[]) => Promise<void>
  onUpdatePromptCostumes: (costumeIds: string[]) => Promise<void>
  selectedShot: StudioShot | null
  onUpdateShotTitle: (shotId: string, title: string) => Promise<void>
  onUpdateShotScriptExcerpt: (shotId: string, script_excerpt: string) => Promise<void>
  onDeleteShotOps: (shotId: string) => Promise<void>
  onClose: () => void
  onPatchShotDetail: (patch: Partial<ShotDetailRead>) => void
  onPatchShotDetailImmediate: (patch: Partial<ShotDetailRead>) => Promise<void>
  onSelectPreviewVideo: (fileId: string) => void
  /** Khi mở dropdown, kéo ảnh khung phân cảnh mới nhất, dùng để cập nhật động tùy chọn loại khung hình chính "tham chiếu" */
  onRefreshShotFrameImages?: () => Promise<void>
}) {
  const {
    projectId,
    chapterId,
    projectVisualStyle,
    projectStyle,
    projectDefaultVideoRatio,
    capabilityDefaultVideoRatio,
    videoRatioOptions,
    imageGenerationOptions,
    keyframeResolutionProfile,
    onChangeKeyframeResolutionProfile,
    loadingDetail,
    shotDetail,
    dialogLines,
    frameImages,
    sceneLinks,
    propLinks,
    costumeLinks,
    shotCharacterLinks,
    shotCandidateItems,
    shotDialogueCandidateItems,
    cameraUpdating,
    promptAssetsUpdating,
    onDeleteDialogLine,
    onUpdatePromptScene,
    onUpdatePromptActors,
    onUpdatePromptProps,
    onUpdatePromptCostumes,
    selectedShot,
    onUpdateShotTitle,
    onUpdateShotScriptExcerpt,
    onDeleteShotOps,
    onClose,
    onPatchShotDetail,
    onPatchShotDetailImmediate,
    onSelectPreviewVideo,
    onRefreshShotFrameImages,
  } = props
  const currentChapterId = chapterId ?? null
  const [imageVersion, setImageVersion] = useState('v1')
  const [refImageType, setRefImageType] = useState<string | undefined>(undefined)
  const [refFrameTypeSelectLoading, setRefFrameTypeSelectLoading] = useState(false)
  const [useBoneDepth, setUseBoneDepth] = useState(false)
  const [audioMode, setAudioMode] = useState<'none' | 'prompt' | 'upload'>('none')
  const [hideShot, setHideShot] = useState(false)
  const [inspectorTabKey, setInspectorTabKey] = useState<InspectorTabKey>('camera')
  const [sceneNameMap, setSceneNameMap] = useState<Record<string, string>>({})
  const [characterNameMap, setCharacterNameMap] = useState<Record<string, string>>({})
  const [linkRoleOpen, setLinkRoleOpen] = useState(false)
  const [linkRoleLoading, setLinkRoleLoading] = useState(false)
  const [linkRoleSelectedIds, setLinkRoleSelectedIds] = useState<string[]>([])
  const [projectRoleOptions, setProjectRoleOptions] = useState<
    Array<{ value: string; label: React.ReactNode; searchLabel: string; disabled?: boolean }>
  >([])
  const [shotLinkedAssets, setShotLinkedAssets] = useState<
    Array<{ type: string; id: string; name?: string; thumbnail?: string; image_id?: number | null }>
  >([])
  const [shotAssetsOverview, setShotAssetsOverview] = useState<ShotAssetsOverviewRead | null>(null)
  const shotAssetsOverviewRequestSeqRef = useRef(0)
  const [shotRenderPromptLoading, setShotRenderPromptLoading] = useState(false)
  const [shotExtractStatus, setShotExtractStatus] = useState<{
    source: 'idle'
    updatedAt: number | null
    message: string
  }>({
    source: 'idle',
    updatedAt: null,
    message: '',
  })
  const [readinessExistenceMap, setReadinessExistenceMap] = useState<Record<string, EntityNameExistenceItem>>({})
  const [readinessExistenceLoading, setReadinessExistenceLoading] = useState(false)
  const [linkSceneOpen, setLinkSceneOpen] = useState(false)
  const [linkSceneLoading, setLinkSceneLoading] = useState(false)
  const [projectSceneOptions, setProjectSceneOptions] = useState<Array<{ value: string; label: React.ReactNode; searchLabel: string }>>([])

  const [linkPropOpen, setLinkPropOpen] = useState(false)
  const [linkPropLoading, setLinkPropLoading] = useState(false)
  const [linkPropSelectedIds, setLinkPropSelectedIds] = useState<string[]>([])
  const [projectPropOptions, setProjectPropOptions] = useState<Array<{ value: string; label: React.ReactNode; searchLabel: string; disabled?: boolean }>>([])

  const [linkCostumeOpen, setLinkCostumeOpen] = useState(false)
  const [linkCostumeLoading, setLinkCostumeLoading] = useState(false)
  const [linkCostumeSelectedIds, setLinkCostumeSelectedIds] = useState<string[]>([])
  const [projectCostumeOptions, setProjectCostumeOptions] = useState<Array<{ value: string; label: React.ReactNode; searchLabel: string; disabled?: boolean }>>([])
  const [opsTitleDraft, setOpsTitleDraft] = useState('')
  const [opsNoteDraft, setOpsNoteDraft] = useState('')
  const opsTitleSaveTimerRef = useRef<number | null>(null)
  const opsNoteSaveTimerRef = useRef<number | null>(null)
  const [keyframePromptPreviewOpen, setKeyframePromptPreviewOpen] = useState(false)
  const [keyframePromptPreviewLoading, setKeyframePromptPreviewLoading] = useState(false)
  const [keyframePromptActionLoading, setKeyframePromptActionLoading] = useState(false)
  const [keyframePromptPreviewFrameType, setKeyframePromptPreviewFrameType] = useState<PromptFrameType>('key')
  const [keyframePromptDebugContext, setKeyframePromptDebugContext] = useState<ShotFramePromptDebugContext | null>(null)
  const [keyframePromptDebugCollapsed, setKeyframePromptDebugCollapsed] = useState(true)
  const [keyframeDirectiveCollapsed, setKeyframeDirectiveCollapsed] = useState(true)
  const [keyframePromptDecisionCollapsed, setKeyframePromptDecisionCollapsed] = useState(true)
  const [keyframePromptQualityChecks, setKeyframePromptQualityChecks] = useState<ShotFramePromptQualityChecks>(null)
  const [videoPromptPreviewOpen, setVideoPromptPreviewOpen] = useState(false)
  const [videoPromptPreviewLoading, setVideoPromptPreviewLoading] = useState(false)
  const [videoPromptPreviewSubmitting, setVideoPromptPreviewSubmitting] = useState(false)
  const [videoPromptContextCollapsed, setVideoPromptContextCollapsed] = useState(true)
  const resolveVideoRatioForRequest = useCallback(() => {
    const shotRatio = String(shotDetail?.override_video_ratio ?? '').trim()
    const projectRatio = String(projectDefaultVideoRatio ?? '').trim()
    const fallbackRatio = String(capabilityDefaultVideoRatio ?? '').trim()
    return shotRatio || projectRatio || fallbackRatio
  }, [capabilityDefaultVideoRatio, projectDefaultVideoRatio, shotDetail?.override_video_ratio])
  const resolvedKeyframeRatio = resolveVideoRatioForRequest()
  const resolvedKeyframePixelSize = resolveKeyframePixelSize(
    imageGenerationOptions,
    resolvedKeyframeRatio,
    keyframeResolutionProfile,
  )
  const videoPromptDraft = useGenerationDraft<
    { prompt: string },
    { referenceMode: VideoReferenceMode; images: string[] },
    VideoPromptDerived,
    { taskId: string | null }
  >({
    initialBase: { prompt: '' },
    initialContext: { referenceMode: 'text_only', images: [] },
    derive: async ({ base, context }) => {
      if (!selectedShot?.id) {
        throw new Error('shot is required')
      }
      const ratio = resolveVideoRatioForRequest()
      if (!ratio) {
        throw new Error('video ratio is required')
      }
      const res = await FilmService.previewVideoGenerationPromptApiV1FilmTasksVideoPreviewPromptPost({
        requestBody: {
          shot_id: selectedShot.id,
          reference_mode: context.referenceMode,
          prompt: (base.prompt || '').trim() || null,
          images: context.images,
          ratio,
        } as any,
      })
      const data = (res as any)?.data ?? null
      return {
        prompt: typeof data?.prompt === 'string' ? data.prompt : '',
        images: Array.isArray(data?.images) ? (data.images as string[]).filter(Boolean) : [],
        pack: data?.pack ?? null,
      }
    },
    submit: async ({ derived, context }) => {
      if (!selectedShot?.id) {
        throw new Error('shot is required')
      }
      const ratio = resolveVideoRatioForRequest()
      if (!ratio) {
        throw new Error('video ratio is required')
      }
      const created = await FilmService.createVideoGenerationTaskApiV1FilmTasksVideoPost({
        requestBody: {
          shot_id: selectedShot.id,
          reference_mode: context.referenceMode,
          prompt: (derived.prompt || '').trim(),
          images: derived.images,
          ratio,
        } as any,
      })
      return {
        taskId: created.data?.task_id ?? null,
      }
    },
  })
  const videoPromptPreviewDraft = videoPromptDraft.base.prompt
  const videoPromptPreviewImages = videoPromptDraft.context.images
  const videoReferenceMode = videoPromptDraft.context.referenceMode
  const videoPromptPreviewPack = videoPromptDraft.derived?.pack ?? null
  const videoActionBeatPhases = videoPromptPreviewPack?.action_beat_phases ?? []
  const videoActionBeats = videoActionBeatPhases.length > 0
    ? videoActionBeatPhases.map((item) => ({
        text: item.text,
        phase: item.phase,
      }))
    : (videoPromptPreviewPack?.action_beats ?? []).map((text) => ({
        text,
        phase: null,
      }))
  const videoVisibleActionBeats = videoPromptContextCollapsed
    ? videoActionBeats.slice(0, 2)
    : videoActionBeats
  const hiddenVideoActionBeatCount = Math.max(0, videoActionBeats.length - videoVisibleActionBeats.length)
  const [videoTaskPolling, setVideoTaskPolling] = useState(false)
  const [videoTaskStatus, setVideoTaskStatus] = useState<string | null>(null)
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null)
  const [videoTask, setVideoTask] = useState<RelationTaskState | null>(null)
  const [videoSettledTask, setVideoSettledTask] = useState<RelationTaskState | null>(null)
  const [promptTask, setPromptTask] = useState<RelationTaskState | null>(null)
  const [promptSettledTask, setPromptSettledTask] = useState<RelationTaskState | null>(null)
  const [frameImageTask, setFrameImageTask] = useState<RelationTaskState | null>(null)
  const [frameImageSettledTask, setFrameImageSettledTask] = useState<RelationTaskState | null>(null)
  const [generatedVideos, setGeneratedVideos] = useState<Array<{ linkId: number; fileId: string; url: string }>>([])
  const [videoReadiness, setVideoReadiness] = useState<ShotVideoReadinessRead | null>(null)
  const [videoReadinessLoading, setVideoReadinessLoading] = useState(false)
  const [keyframeCards, setKeyframeCards] = useState<Record<PromptFrameType, KeyframeCardState>>({
    first: { loading: false, taskStatus: null, taskId: null, thumbs: [], modalOpen: false, applyingFileId: null },
    key: { loading: false, taskStatus: null, taskId: null, thumbs: [], modalOpen: false, applyingFileId: null },
    last: { loading: false, taskStatus: null, taskId: null, thumbs: [], modalOpen: false, applyingFileId: null },
  })
  const selectedShotSourceLabel = useMemo(() => {
    if (!selectedShot) return 'Studio phân cảnh'
    const shotTitle = selectedShot.title?.trim()
    return shotTitle ? `Phân cảnh: ${shotTitle}` : `Phân cảnh: thứ ${selectedShot.index}`
  }, [selectedShot])
  useRelationTaskNotification({
    task: videoTask,
    settledTask: videoSettledTask,
    title: TASK_COPY.videoGeneration.title,
    sourceLabel: selectedShotSourceLabel,
    runningDescription: TASK_COPY.videoGeneration.runningDescription,
    cancellingDescription: TASK_COPY.videoGeneration.cancellingDescription,
    successDescription: TASK_COPY.videoGeneration.successDescription,
    cancelledDescription: TASK_COPY.videoGeneration.cancelledDescription,
    failedDescription: TASK_COPY.videoGeneration.failedDescription,
    onCancel:
      videoTask?.taskId
        ? () =>
            void executeTaskCancel({
              taskId: videoTask.taskId,
              reason: 'Người dùng hủy tác vụ tạo video trong studio phân cảnh',
              applyCancelData: (data) => {
                setVideoTask((current) => applyTaskCancelState(current, data))
                return null
              },
              cancelledImmediatelyMessage: TASK_COPY.videoGeneration.cancelledImmediatelyMessage,
              cancelRequestedMessage: TASK_COPY.videoGeneration.cancelRequestedMessage,
              fallbackErrorMessage: 'Hủy tác vụ tạo video thất bại',
            })
        : null,
    onNavigate: () => undefined,
  })
  useRelationTaskNotification({
    task: promptTask,
    settledTask: promptSettledTask,
    title: TASK_COPY.shotFramePrompt.title,
    sourceLabel: selectedShotSourceLabel,
    runningDescription: TASK_COPY.shotFramePrompt.runningDescription,
    cancellingDescription: TASK_COPY.shotFramePrompt.cancellingDescription,
    successDescription: TASK_COPY.shotFramePrompt.successDescription,
    cancelledDescription: TASK_COPY.shotFramePrompt.cancelledDescription,
    failedDescription: TASK_COPY.shotFramePrompt.failedDescription,
    onCancel:
      promptTask?.taskId
        ? () =>
            void executeTaskCancel({
              taskId: promptTask.taskId,
              reason: 'Người dùng hủy tác vụ tạo prompt phân cảnh trong studio phân cảnh',
              applyCancelData: (data) => {
                setPromptTask((current) => applyTaskCancelState(current, data))
                return null
              },
              cancelledImmediatelyMessage: TASK_COPY.shotFramePrompt.cancelledImmediatelyMessage,
              cancelRequestedMessage: TASK_COPY.shotFramePrompt.cancelRequestedMessage,
              fallbackErrorMessage: 'Hủy tác vụ tạo prompt phân cảnh thất bại',
            })
        : null,
    onNavigate: () => undefined,
  })
  useRelationTaskNotification({
    task: frameImageTask,
    settledTask: frameImageSettledTask,
    title: TASK_COPY.shotFrameImage.title,
    sourceLabel: selectedShotSourceLabel,
    runningDescription: TASK_COPY.shotFrameImage.runningDescription,
    cancellingDescription: TASK_COPY.shotFrameImage.cancellingDescription,
    successDescription: TASK_COPY.shotFrameImage.successDescription,
    cancelledDescription: TASK_COPY.shotFrameImage.cancelledDescription,
    failedDescription: TASK_COPY.shotFrameImage.failedDescription,
    onCancel:
      frameImageTask?.taskId
        ? () =>
            void executeTaskCancel({
              taskId: frameImageTask.taskId,
              reason: 'Người dùng hủy tác vụ tạo hình ảnh khung hình chính trong studio phân cảnh',
              applyCancelData: (data) => {
                setFrameImageTask((current) => applyTaskCancelState(current, data))
                return null
              },
              cancelledImmediatelyMessage: TASK_COPY.shotFrameImage.cancelledImmediatelyMessage,
              cancelRequestedMessage: TASK_COPY.shotFrameImage.cancelRequestedMessage,
              fallbackErrorMessage: 'Hủy tác vụ tạo ảnh khung hình chính thất bại',
            })
        : null,
    onNavigate: () => undefined,
  })
  const showAvTab = false
  const showGenRefParams = false
  const showGenRefVersions = false

  const getInspectorTabForSelectedShot = useCallback(
    (shot: StudioShot | null): InspectorTabKey => {
      if (!shot) return 'camera'
      if (shot.hasProblem) return 'ops'
      if (!(shot.script_excerpt ?? '').trim() || shot.status !== 'ready') return 'prompt_image'
      if (shot.status === 'ready') return 'gen_ref'
      if (!shot.hasSpeech) return 'dialogue'
      return 'camera'
    },
    [],
  )

  useEffect(() => {
    setInspectorTabKey(getInspectorTabForSelectedShot(selectedShot))
  }, [getInspectorTabForSelectedShot, selectedShot?.id])

  useEffect(() => {
    setHideShot(Boolean(selectedShot?.hidden))
  }, [selectedShot?.hidden])

  useEffect(() => {
    if (!selectedShot?.id) {
      setVideoReadiness(null)
      return
    }
    let canceled = false
    setVideoReadinessLoading(true)
    void (async () => {
      try {
        const res = await StudioShotsService.getShotVideoReadinessApiApiV1StudioShotsShotIdVideoReadinessGet({
          shotId: selectedShot.id,
          referenceMode: videoReferenceMode,
        })
        if (canceled) return
        setVideoReadiness((res.data ?? null) as ShotVideoReadinessRead | null)
      } catch {
        if (canceled) return
        setVideoReadiness(null)
      } finally {
        if (!canceled) setVideoReadinessLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [
    selectedShot?.id,
    selectedShot?.status,
    videoReferenceMode,
    shotDetail?.duration,
    shotDetail?.first_frame_prompt,
    shotDetail?.key_frame_prompt,
    shotDetail?.last_frame_prompt,
    frameImages.map((x) => `${x.id}:${x.file_id ?? ''}`).join('|'),
  ])

  useEffect(() => {
    if (!selectedShot?.id) {
      setGeneratedVideos([])
      return
    }
    let canceled = false
    void (async () => {
      try {
        const links = await listTaskLinksNormalized({
          resourceType: 'video',
          relationType: 'video',
          relationEntityId: selectedShot.id,
          order: 'updated_at',
          isDesc: true,
          page: 1,
          pageSize: 100,
        })
        if (canceled) return
        const seen = new Set<string>()
        const list = links
          .filter((l) => Boolean(l.file_id))
          .map((l) => ({
            linkId: l.id,
            fileId: String(l.file_id),
            url: buildFileDownloadUrl(String(l.file_id)) ?? '',
          }))
          .filter((v) => Boolean(v.url))
          .filter((v) => {
            if (seen.has(v.fileId)) return false
            seen.add(v.fileId)
            return true
          })
        const currentId = selectedShot.generated_video_file_id?.trim() || ''
        if (currentId && !list.some((x) => x.fileId === currentId)) {
          const currentUrl = buildFileDownloadUrl(currentId) ?? ''
          if (currentUrl) list.unshift({ linkId: -1, fileId: currentId, url: currentUrl })
        }
        setGeneratedVideos(list)
      } catch {
        if (!canceled) setGeneratedVideos([])
      }
    })()
    return () => {
      canceled = true
    }
  }, [selectedShot?.id, selectedShot?.generated_video_file_id, videoTaskStatus, videoTaskPolling])

  useEffect(() => {
    setOpsTitleDraft(selectedShot?.title ?? '')
    setOpsNoteDraft(selectedShot?.script_excerpt ?? '')
    if (opsTitleSaveTimerRef.current) window.clearTimeout(opsTitleSaveTimerRef.current)
    if (opsNoteSaveTimerRef.current) window.clearTimeout(opsNoteSaveTimerRef.current)
    opsTitleSaveTimerRef.current = null
    opsNoteSaveTimerRef.current = null
  }, [selectedShot?.id])

  useEffect(() => {
    if (!selectedShot?.id) return
    if (opsTitleDraft === (selectedShot.title ?? '')) return

    if (opsTitleSaveTimerRef.current) window.clearTimeout(opsTitleSaveTimerRef.current)
    opsTitleSaveTimerRef.current = window.setTimeout(() => {
      void onUpdateShotTitle(selectedShot.id, opsTitleDraft)
      opsTitleSaveTimerRef.current = null
    }, 500)

    return () => {
      if (opsTitleSaveTimerRef.current) window.clearTimeout(opsTitleSaveTimerRef.current)
      opsTitleSaveTimerRef.current = null
    }
  }, [opsTitleDraft, selectedShot?.id, selectedShot?.title, onUpdateShotTitle])

  useEffect(() => {
    if (!selectedShot?.id) return
    if (opsNoteDraft === (selectedShot.script_excerpt ?? '')) return

    if (opsNoteSaveTimerRef.current) window.clearTimeout(opsNoteSaveTimerRef.current)
    opsNoteSaveTimerRef.current = window.setTimeout(() => {
      void onUpdateShotScriptExcerpt(selectedShot.id, opsNoteDraft)
      opsNoteSaveTimerRef.current = null
    }, 500)

    return () => {
      if (opsNoteSaveTimerRef.current) window.clearTimeout(opsNoteSaveTimerRef.current)
      opsNoteSaveTimerRef.current = null
    }
  }, [opsNoteDraft, selectedShot?.id, selectedShot?.script_excerpt, onUpdateShotScriptExcerpt])

  const flushOpsTitle = async () => {
    if (!selectedShot?.id) return
    if (opsTitleSaveTimerRef.current) window.clearTimeout(opsTitleSaveTimerRef.current)
    opsTitleSaveTimerRef.current = null
    if (opsTitleDraft === (selectedShot.title ?? '')) return
    await onUpdateShotTitle(selectedShot.id, opsTitleDraft)
  }

  const flushOpsNote = async () => {
    if (!selectedShot?.id) return
    if (opsNoteSaveTimerRef.current) window.clearTimeout(opsNoteSaveTimerRef.current)
    opsNoteSaveTimerRef.current = null
    if (opsNoteDraft === (selectedShot.script_excerpt ?? '')) return
    await onUpdateShotScriptExcerpt(selectedShot.id, opsNoteDraft)
  }

  const sceneIds = useMemo(() => Array.from(new Set(sceneLinks.map((x) => x.scene_id).filter(Boolean))), [sceneLinks])
  const characterIds = useMemo(() => Array.from(new Set(shotCharacterLinks.map((x) => x.character_id).filter(Boolean))), [shotCharacterLinks])

  const linkedCharacterIds = useMemo(() => characterIds, [characterIds])
  const linkedSceneId = useMemo(() => {
    if (!selectedShot?.id) return null
    return sceneLinks.find((l) => (l.shot_id ?? null) === selectedShot.id)?.scene_id ?? shotDetail?.scene_id ?? null
  }, [sceneLinks, selectedShot?.id, shotDetail?.scene_id])
  const linkedPropIds = useMemo(() => {
    if (!selectedShot?.id) return []
    return Array.from(new Set(propLinks.filter((l) => (l.shot_id ?? null) === selectedShot.id).map((l) => l.prop_id).filter(Boolean))) as string[]
  }, [propLinks, selectedShot?.id])
  const linkedCostumeIds = useMemo(() => {
    if (!selectedShot?.id) return []
    return Array.from(new Set(costumeLinks.filter((l) => (l.shot_id ?? null) === selectedShot.id).map((l) => l.costume_id).filter(Boolean))) as string[]
  }, [costumeLinks, selectedShot?.id])

  useEffect(() => {
    if (!selectedShot?.id) {
      setShotLinkedAssets([])
      return
    }
    let canceled = false
    void (async () => {
      try {
        const res = await StudioShotsService.listShotLinkedAssetsApiV1StudioShotsShotIdLinkedAssetsGet({
          shotId: selectedShot.id,
          page: 1,
          pageSize: 100,
        })
        if (canceled) return
        const items = (res.data?.items ?? []) as any[]
        setShotLinkedAssets(
          items
            .filter((x) => x && typeof x.type === 'string' && typeof x.id === 'string')
            .map((x) => ({
              type: String(x.type),
              id: String(x.id),
              name: typeof x.name === 'string' ? x.name : undefined,
              image_id: typeof x.image_id === 'number' ? x.image_id : x.image_id === null ? null : undefined,
              thumbnail: typeof x.thumbnail === 'string' && x.thumbnail.trim() ? x.thumbnail.trim() : undefined,
            })),
        )
      } catch {
        if (!canceled) setShotLinkedAssets([])
      }
    })()
    return () => {
      canceled = true
    }
  }, [selectedShot?.id])

  const loadShotAssetsOverview = useCallback(
    async (shotId: string) => {
      const reqSeq = ++shotAssetsOverviewRequestSeqRef.current
      try {
        const res = await StudioShotsService.getShotAssetsOverviewApiApiV1StudioShotsShotIdAssetsOverviewGet({
          shotId,
        })
        if (reqSeq !== shotAssetsOverviewRequestSeqRef.current) return
        setShotAssetsOverview(res.data ?? null)
      } catch {
        if (reqSeq !== shotAssetsOverviewRequestSeqRef.current) return
        setShotAssetsOverview(null)
      }
    },
    [],
  )

  useEffect(() => {
    if (!selectedShot?.id) {
      shotAssetsOverviewRequestSeqRef.current += 1
      setShotAssetsOverview(null)
      return
    }
    void loadShotAssetsOverview(selectedShot.id)
  }, [loadShotAssetsOverview, selectedShot?.id, shotCandidateItems])

  useEffect(() => {
    if (!selectedShot?.id) {
      setShotExtractStatus({ source: 'idle', updatedAt: null, message: '' })
      return
    }
    setShotExtractStatus({
      source: 'idle',
      updatedAt: null,
      message: 'Ứng viên chờ xác nhận vui lòng sang trang chỉnh sửa phân cảnh để trích xuất hoặc làm mới.',
    })
  }, [
    selectedShot?.id,
  ])

  const linkedAssetThumbByKey = useMemo(() => {
    const map = new Map<string, string>()
    shotLinkedAssets.forEach((it) => {
      if (!it.thumbnail) return
      map.set(`${it.type}:${it.id}`, it.thumbnail)
    })
    return map
  }, [shotLinkedAssets])

  const promptAssetReadiness = useMemo(() => {
    if (selectedShot?.skip_extraction) {
      return {
        checks: [] as Array<{
          key: 'characters' | 'scene' | 'props' | 'costumes'
          label: string
          importance: string
          entries: Array<{ id: number; name: string; status: ShotExtractedCandidateRead['candidate_status'] }>
          missing: string[]
          expectedCount: number
          actualCount: number
          ignoredCount: number
          resolvedCount: number
          ready: boolean
        }>,
        expectedChecks: [] as Array<{
          key: 'characters' | 'scene' | 'props' | 'costumes'
          label: string
          importance: string
          entries: Array<{ id: number; name: string; status: ShotExtractedCandidateRead['candidate_status'] }>
          missing: string[]
          expectedCount: number
          actualCount: number
          ignoredCount: number
          resolvedCount: number
          ready: boolean
        }>,
        readyCount: 1,
        totalCount: 1,
        percent: 100,
        hasMissing: false,
      }
    }
    const overviewItems = shotAssetsOverview?.items ?? []
    const bucket = (type: 'character' | 'scene' | 'prop' | 'costume') =>
      overviewItems.filter((item) => item.type === type)

    const checks = [
      {
        key: 'characters' as const,
        label: 'Nhân vật',
        importance: 'Ảnh hưởng tính nhất quán nhân vật, ảnh tham chiếu khung hình chính và mô tả chủ thể hình ảnh.',
        candidates: bucket('character'),
      },
      {
        key: 'scene' as const,
        label: 'Bối cảnh',
        importance: 'Ảnh hưởng mô tả bối cảnh phân cảnh, prompt video và tính liên tục không gian tổng thể.',
        candidates: bucket('scene'),
      },
      {
        key: 'props' as const,
        label: 'Đạo cụ',
        importance: 'Ảnh hưởng chi tiết hành động chính, thiếu dễ khiến yếu tố kể chuyện trong hình không đầy đủ.',
        candidates: bucket('prop'),
      },
      {
        key: 'costumes' as const,
        label: 'Trang phục',
        importance: 'ảnh hưởng tính liên tục ngoại hình nhân vật, đặc biệt rõ ở nhiều shot hoặc sinh nhiều phiên bản.',
        candidates: bucket('costume'),
      },
    ].map((item) => {
      const entries = item.candidates.map((candidate) => ({
        id: candidate.candidate_id ?? -1,
        name: candidate.name,
        status: candidate.candidate_status ?? (candidate.is_linked ? 'linked' : 'pending'),
      }))
      const pending = entries.filter((entry) => entry.status === 'pending')
      const linked = entries.filter((entry) => entry.status === 'linked')
      const ignored = entries.filter((entry) => entry.status === 'ignored')
      return {
        ...item,
        entries,
        missing: pending.map((entry) => entry.name),
        expectedCount: entries.length,
        actualCount: linked.length,
        ignoredCount: ignored.length,
        resolvedCount: linked.length + ignored.length,
        ready: entries.length === 0 || pending.length === 0,
      }
    })

    const expectedChecks = checks.filter((item) => item.expectedCount > 0)
    const readyCount = expectedChecks.filter((item) => item.ready).length
    return {
      checks,
      expectedChecks,
      readyCount,
      totalCount: expectedChecks.length,
      percent: expectedChecks.length === 0 ? 100 : Math.round((readyCount / expectedChecks.length) * 100),
      hasMissing: expectedChecks.some((item) => item.missing.length > 0),
    }
  }, [selectedShot?.skip_extraction, shotAssetsOverview?.items])

  useEffect(() => {
    if (!projectId || !selectedShot?.id) {
      setReadinessExistenceMap({})
      return
    }

    const overviewItems = shotAssetsOverview?.items ?? []
    const characterNames = uniqueNames(
      overviewItems.filter((item) => item.type === 'character' && item.candidate_status === 'pending').map((item) => item.name),
    )
    const sceneNames = uniqueNames(
      overviewItems.filter((item) => item.type === 'scene' && item.candidate_status === 'pending').map((item) => item.name),
    )
    const propNames = uniqueNames(
      overviewItems.filter((item) => item.type === 'prop' && item.candidate_status === 'pending').map((item) => item.name),
    )
    const costumeNames = uniqueNames(
      overviewItems.filter((item) => item.type === 'costume' && item.candidate_status === 'pending').map((item) => item.name),
    )

    if (characterNames.length === 0 && sceneNames.length === 0 && propNames.length === 0 && costumeNames.length === 0) {
      setReadinessExistenceMap({})
      return
    }

    let cancelled = false
    setReadinessExistenceLoading(true)
    void (async () => {
      try {
        const res = await StudioEntitiesService.checkEntityNamesExistenceApiV1StudioEntitiesExistenceCheckPost({
          requestBody: {
            project_id: projectId,
            shot_id: selectedShot.id,
            character_names: characterNames,
            scene_names: sceneNames,
            prop_names: propNames,
            costume_names: costumeNames,
          },
        })
        if (cancelled) return
        const data = res.data
        const next: Record<string, EntityNameExistenceItem> = {}
        ;(data?.characters ?? []).forEach((item) => {
          next[`characters:${normalizeAssetName(item.name)}`] = item
        })
        ;(data?.scenes ?? []).forEach((item) => {
          next[`scene:${normalizeAssetName(item.name)}`] = item
        })
        ;(data?.props ?? []).forEach((item) => {
          next[`props:${normalizeAssetName(item.name)}`] = item
        })
        ;(data?.costumes ?? []).forEach((item) => {
          next[`costumes:${normalizeAssetName(item.name)}`] = item
        })
        setReadinessExistenceMap(next)
      } catch {
        if (!cancelled) setReadinessExistenceMap({})
      } finally {
        if (!cancelled) setReadinessExistenceLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    projectId,
    selectedShot?.id,
    shotAssetsOverview?.items,
  ])

  const getReadinessExistenceLabel = useCallback((checkKey: 'characters' | 'scene' | 'props' | 'costumes', name: string) => {
    const item = readinessExistenceMap[`${checkKey}:${normalizeAssetName(name)}`]
    if (!item) {
      return readinessExistenceLoading ? 'đang kiểm tra' : null
    }
    if (!item.exists) return 'Cần tạo mới'
    if (item.linked_to_project && !item.linked_to_shot) return 'Có thể liên kết trong dự án'
    if (!item.linked_to_project) return 'thư viện tài nguyên đã có'
    if (item.linked_to_shot) return 'Đã liên kết'
    return null
  }, [readinessExistenceLoading, readinessExistenceMap])


  const promptAssetReadinessNote = useMemo(() => {
    if (!selectedShot) return 'Vui lòng chọn một phân cảnh trước.'
    if (selectedShot.skip_extraction) return 'Phân cảnh này đã được đánh dấu rõ là không cần trích xuất, hệ thống sẽ xử lý trực tiếp theo "xác nhận trích xuất đã hoàn tất".'
    if (!shotAssetsOverview) return 'Chưa nhận được tổng quan tài nguyên của phân cảnh này, tạm thời không thể hiển thị trạng thái xác nhận ứng viên.'
    return 'Trang này đóng vai trò bảng chẩn đoán trước khi tạo, ưu tiên hiển thị trạng thái xác nhận thông tin của phân cảnh hiện tại dựa theo assets-overview phía sau; trích xuất, làm mới và xác nhận chi tiết đều xử lý thống nhất trên trang chỉnh sửa phân cảnh.'
  }, [selectedShot, shotAssetsOverview])

  const shotExtractStatusText = useMemo(() => {
    if (!shotExtractStatus.message) return ''
    if (!shotExtractStatus.updatedAt) return shotExtractStatus.message
    const time = new Date(shotExtractStatus.updatedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return `${shotExtractStatus.message} · ${time}`
  }, [shotExtractStatus])

  const goToShotEditForAssets = useCallback(() => {
    if (!projectId || !currentChapterId || !selectedShot?.id) return
    window.location.assign(`/projects/${projectId}/chapters/${currentChapterId}/shots/${selectedShot.id}/edit`)
  }, [currentChapterId, projectId, selectedShot?.id])

  const extractFileIdFromThumbnail = useCallback((thumbnail?: string | null): string | null => {
    const v = (thumbnail || '').trim()
    if (!v) return null
    // Chỉ file_id: không chứa đường dẫn hoặc giao thức
    if (!v.includes('/') && !v.includes(':')) return v
    try {
      const url = new URL(v, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      const m = url.pathname.match(/\/api\/v1\/studio\/files\/([^/]+)\/download\/?$/)
      if (m?.[1]) return decodeURIComponent(m[1])
    } catch {
      // ignore
    }
    return null
  }, [])

  const shotLinkedAssetNameByFileId = useMemo(() => {
    const map = new Map<string, string>()
    shotLinkedAssets.forEach((it: any) => {
      const fid =
        (typeof it?.file_id === 'string' && it.file_id.trim() ? it.file_id.trim() : null) ??
        extractFileIdFromThumbnail(it?.thumbnail ?? null)
      if (!fid) return
      const name = typeof it?.name === 'string' && it.name.trim() ? it.name.trim() : String(it?.id ?? '')
      if (!name) return
      map.set(fid, name)
    })
    return map
  }, [extractFileIdFromThumbnail, shotLinkedAssets])

  const deriveKeyframePromptPreview = useCallback(
    async ({
      base,
      context,
    }: {
      base: { frameType: PromptFrameType; prompt: string }
      context: { refFileIds: string[] }
    }): Promise<FramePromptDerived> => {
      if (!selectedShot?.id) {
        throw new Error('shot is required')
      }
      const basePrompt = (base.prompt || '').trim()
      const refFileIds = (context.refFileIds || []).filter(Boolean)
      if (!basePrompt) {
        return {
          basePrompt: '',
          renderedPrompt: '',
          selectedGuidance: [],
          droppedGuidance: [],
          selectedGuidanceDetails: [],
          droppedGuidanceDetails: [],
          images: [],
          mappings: [],
        }
      }

      const imagesPayload = refFileIds
        .map((fid) => {
          const match =
            shotLinkedAssets.find((x) => extractFileIdFromThumbnail(x.thumbnail ?? null) === fid) ??
            shotLinkedAssets.find((x) => (x as any)?.file_id === fid)
          return match
            ? {
                type: match.type as any,
                id: match.id,
                name: match.name ?? match.id,
                file_id: fid,
              }
            : null
        })
        .filter(Boolean)

      const rendered = await StudioImageTasksService.renderShotFramePromptApiV1StudioImageTasksShotShotIdFrameRenderPromptPost({
        shotId: selectedShot.id,
        requestBody: {
          frame_type: base.frameType,
          prompt: basePrompt,
          images: imagesPayload as any,
        } as any,
      })
      const d = rendered.data as any
      return {
        basePrompt: typeof d?.base_prompt === 'string' ? d.base_prompt : basePrompt,
        renderedPrompt: typeof d?.rendered_prompt === 'string' ? d.rendered_prompt : '',
        selectedGuidance: Array.isArray(d?.selected_guidance)
          ? d.selected_guidance.map((item: unknown) => String(item ?? '').trim()).filter(Boolean)
          : [],
        droppedGuidance: Array.isArray(d?.dropped_guidance)
          ? d.dropped_guidance.map((item: unknown) => String(item ?? '').trim()).filter(Boolean)
          : [],
        selectedGuidanceDetails: Array.isArray(d?.selected_guidance_details)
          ? d.selected_guidance_details
            .map((item: any) => ({
              text: String(item?.text ?? '').trim(),
              category: String(item?.category ?? '').trim(),
              reasonTag: String(item?.reason_tag ?? '').trim(),
              reason: String(item?.reason ?? '').trim(),
            }))
            .filter((item: { text: string }) => item.text)
          : [],
        droppedGuidanceDetails: Array.isArray(d?.dropped_guidance_details)
          ? d.dropped_guidance_details
            .map((item: any) => ({
              text: String(item?.text ?? '').trim(),
              category: String(item?.category ?? '').trim(),
              reasonTag: String(item?.reason_tag ?? '').trim(),
              reason: String(item?.reason ?? '').trim(),
            }))
            .filter((item: { text: string }) => item.text)
          : [],
        images: Array.isArray(d?.images) ? (d.images as string[]).filter(Boolean) : [],
        mappings: Array.isArray(d?.mappings) ? (d.mappings as ShotFramePromptMappingRead[]) : [],
      }
    },
    [extractFileIdFromThumbnail, selectedShot?.id, shotLinkedAssets],
  )

  const keyframePromptDraft = useGenerationDraft<
    { frameType: PromptFrameType; prompt: string },
    { refFileIds: string[] },
    FramePromptDerived,
    { taskId: string | null }
  >({
    initialBase: { frameType: 'key', prompt: '' },
    initialContext: { refFileIds: [] },
    derive: deriveKeyframePromptPreview,
    submit: async ({ base, context, derived }) => {
      if (!selectedShot?.id) {
        throw new Error('shot is required')
      }
      const resolvedItems =
        derived.mappings.length > 0
          ? derived.mappings.map((mapping) => ({
              type: mapping.type,
              id: mapping.id,
              name: mapping.name,
              file_id: mapping.file_id,
            }))
          : (context.refFileIds || []).map((fid) => {
              const match =
                shotLinkedAssets.find((x) => extractFileIdFromThumbnail(x.thumbnail ?? null) === fid) ??
                shotLinkedAssets.find((x) => (x as any)?.file_id === fid)
              return {
                type: (match?.type as any) ?? 'character',
                id: match?.id ?? fid,
                name: match?.name ?? match?.id ?? fid,
                file_id: fid,
              }
            })

      const ratio = resolveVideoRatioForRequest()
      if (!ratio) {
        throw new Error('video ratio is required')
      }
      const created = await StudioImageTasksService.createShotFrameImageGenerationTaskApiV1StudioImageTasksShotShotIdFrameImageTasksPost({
        shotId: selectedShot.id,
        requestBody: {
          frame_type: base.frameType,
          model_id: null,
          prompt: (base.prompt || '').trim(),
          images: resolvedItems as any,
          target_ratio: ratio,
          resolution_profile: keyframeResolutionProfile,
        } as any,
      })
      return {
        taskId: created.data?.task_id ?? null,
      }
    },
  })
  const keyframePromptPreviewDraft = keyframePromptDraft.base.prompt
  const keyframePromptRenderedDraft = keyframePromptDraft.derived?.renderedPrompt ?? ''
  const keyframePromptSelectedGuidance = keyframePromptDraft.derived?.selectedGuidance ?? []
  const keyframePromptDroppedGuidance = keyframePromptDraft.derived?.droppedGuidance ?? []
  const keyframePromptSelectedGuidanceDetails = keyframePromptDraft.derived?.selectedGuidanceDetails ?? []
  const keyframePromptDroppedGuidanceDetails = keyframePromptDraft.derived?.droppedGuidanceDetails ?? []
  const keyframePromptVisibleSelectedGuidanceDetails = keyframePromptDecisionCollapsed
    ? keyframePromptSelectedGuidanceDetails.slice(0, 2)
    : keyframePromptSelectedGuidanceDetails
  const keyframePromptVisibleDroppedGuidanceDetails = keyframePromptDecisionCollapsed
    ? keyframePromptDroppedGuidanceDetails.slice(0, 1)
    : keyframePromptDroppedGuidanceDetails
  const keyframePromptRenderMappings = keyframePromptDraft.derived?.mappings ?? []
  const keyframePromptPreviewRefFileIds = keyframePromptDraft.context.refFileIds
  const keyframePromptRenderState = keyframePromptDraft.state
  const renderShotPromptToTextarea = useCallback(
    async (opts?: { frameType?: PromptFrameType; prompt?: string; refFileIds?: string[]; showPreviewLoading?: boolean }) => {
      if (!selectedShot?.id) return
      const frameType = opts?.frameType ?? keyframePromptPreviewFrameType
      const basePrompt = (typeof opts?.prompt === 'string' ? opts.prompt : keyframePromptPreviewDraft || '').trim()
      const refFileIds = (opts?.refFileIds ?? keyframePromptPreviewRefFileIds ?? []).filter(Boolean)
      const nextBase = { frameType, prompt: basePrompt }
      const nextContext = { refFileIds }
      keyframePromptDraft.hydrate({
        base: nextBase,
        context: nextContext,
        state: basePrompt ? 'draft_changed' : 'idle',
      })
      if (!basePrompt) {
        return
      }
      setShotRenderPromptLoading(true)
      if (opts?.showPreviewLoading) {
        setKeyframePromptPreviewLoading(true)
      }
      try {
        const derived = await keyframePromptDraft.deriveNow({ base: nextBase, context: nextContext })
        if (derived?.images?.length) {
          keyframePromptDraft.hydrate({
            base: nextBase,
            context: { refFileIds: derived.images },
            derived: {
              ...derived,
              images: derived.images,
            },
          })
        }
      } catch {
        keyframePromptDraft.setState('error')
      } finally {
        if (opts?.showPreviewLoading) {
          setKeyframePromptPreviewLoading(false)
        }
        setShotRenderPromptLoading(false)
      }
    },
    [
      keyframePromptDraft,
      keyframeResolutionProfile,
      keyframePromptPreviewDraft,
      keyframePromptPreviewFrameType,
      keyframePromptPreviewRefFileIds,
      selectedShot?.id,
    ],
  )

  const orderedLinkedCharacterIds = useMemo(() => {
    return shotCharacterLinks
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((x) => x.character_id)
      .filter(Boolean)
      .map((x) => String(x))
  }, [shotCharacterLinks])

  const autoKeyframeRefFileIds = useMemo(() => {
    const out: string[] = []
    const push = (fid: string | null) => {
      if (!fid) return
      if (out.includes(fid)) return
      out.push(fid)
    }
    // Nhân vật (theo thứ tự index)
    orderedLinkedCharacterIds.forEach((cid) =>
      push(extractFileIdFromThumbnail(linkedAssetThumbByKey.get(`character:${cid}`) ?? null)),
    )
    // Bối cảnh (riêng lẻ)
    if (linkedSceneId) push(extractFileIdFromThumbnail(linkedAssetThumbByKey.get(`scene:${linkedSceneId}`) ?? null))
    // Đạo cụ
    linkedPropIds.forEach((pid) => push(extractFileIdFromThumbnail(linkedAssetThumbByKey.get(`prop:${pid}`) ?? null)))
    // Trang phục
    linkedCostumeIds.forEach((cid) =>
      push(extractFileIdFromThumbnail(linkedAssetThumbByKey.get(`costume:${cid}`) ?? null)),
    )
    return out
  }, [
    extractFileIdFromThumbnail,
    linkedCostumeIds,
    linkedPropIds,
    linkedSceneId,
    linkedAssetThumbByKey,
    orderedLinkedCharacterIds,
  ])

  const moveKeyframePromptRefFile = useCallback((fromIndex: number, toIndex: number) => {
    const current = keyframePromptPreviewRefFileIds
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) return
    const next = reorder(current, fromIndex, toIndex)
    keyframePromptDraft.setContext({ refFileIds: next })
  }, [keyframePromptDraft, keyframePromptPreviewRefFileIds])

  const loadProjectRoleOptions = async () => {
    if (!projectId) {
      setProjectRoleOptions([])
      return
    }
    setLinkRoleLoading(true)
    try {
      const res = await StudioEntitiesApi.list('character', { page: 1, pageSize: 20, q: null })
      const items = (res.data?.items ?? []).filter((x: any) => x?.project_id === projectId)
      const opts = items.map((c: any) => {
        const id = String(c?.id ?? '')
        const name = String(c?.name ?? id)
        const thumb = typeof c?.thumbnail === 'string' ? c.thumbnail : ''
        const disabled = linkedCharacterIds.includes(id)
        return {
          value: id,
          searchLabel: name,
          disabled,
          label: (
            <div className="flex items-center gap-2 min-w-0">
              {thumb ? (
                <img src={resolveAssetUrl(thumb)} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                  <UserOutlined />
                </div>
              )}
              <div className="min-w-0 truncate">{name}</div>
            </div>
          ),
        }
      })
      setProjectRoleOptions(opts)
    } catch {
      setProjectRoleOptions([])
    } finally {
      setLinkRoleLoading(false)
    }
  }

  const loadProjectAssetOptions = async (kind: 'scene' | 'prop' | 'costume') => {
    if (!projectId) return
    if (kind === 'scene') setLinkSceneLoading(true)
    if (kind === 'prop') setLinkPropLoading(true)
    if (kind === 'costume') setLinkCostumeLoading(true)
    try {
      const res = await StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
        entityType: kind,
        projectId,
        chapterId: null,
        shotId: null,
        assetId: null,
        order: null,
        isDesc: false,
        page: 1,
        pageSize: 20,
      })
      const items = (res.data?.items ?? []) as any[]
      const ids = Array.from(
        new Set(
          items
            .map((it) => (kind === 'scene' ? it.scene_id : kind === 'prop' ? it.prop_id : it.costume_id))
            .filter(Boolean)
            .map((x) => String(x)),
        ),
      )
      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await StudioEntitiesApi.get(kind as any, id)
            const d = (r.data ?? null) as any
            return { id, name: String(d?.name ?? id), thumb: typeof d?.thumbnail === 'string' ? d.thumbnail : '' }
          } catch {
            return { id, name: id, thumb: '' }
          }
        }),
      )
      const nextThumbMap: Record<string, string> = {}
      details.forEach((d) => {
        if (d.thumb) nextThumbMap[d.id] = d.thumb
      })

      const makeLabel = (d: { id: string; name: string; thumb: string }) => (
        <div className="flex items-center gap-2 min-w-0">
          {d.thumb ? (
            <img src={resolveAssetUrl(d.thumb)} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
              <UserOutlined />
            </div>
          )}
          <div className="min-w-0 truncate">{d.name}</div>
        </div>
      )

      if (kind === 'scene') {
        setProjectSceneOptions(details.map((d) => ({ value: d.id, searchLabel: d.name, label: makeLabel(d) })))
      } else if (kind === 'prop') {
        setProjectPropOptions(
          details.map((d) => ({ value: d.id, searchLabel: d.name, label: makeLabel(d), disabled: linkedPropIds.includes(d.id) })),
        )
      } else {
        setProjectCostumeOptions(
          details.map((d) => ({ value: d.id, searchLabel: d.name, label: makeLabel(d), disabled: linkedCostumeIds.includes(d.id) })),
        )
      }
    } finally {
      if (kind === 'scene') setLinkSceneLoading(false)
      if (kind === 'prop') setLinkPropLoading(false)
      if (kind === 'costume') setLinkCostumeLoading(false)
    }
  }

  const openReadinessLinker = useCallback(
    async (kind: 'characters' | 'scene' | 'props' | 'costumes') => {
      if (!selectedShot?.id) return
      if (kind === 'characters') {
        setInspectorTabKey('keyframe_gen')
        setLinkRoleSelectedIds([])
        setLinkRoleOpen(true)
        await loadProjectRoleOptions()
        return
      }
      if (kind === 'scene') {
        setInspectorTabKey('keyframe_gen')
        setLinkSceneOpen(true)
        await loadProjectAssetOptions('scene')
        return
      }
      if (kind === 'props') {
        setInspectorTabKey('keyframe_gen')
        setLinkPropSelectedIds([])
        setLinkPropOpen(true)
        await loadProjectAssetOptions('prop')
        return
      }
      setInspectorTabKey('keyframe_gen')
      setLinkCostumeSelectedIds([])
      setLinkCostumeOpen(true)
      await loadProjectAssetOptions('costume')
    },
    [loadProjectAssetOptions, loadProjectRoleOptions, selectedShot?.id],
  )

  const openReadinessCreate = useCallback((kind: 'characters' | 'scene' | 'props' | 'costumes', name: string) => {
    if (!projectId || !selectedShot?.id) return
    const currentShotId = selectedShot.id
    const styleQ =
      `&visualStyle=${encodeURIComponent(projectVisualStyle)}` +
      `&style=${encodeURIComponent(projectStyle)}`
    const ctxQ =
      `&projectId=${encodeURIComponent(projectId)}` +
      `&chapterId=${encodeURIComponent(currentChapterId ?? '')}` +
      `&shotId=${encodeURIComponent(currentShotId)}` +
      styleQ
    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
    if (kind === 'characters') {
      open(`/projects/${encodeURIComponent(projectId)}?tab=roles&create=1&name=${encodeURIComponent(name)}${ctxQ}`)
      return
    }
    const tab = kind === 'scene' ? 'scene' : kind === 'props' ? 'prop' : 'costume'
    open(`/assets?tab=${tab}&create=1&name=${encodeURIComponent(name)}${ctxQ}`)
  }, [currentChapterId, projectId, projectStyle, projectVisualStyle, selectedShot?.id])

  const handleReadinessMissingAction = useCallback(async (kind: 'characters' | 'scene' | 'props' | 'costumes', name: string) => {
    const item = readinessExistenceMap[`${kind}:${normalizeAssetName(name)}`]
    if (item && !item.exists) {
      openReadinessCreate(kind, name)
      return
    }
    await openReadinessLinker(kind)
  }, [openReadinessCreate, openReadinessLinker, readinessExistenceMap])

  useEffect(() => {
    if (sceneIds.length === 0) {
      setSceneNameMap({})
      return
    }
    void (async () => {
      const entries = await Promise.all(
        sceneIds.map(async (id) => {
          try {
            const r = await StudioEntitiesApi.get('scene', id)
            const d = r.data as { name?: string } | null | undefined
            return [id, d?.name?.trim() || id] as const
          } catch {
            return [id, id] as const
          }
        }),
      )
      setSceneNameMap(Object.fromEntries(entries))
    })()
  }, [sceneIds])

  useEffect(() => {
    if (characterIds.length === 0) {
      setCharacterNameMap({})
      return
    }
    void (async () => {
      const entries = await Promise.all(
        characterIds.map(async (id) => {
          try {
            const r = await StudioEntitiesApi.get('character', id)
            const d = r.data as { name?: string; thumbnail?: string | null } | null | undefined
            const name = d?.name?.trim() || id
            const thumb = typeof d?.thumbnail === 'string' && d.thumbnail.trim() ? d.thumbnail.trim() : ''
            return { id, name, thumb }
          } catch {
            return { id, name: id, thumb: '' }
          }
        }),
      )
      const nextNameMap: Record<string, string> = {}
      entries.forEach((e) => {
        nextNameMap[e.id] = e.name
      })
      setCharacterNameMap(nextNameMap)
    })()
  }, [characterIds])

  const getPromptFromDetailByType = (frameType: PromptFrameType): string => {
    if (!shotDetail) return ''
    if (frameType === 'first') return shotDetail.first_frame_prompt ?? ''
    if (frameType === 'last') return shotDetail.last_frame_prompt ?? ''
    return shotDetail.key_frame_prompt ?? ''
  }

  const frameLabel: Record<PromptFrameType, string> = { first: 'Khung hình đầu', key: 'Khung hình chính', last: 'Khung hình cuối' }

  const handleRefFrameTypeDropdownVisibleChange = useCallback(
    async (open: boolean) => {
      if (!open || !onRefreshShotFrameImages) return
      setRefFrameTypeSelectLoading(true)
      try {
        await onRefreshShotFrameImages()
      } finally {
        setRefFrameTypeSelectLoading(false)
      }
    },
    [onRefreshShotFrameImages],
  )

  const refFrameTypeOptions = useMemo(() => {
    const kinds = new Set((frameImages ?? []).map((x) => x.frame_type))
    const opts: Array<{ value: string; label: string }> = []
    if (kinds.has('first')) opts.push({ value: 'first', label: 'Khung hình đầu' })
    if (kinds.has('last')) opts.push({ value: 'last', label: 'Khung hình cuối' })
    if (kinds.has('first') && kinds.has('last')) opts.push({ value: 'first_last', label: 'Khung đầu & cuối' })
    if (kinds.has('key')) opts.push({ value: 'key', label: 'Khung hình chính' })
    return opts
  }, [frameImages])

  useEffect(() => {
    const allowed = new Set(refFrameTypeOptions.map((x) => x.value))
    setRefImageType((prev) => (prev && allowed.has(prev) ? prev : undefined))
  }, [refFrameTypeOptions])

  const buildVideoRefSelection = () => {
    const first = frameImages.find((x) => x.frame_type === 'first')?.file_id ?? null
    const last = frameImages.find((x) => x.frame_type === 'last')?.file_id ?? null
    const key = frameImages.find((x) => x.frame_type === 'key')?.file_id ?? null

    const s = refImageType
    if (s === 'first_last') {
      return {
        referenceMode: 'first_last' as const,
        images: [first, last].filter((x): x is string => Boolean(x)),
      }
    }
    if (s === 'key') return { referenceMode: 'key' as const, images: key ? [key] : [] }
    if (s === 'first') return { referenceMode: 'first' as const, images: first ? [first] : [] }
    if (s === 'last') return { referenceMode: 'last' as const, images: last ? [last] : [] }
    return { referenceMode: 'text_only' as const, images: [] }
  }

  const openVideoPromptPreview = async () => {
    if (!selectedShot?.id) {
      message.warning('Vui lòng chọn một phân cảnh trước')
      return
    }
    const { referenceMode, images } = buildVideoRefSelection()
    const nextContext = { referenceMode, images }
    videoPromptDraft.hydrate({
      base: { prompt: '' },
      context: nextContext,
    })
    setVideoPromptContextCollapsed(true)
    setVideoPromptPreviewOpen(true)
    setVideoPromptPreviewLoading(true)
    try {
      const derived = await videoPromptDraft.deriveNow({
        base: { prompt: '' },
        context: nextContext,
      })
      if (derived) {
        videoPromptDraft.hydrate({
          base: { prompt: derived.prompt },
          context: {
            referenceMode,
            images: derived.images,
          },
          derived,
        })
      }
    } catch {
      message.error('Lấy preview prompt video thất bại')
    } finally {
      setVideoPromptPreviewLoading(false)
    }
  }

  const submitVideoGeneration = async () => {
    if (!selectedShot?.id) {
      message.warning('Vui lòng chọn một phân cảnh trước')
      return
    }
    if (!resolveVideoRatioForRequest()) {
      message.warning('shot hiện tại thiếu tỷ lệ video, vui lòng đặt tỷ lệ mặc định của dự án hoặc tỷ lệ ghi đè của shot trước')
      return
    }
    const prompt = (videoPromptPreviewDraft || '').trim()
    if (!prompt) {
      message.warning('Vui lòng nhập prompt video')
      return
    }
    setVideoPromptPreviewSubmitting(true)
    try {
      const submitted = await videoPromptDraft.submitNow()
      const taskId = submitted?.taskId
      if (!taskId) {
        message.error('Tạo tác vụ video thất bại: thiếu ID tác vụ')
        return
      }
      setVideoTaskId(taskId)
      setVideoTaskStatus('pending')
      setVideoTaskPolling(true)
      setVideoTask({
        taskId,
        status: 'pending',
        progress: 0,
        cancelRequested: false,
      })
      setVideoSettledTask(null)
      setVideoPromptPreviewOpen(false)
    } catch {
      message.error('Khởi tạo quy trình tạo video thất bại')
    } finally {
      setVideoPromptPreviewSubmitting(false)
    }
  }

  useEffect(() => {
    if (!videoTaskPolling || !videoTaskId) return
    let cancelled = false
    void (async () => {
      try {
        let finalTaskState: RelationTaskState | null = null
        for (let i = 0; i < 60; i += 1) {
          await sleep(2000)
          if (cancelled) return
          const statusRes = await FilmService.getTaskStatusApiV1FilmTasksTaskIdStatusGet({ taskId: videoTaskId })
          const status = statusRes.data?.status ?? null
          if (!status) continue
          if (statusRes.data) {
            finalTaskState = toRelationTaskStateFromStatusRead(statusRes.data)
            setVideoTask(finalTaskState)
          }
          setVideoTaskStatus(status)
          if (status === 'succeeded' || status === 'failed' || status === 'cancelled') break
        }
        if (
          !cancelled &&
          finalTaskState &&
          (finalTaskState.status === 'succeeded' ||
            finalTaskState.status === 'failed' ||
            finalTaskState.status === 'cancelled')
        ) {
          setVideoTask(null)
          setVideoSettledTask(finalTaskState)
        }
      } catch {
        if (!cancelled) {
          message.error('Lấy trạng thái tác vụ video thất bại')
        }
      } finally {
        if (!cancelled) setVideoTaskPolling(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoTaskPolling, videoTaskId])
  const updateCardState = (frameType: PromptFrameType, patch: Partial<KeyframeCardState>) => {
    setKeyframeCards((prev) => ({ ...prev, [frameType]: { ...prev[frameType], ...patch } }))
  }

  const getLatestFrameSlotId = async (frameType: PromptFrameType): Promise<number | null> => {
    if (!selectedShot?.id) return null
    const res = await StudioShotFrameImagesService.listShotFrameImagesApiV1StudioShotFrameImagesGet({
      shotDetailId: selectedShot.id,
      order: null,
      isDesc: false,
      page: 1,
      pageSize: 100,
    })
    const items = (res.data?.items ?? []) as ShotFrameImageRead[]
    const slot = items.find((x) => x.frame_type === frameType)
    return slot?.id ?? null
  }

  const loadCardThumbs = async (frameType: PromptFrameType, slotIdOverride?: number | null, retryCount = 1) => {
    const localSlotId = frameImages.find((x) => x.frame_type === frameType)?.id ?? null
    const slotId = slotIdOverride ?? localSlotId ?? (await getLatestFrameSlotId(frameType))
    if (!slotId) {
      updateCardState(frameType, { thumbs: [] })
      return
    }
    let thumbs: Array<{ linkId: number; fileId: string; thumbUrl: string }> = []
    for (let i = 0; i < retryCount; i += 1) {
      const links = await listTaskLinksNormalized({
        resourceType: 'image',
        relationType: 'shot_frame_image',
        relationEntityId: String(slotId),
        order: 'updated_at',
        isDesc: true,
        page: 1,
        pageSize: 100,
      })
      const seen = new Set<string>()
      thumbs = links
        .filter((l) => Boolean(l.file_id))
        .filter((l) => {
          const fid = String(l.file_id)
          if (seen.has(fid)) return false
          seen.add(fid)
          return true
        })
        .map((l) => ({
          linkId: l.id,
          fileId: String(l.file_id),
          thumbUrl: buildFileDownloadUrl(String(l.file_id)) ?? '',
        }))
      if (thumbs.length > 0 || i === retryCount - 1) break
      await sleep(800)
    }
    updateCardState(frameType, { thumbs })
  }

  const generateKeyframeCard = async (frameType: PromptFrameType) => {
    if (!selectedShot?.id) {
      message.warning('Vui lòng chọn một phân cảnh trước')
      return
    }
    try {
      setKeyframePromptPreviewLoading(true)
      setKeyframePromptPreviewOpen(true)
      setKeyframePromptPreviewFrameType(frameType)
      setKeyframePromptDebugCollapsed(true)
      setKeyframeDirectiveCollapsed(true)
      setKeyframePromptDecisionCollapsed(true)
      const basePrompt = getPromptFromDetailByType(frameType)
      keyframePromptDraft.hydrate({
        base: { frameType, prompt: basePrompt },
        context: { refFileIds: autoKeyframeRefFileIds },
        state: basePrompt.trim() ? 'draft_changed' : 'idle',
      })
      setKeyframePromptDebugContext(null)
      setKeyframePromptQualityChecks(null)
      // Nội dung vùng văn bản: thống nhất lấy từ frame-render-prompt
      if (basePrompt.trim()) {
        void renderShotPromptToTextarea({
          frameType,
          prompt: basePrompt,
          refFileIds: autoKeyframeRefFileIds,
          showPreviewLoading: true,
        })
      } else {
        setKeyframePromptPreviewLoading(false)
      }
    } catch {
      message.error('Lấy prompt thất bại')
      setKeyframePromptPreviewLoading(false)
    } finally {
      // loading sẽ được tắt sau khi renderShotPromptToTextarea kết thúc
    }
  }

  const regenerateKeyframePrompt = async () => {
    if (!selectedShot?.id) {
      message.warning('Vui lòng chọn một phân cảnh trước')
      return
    }
    const frameType = keyframePromptPreviewFrameType
    setKeyframePromptActionLoading(true)
    try {
      const created = await FilmService.createShotFramePromptTaskApiV1FilmTasksShotFramePromptsPost({
        requestBody: {
          shot_id: selectedShot.id,
          frame_type: frameType,
        },
      })
      const taskId = created.data?.task_id
      if (!taskId) {
        message.error('Tạo tác vụ thất bại: thiếu ID tác vụ')
        return
      }
      setPromptTask({
        taskId,
        status: 'pending',
        progress: 0,
        cancelRequested: false,
      })
      setPromptSettledTask(null)

      let finalStatus = 'pending'
      let finalTaskState: RelationTaskState | null = null
      for (let i = 0; i < 30; i += 1) {
        await sleep(2000)
        const statusRes = await FilmService.getTaskStatusApiV1FilmTasksTaskIdStatusGet({ taskId })
        const status = statusRes.data?.status
        if (!status) continue
        finalStatus = status
        if (statusRes.data) {
          finalTaskState = toRelationTaskStateFromStatusRead(statusRes.data)
          setPromptTask(finalTaskState)
        }
        if (status === 'succeeded' || status === 'failed' || status === 'cancelled') break
      }
      if (
        finalTaskState &&
        (finalTaskState.status === 'succeeded' ||
          finalTaskState.status === 'failed' ||
          finalTaskState.status === 'cancelled')
      ) {
        setPromptTask(null)
        setPromptSettledTask(finalTaskState)
      }

      if (finalStatus !== 'succeeded') {
        if (finalStatus !== 'failed' && finalStatus !== 'cancelled') {
          message.warning('Tác vụ tạo vẫn đang thực thi, vui lòng thử lại sau')
        }
        return
      }

      const resultRes = await FilmService.getTaskResultApiV1FilmTasksTaskIdResultGet({ taskId })
      const result = (resultRes.data?.result ?? null) as Record<string, unknown> | null
      const generatedPrompt = typeof result?.prompt === 'string' ? result.prompt : ''
      const debugContext =
        result && typeof result.debug_context === 'object' && result.debug_context !== null
          ? (result.debug_context as ShotFramePromptDebugContext)
          : null
      const qualityChecks =
        result &&
        typeof result.quality_checks === 'object' &&
        result.quality_checks !== null &&
        typeof (result.quality_checks as Record<string, unknown>).passed === 'boolean'
          ? {
              passed: Boolean((result.quality_checks as Record<string, unknown>).passed),
              issues: Array.isArray((result.quality_checks as Record<string, unknown>).issues)
                ? ((result.quality_checks as Record<string, unknown>).issues as unknown[])
                    .map((item) => (typeof item === 'string' ? item.trim() : ''))
                    .filter(Boolean)
                : [],
            }
          : null
      if (!generatedPrompt.trim()) {
        message.warning('Đã hoàn tất tạo nhưng chưa trả về prompt')
        return
      }
      if (frameType === 'first') {
        onPatchShotDetail({ first_frame_prompt: generatedPrompt })
      } else if (frameType === 'last') {
        onPatchShotDetail({ last_frame_prompt: generatedPrompt })
      } else {
        onPatchShotDetail({ key_frame_prompt: generatedPrompt })
      }
      setKeyframePromptDebugContext(debugContext)
      setKeyframePromptQualityChecks(qualityChecks)
      keyframePromptDraft.replaceBase({ frameType, prompt: generatedPrompt })
      keyframePromptDraft.setState('draft_changed')
      await renderShotPromptToTextarea({
        frameType,
        prompt: generatedPrompt,
        refFileIds: keyframePromptPreviewRefFileIds.length > 0 ? keyframePromptPreviewRefFileIds : autoKeyframeRefFileIds,
      })
      message.success('Đã tạo prompt')
    } catch {
      message.error('Tạo prompt thất bại')
    } finally {
      setKeyframePromptActionLoading(false)
    }
  }

  useEffect(() => {
    // Khi mở hộp thoại, nếu hiện tại chưa có ảnh tham chiếu thì tự động điền ảnh tham chiếu của thực thể liên kết với phân cảnh
    if (!keyframePromptPreviewOpen) return
    if (keyframePromptPreviewRefFileIds.length > 0) return
    if (autoKeyframeRefFileIds.length === 0) return
    keyframePromptDraft.setContext({ refFileIds: autoKeyframeRefFileIds })
  }, [autoKeyframeRefFileIds, keyframePromptPreviewOpen, keyframePromptPreviewRefFileIds.length])

  useEffect(() => {
    if (!keyframePromptPreviewOpen) return
    if (mapGenerationDraftStateToRenderState(keyframePromptRenderState) !== 'stale') return
    const basePrompt = (keyframePromptPreviewDraft || '').trim()
    if (!basePrompt) return
    const refFileIds =
      keyframePromptPreviewRefFileIds.length > 0 ? keyframePromptPreviewRefFileIds : autoKeyframeRefFileIds
    const timer = window.setTimeout(() => {
      void renderShotPromptToTextarea({
        frameType: keyframePromptPreviewFrameType,
        prompt: basePrompt,
        refFileIds,
      })
    }, 400)
    return () => {
      window.clearTimeout(timer)
    }
  }, [
    autoKeyframeRefFileIds,
    keyframePromptPreviewDraft,
    keyframePromptPreviewFrameType,
    keyframePromptPreviewOpen,
    keyframePromptPreviewRefFileIds,
    keyframePromptRenderState,
    renderShotPromptToTextarea,
  ])

  const confirmGenerateKeyframeWithPrompt = async () => {
    if (!selectedShot?.id) {
      message.warning('Vui lòng chọn một phân cảnh trước')
      return
    }
    const frameType = keyframePromptPreviewFrameType
    const basePrompt = (keyframePromptPreviewDraft || '').trim()
    if (!basePrompt) {
      message.warning('Vui lòng nhập prompt')
      return
    }

    setKeyframePromptActionLoading(true)
    updateCardState(frameType, { loading: true, taskStatus: 'pending', taskId: null })
    try {
      const refFileIds = keyframePromptPreviewRefFileIds.length > 0 ? keyframePromptPreviewRefFileIds : autoKeyframeRefFileIds
      keyframePromptDraft.replaceContext({ refFileIds })
      const submitted = await keyframePromptDraft.submitNow()
      const taskId = submitted?.taskId
      if (!taskId) {
        message.error('Tạo tác vụ thất bại: thiếu ID tác vụ')
        updateCardState(frameType, { loading: false, taskStatus: 'failed' })
        return
      }
      updateCardState(frameType, { taskId })
      setFrameImageTask({
        taskId,
        status: 'pending',
        progress: 0,
        cancelRequested: false,
      })
      setFrameImageSettledTask(null)

      let finalStatus = 'pending'
      let finalTaskState: RelationTaskState | null = null
      for (let i = 0; i < 30; i += 1) {
        await sleep(2000)
        const statusRes = await FilmService.getTaskStatusApiV1FilmTasksTaskIdStatusGet({ taskId })
        const status = statusRes.data?.status
        if (!status) continue
        finalStatus = status
        if (statusRes.data) {
          finalTaskState = toRelationTaskStateFromStatusRead(statusRes.data)
          setFrameImageTask(finalTaskState)
        }
        updateCardState(frameType, { taskStatus: status })
        if (status === 'succeeded' || status === 'failed' || status === 'cancelled') break
      }
      if (
        finalTaskState &&
        (finalTaskState.status === 'succeeded' ||
          finalTaskState.status === 'failed' ||
          finalTaskState.status === 'cancelled')
      ) {
        setFrameImageTask(null)
        setFrameImageSettledTask(finalTaskState)
      }
      if (finalStatus === 'succeeded') {
        const latestSlotId = await getLatestFrameSlotId(frameType)
        await loadCardThumbs(frameType, latestSlotId, 5)
        setKeyframePromptPreviewOpen(false)
      } else if (finalStatus !== 'failed' && finalStatus !== 'cancelled') {
        message.warning('Tác vụ tạo vẫn đang thực thi, vui lòng làm mới sau')
      }
    } catch {
      updateCardState(frameType, { taskStatus: 'failed' })
      message.error(`${frameLabel[frameType]}sinh thất bại`)
    } finally {
      updateCardState(frameType, { loading: false })
      setKeyframePromptActionLoading(false)
    }
  }

  const applyCardImage = async (frameType: PromptFrameType, fileId: string) => {
    const slot = frameImages.find((x) => x.frame_type === frameType)
    if (!slot) return
    updateCardState(frameType, { applyingFileId: fileId })
    try {
      await StudioShotFrameImagesService.updateShotFrameImageApiV1StudioShotFrameImagesImageIdPatch({
        imageId: slot.id,
        requestBody: { file_id: fileId } as any,
      })
      await loadCardThumbs(frameType)
      message.success('Đã chuyển sang dùng ảnh')
    } catch {
      message.error('Đổi thất bại')
    } finally {
      updateCardState(frameType, { applyingFileId: null })
    }
  }

  useEffect(() => {
    if (!selectedShot?.id) return
    void Promise.all([loadCardThumbs('first'), loadCardThumbs('key'), loadCardThumbs('last')])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShot?.id, frameImages.map((x) => `${x.id}:${x.file_id ?? ''}`).join('|')])

  const pendingDialogueCandidates = shotDialogueCandidateItems.filter((item) => item.candidate_status === 'pending')

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="cs-inspector-header flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium truncate">Bảng tạo phân cảnh</div>
          <div className="text-xs text-gray-500 truncate">
            {selectedShot ? `${String(selectedShot.index).padStart(2, '0')} · ${selectedShot.title}` : 'Chưa chọn phân cảnh'}
          </div>
        </div>
        <Space size="small">
          <Tooltip title="Thu gọn">
            <Button size="small" type="text" icon={<DoubleRightOutlined />} onClick={onClose} />
          </Tooltip>
        </Space>
      </div>

      <div className="cs-inspector flex-1 min-h-0 overflow-auto">
        <Tabs
          tabPosition="left"
          activeKey={inspectorTabKey}
          onChange={(activeKey) => setInspectorTabKey(activeKey as InspectorTabKey)}
          items={(() => {
            const items = [
              {
              key: 'ops',
              label: 'Cài đặt bảo trì',
              children: (
                <ChapterStudioMaintenancePanel
                  opsTitleDraft={opsTitleDraft}
                  opsNoteDraft={opsNoteDraft}
                  hideShot={hideShot}
                  onChangeTitle={setOpsTitleDraft}
                  onBlurTitle={() => {
                    void flushOpsTitle()
                  }}
                  onChangeNote={setOpsNoteDraft}
                  onBlurNote={() => {
                    void flushOpsNote()
                  }}
                  onToggleHidden={setHideShot}
                  onRequestDelete={() => {
                    if (!selectedShot?.id) return
                    Modal.confirm({
                      title: 'Xóa phân cảnh?',
                      content: 'Thao tác này không thể thu hồi.',
                      okText: 'Xóa',
                      okButtonProps: { danger: true },
                      cancelText: 'Hủy',
                      onOk: () => onDeleteShotOps(selectedShot.id),
                    })
                  }}
                />
              ),
            },
              {
              key: 'camera',
              label: 'Tham số tạo',
              children: (
                <div>
                  {loadingDetail ? (
                    <div className="text-gray-500">đang tải…</div>
                  ) : shotDetail ? (
                    <>
                      <div className="cs-group">
                        <div className="cs-group-title">
                          <CameraOutlined /> Ngôn ngữ điện ảnh
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Cận (độ rộng shot)</div>
                            <Radio.Group
                              value={shotDetail.camera_shot}
                              optionType="button"
                              buttonStyle="solid"
                              size="small"
                              options={CAMERA_SHOT_OPTIONS}
                              onChange={(e) => void onPatchShotDetailImmediate({ camera_shot: e.target.value })}
                              disabled={cameraUpdating}
                            />
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Góc độ</div>
                            <Radio.Group
                              value={shotDetail.angle}
                              optionType="button"
                              size="small"
                              options={CAMERA_ANGLE_OPTIONS}
                              onChange={(e) => void onPatchShotDetailImmediate({ angle: e.target.value })}
                              disabled={cameraUpdating}
                            />
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Chuyển động máy</div>
                            <Radio.Group
                              value={shotDetail.movement}
                              size="small"
                              options={CAMERA_MOVEMENT_OPTIONS}
                              onChange={(e) => void onPatchShotDetailImmediate({ movement: e.target.value })}
                              disabled={cameraUpdating}
                            />
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Thời lượng (1–30s, số nguyên)</div>
                            <div className="flex items-center gap-2">
                              <Slider
                                min={1}
                                max={30}
                                step={1}
                                value={Math.max(1, Math.min(30, Math.round(shotDetail.duration ?? 1)))}
                                style={{ flex: 1 }}
                                onChange={(v) => void onPatchShotDetailImmediate({ duration: Math.round(Number(v)) })}
                                disabled={cameraUpdating}
                              />
                              <Input
                                size="small"
                                value={`${Math.max(1, Math.min(30, Math.round(shotDetail.duration ?? 1)))}`}
                                style={{ width: 72 }}
                                onChange={(e) => {
                                  const raw = Number(e.target.value)
                                  if (!Number.isFinite(raw)) return
                                  const n = Math.max(1, Math.min(30, Math.round(raw)))
                                  void onPatchShotDetailImmediate({ duration: n })
                                }}
                                disabled={cameraUpdating}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Tỷ lệ video</div>
                            <Select
                              size="small"
                              allowClear
                              value={shotDetail.override_video_ratio ?? undefined}
                              placeholder={projectDefaultVideoRatio || capabilityDefaultVideoRatio || 'Vui lòng chọn tỷ lệ video'}
                              options={videoRatioOptions}
                              onChange={(value) => {
                                onPatchShotDetail({ override_video_ratio: value ?? null })
                              }}
                              disabled={cameraUpdating}
                            />
                            <div className="mt-1 text-[11px] text-gray-400">
                              hiện đang hiệu lực:{resolveVideoRatioForRequest() || 'chưa đặt'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="cs-group">
                        <div className="cs-group-title">
                          <TagOutlined /> Nhãn cảm xúc
                        </div>
                        <div className="cs-hint">Dùng nhãn để đánh dấu nhanh cảm xúc phân cảnh, thuận tiện cho phong cách tạo thống nhất.</div>
                        <div className="mt-3">
                          <Space wrap>
                            {['phẫn nộ', 'twist', 'căng thẳng', 'ấm áp', 'u uất'].map((t) => (
                              <Tag key={t} className="cursor-pointer">
                                {t}
                              </Tag>
                            ))}
                            <Button size="small" type="dashed">
                              + Tùy chỉnh
                            </Button>
                          </Space>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">vui lòng chọn phân cảnh</div>
                  )}
                </div>
              ),
            },
              {
              key: 'prompt_image',
              label: 'Xác nhận chẩn đoán',
              children: (
                <div>
                  <ChapterStudioReadinessDiagnosisPanel
                    selectedShot={selectedShot}
                    shotAssetsOverview={shotAssetsOverview}
                    promptAssetReadiness={promptAssetReadiness}
                    promptAssetReadinessNote={promptAssetReadinessNote}
                    shotExtractStatusSource={shotExtractStatus.source}
                    shotExtractStatusText={shotExtractStatusText}
                    onGoToShotEdit={goToShotEditForAssets}
                    onHandleMissingAction={(kind, name) => {
                      void handleReadinessMissingAction(kind, name)
                    }}
                    getReadinessExistenceLabel={getReadinessExistenceLabel}
                  />

                  <div className="cs-group">
                    <div className="cs-group-title">
                      <PictureOutlined /> Mô tả không khí
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                          <div className="text-gray-500 text-xs">mô tả không khí</div>
                          <Switch
                            size="small"
                            checked={shotDetail?.follow_atmosphere ?? false}
                            onChange={(v) => onPatchShotDetail({ follow_atmosphere: v })}
                          />
                        </div>
                        <TextArea
                          rows={3}
                          placeholder="Mô tả không khí… (tùy chọn đi theo khung hình)"
                          value={shotDetail?.atmosphere ?? ''}
                          onChange={(e) => onPatchShotDetail({ atmosphere: e.target.value })}
                        />
                    </div>
                  </div>

                </div>
              ),
            },
              {
              key: 'dialogue',
              label: 'Trạng thái thoại',
              children: (
                <div>
                  <div className="cs-group">
                    <div className="cs-group-title">
                      <SoundOutlined /> Trạng thái thoại
                    </div>
                    <div className="cs-hint">Ở đây chủ yếu xem thoại và trạng thái chờ xác nhận của phân cảnh hiện tại. Lối vào xác nhận chính cho ứng viên thoại nằm ở trang chỉnh sửa phân cảnh, studio tập trung tiếp tục chuẩn bị khung hình chính, ảnh và tạo video.</div>
                    <div className="space-y-4 mt-3">
                      <div>
                        <Button icon={<EditOutlined />} onClick={goToShotEditForAssets}>
                          Sang trang chỉnh sửa phân cảnh để xác nhận thoại
                        </Button>
                      </div>
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                        Nếu cần thêm thoại, chấp nhận ứng viên hoặc bỏ qua ứng viên, vui lòng xử lý trong trang chỉnh sửa phân cảnh. Studio ở đây chủ yếu để xem trạng thái thoại hiện tại và tiếp tục chuẩn bị tạo.
                      </div>

                      {pendingDialogueCandidates.length > 0 ? (
                        <div>
                          <div className="text-gray-500 text-xs mb-2">Ứng viên thoại chờ xác nhận</div>
                          <div className="space-y-2">
                            {pendingDialogueCandidates.map((candidate) => (
                              <div key={candidate.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-xs text-amber-700 mb-1">
                                      {candidate.speaker_name?.trim() || 'Không rõ'} → {candidate.target_name?.trim() || 'Không rõ'}
                                    </div>
                                    <div className="text-xs text-gray-700 break-words">{candidate.text}</div>
                                  </div>
                                  <Button size="small" icon={<EditOutlined />} onClick={goToShotEditForAssets}>
                                    Xử lý ở trang chỉnh sửa
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <div className="text-gray-500 text-xs mb-2">Thoại hiện tại</div>
                        {dialogLines.length > 0 ? (
                          <div className="space-y-1">
                            {dialogLines.slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((l) => (
                              <div key={l.id} className="flex items-center gap-2">
                                <div className="text-xs text-gray-600 truncate flex-1 min-w-0">{l.text}</div>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    Modal.confirm({
                                      title: 'Xóa lời thoại này?',
                                      okText: 'Xóa',
                                      cancelText: 'Hủy',
                                      okButtonProps: { danger: true },
                                      onOk: async () => {
                                        try {
                                          await onDeleteDialogLine(l.id)
                                          message.success('Đã xóa')
                                        } catch {
                                          message.error('Xóa thất bại')
                                        }
                                      },
                                    })
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Phân cảnh hiện tại chưa có thoại.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
              {
              key: 'keyframe_gen',
              label: 'Khung hình chính và ảnh tham chiếu',
              children: (
                <div className="space-y-3">
                  <div className="cs-group">
                    <div className="cs-group-title">
                      <SettingOutlined /> Spec khung hình chính
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Khung hình chính sẽ được tạo theo tỉ lệ video hiện tại; ở đây kiểm soát bậc độ phân giải của khung hình tham chiếu.
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="min-w-[96px] text-xs text-gray-500">Hạng phân giải</div>
                      <Select
                        size="small"
                        value={keyframeResolutionProfile}
                        style={{ width: 160 }}
                        options={[
                          { value: 'standard', label: 'Chuẩn (2K)' },
                          { value: 'high', label: 'Độ nét cao (3K)' },
                        ]}
                        onChange={(value) => onChangeKeyframeResolutionProfile(value as KeyframeResolutionProfile)}
                      />
                    </div>
                    <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <div>
                        đặc tả hiện tại:{resolvedKeyframeRatio || 'chưa đặt tỷ lệ'} ·{' '}
                        {getResolutionProfileLabel(keyframeResolutionProfile)}
                        {resolvedKeyframePixelSize ? ` → ${resolvedKeyframePixelSize}` : ''}
                      </div>
                      <div className="mt-1 text-gray-500">
                        Mô hình hiện tại: {imageGenerationOptions?.provider || 'Nhà cung cấp không xác định được'}
                        {imageGenerationOptions?.model_name ? ` / ${imageGenerationOptions.model_name}` : ''}
                      </div>
                    </div>
                  </div>
                  {(['first', 'key', 'last'] as PromptFrameType[]).map((ft) => {
                    const st = keyframeCards[ft]
                    const slot = frameImages.find((x) => x.frame_type === ft)
                    const inUseFileId = slot?.file_id ? String(slot.file_id) : ''
                    const statusText =
                      st.taskStatus === 'pending'
                        ? 'Đang xếp hàng'
                        : st.taskStatus === 'running'
                          ? 'Đang tạo'
                          : st.taskStatus === 'succeeded'
                            ? 'Đã hoàn thành'
                            : st.taskStatus === 'failed'
                              ? 'Thất bại'
                              : st.taskStatus === 'cancelled'
                                ? 'Đã hủy'
                                : ''
                    return (
                      <div key={ft} className="cs-group">
                        <div className="cs-group-title flex items-center justify-between gap-2">
                          <span>Hình ảnh {frameLabel[ft]}</span>
                          <Space size={8}>
                            <Button size="small" type="link" onClick={() => updateCardState(ft, { modalOpen: true })}>
                              Thêm
                            </Button>
                            <Button size="small" type="primary" loading={st.loading} onClick={() => void generateKeyframeCard(ft)}>
                              Tạo
                            </Button>
                          </Space>
                        </div>
                        <div className="text-xs text-gray-500 min-h-5">{statusText}</div>
                        {st.thumbs.length === 0 ? (
                          <div className="mt-2 h-24 border border-dashed rounded flex items-center justify-center text-xs text-gray-400">Chưa có ảnh</div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                            {st.thumbs.slice(0, 4).map((it) => (
                              <img key={it.linkId} src={it.thumbUrl} alt="" className="w-16 h-16 rounded object-cover border border-gray-200 shrink-0" />
                            ))}
                          </div>
                        )}
                        <Modal title={`${frameLabel[ft]} ảnh`} open={st.modalOpen} onCancel={() => updateCardState(ft, { modalOpen: false })} footer={null} width={720}>
                          {ft === 'first' ? (
                            <div className="mb-3">
                              <div className="text-sm text-gray-600 mb-2">Nhân vật liên kết</div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                  type="button"
                                  className="w-12 h-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-500 shrink-0 hover:border-gray-400 hover:text-gray-700"
                                  disabled={promptAssetsUpdating || linkRoleLoading}
                                  onClick={() => {
                                    setLinkRoleSelectedIds([])
                                    setLinkRoleOpen(true)
                                    void loadProjectRoleOptions()
                                  }}
                                  title="Thêm nhân vật liên kết"
                                >
                                  <PlusOutlined />
                                </button>
                                {linkedCharacterIds.length === 0 ? (
                                  <div className="text-xs text-gray-400">Chưa có nhân vật liên kết</div>
                                ) : (
                                  linkedCharacterIds.map((cid) => {
                                    const thumb = linkedAssetThumbByKey.get(`character:${cid}`)
                                    const name = characterNameMap[cid] ?? cid
                                    return thumb ? (
                                    <Image
                                        key={cid}
                                        width={48}
                                        height={48}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                        src={resolveAssetUrl(thumb)}
                                        preview={{ src: resolveAssetUrl(thumb) }}
                                      />
                                    ) : (
                                      <div
                                        key={cid}
                                        title={name}
                                        className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"
                                      >
                                        <UserOutlined />
                                      </div>
                                    )
                                  })
                                )}
                              </div>

                              <div className="mt-3 text-sm text-gray-600 mb-2">Bối cảnh liên kết</div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                  type="button"
                                  className="w-12 h-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-500 shrink-0 hover:border-gray-400 hover:text-gray-700"
                                  disabled={promptAssetsUpdating || linkSceneLoading}
                                  onClick={() => {
                                    setLinkSceneOpen(true)
                                    void loadProjectAssetOptions('scene')
                                  }}
                                  title="Thêm/đổi bối cảnh liên kết"
                                >
                                  <PlusOutlined />
                                </button>
                                {linkedSceneId ? (
                                  linkedAssetThumbByKey.get(`scene:${linkedSceneId}`) ? (
                                    <Image
                                      key={linkedSceneId}
                                      width={48}
                                      height={48}
                                      style={{ objectFit: 'cover', borderRadius: 8 }}
                                      src={resolveAssetUrl(linkedAssetThumbByKey.get(`scene:${linkedSceneId}`) ?? '')}
                                      preview={{ src: resolveAssetUrl(linkedAssetThumbByKey.get(`scene:${linkedSceneId}`) ?? '') }}
                                    />
                                  ) : (
                                    <div className="text-xs text-gray-400">Bối cảnh đã liên kết: {sceneNameMap[linkedSceneId] ?? linkedSceneId}</div>
                                  )
                                ) : (
                                  <div className="text-xs text-gray-400">Chưa có bối cảnh liên kết</div>
                                )}
                              </div>

                              <div className="mt-3 text-sm text-gray-600 mb-2">Đạo cụ liên kết</div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                  type="button"
                                  className="w-12 h-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-500 shrink-0 hover:border-gray-400 hover:text-gray-700"
                                  disabled={promptAssetsUpdating || linkPropLoading}
                                  onClick={() => {
                                    setLinkPropSelectedIds([])
                                    setLinkPropOpen(true)
                                    void loadProjectAssetOptions('prop')
                                  }}
                                  title="Thêm đạo cụ liên kết"
                                >
                                  <PlusOutlined />
                                </button>
                                {linkedPropIds.length === 0 ? (
                                  <div className="text-xs text-gray-400">Chưa có đạo cụ liên kết</div>
                                ) : (
                                  linkedPropIds.map((pid) =>
                                    linkedAssetThumbByKey.get(`prop:${pid}`) ? (
                                      <Image
                                        key={pid}
                                        width={48}
                                        height={48}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                        src={resolveAssetUrl(linkedAssetThumbByKey.get(`prop:${pid}`) ?? '')}
                                        preview={{ src: resolveAssetUrl(linkedAssetThumbByKey.get(`prop:${pid}`) ?? '') }}
                                      />
                                    ) : (
                                      <div key={pid} className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <UserOutlined />
                                      </div>
                                    ),
                                  )
                                )}
                              </div>

                              <div className="mt-3 text-sm text-gray-600 mb-2">Trang phục liên kết</div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                  type="button"
                                  className="w-12 h-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-500 shrink-0 hover:border-gray-400 hover:text-gray-700"
                                  disabled={promptAssetsUpdating || linkCostumeLoading}
                                  onClick={() => {
                                    setLinkCostumeSelectedIds([])
                                    setLinkCostumeOpen(true)
                                    void loadProjectAssetOptions('costume')
                                  }}
                                  title="Thêm trang phục liên kết"
                                >
                                  <PlusOutlined />
                                </button>
                                {linkedCostumeIds.length === 0 ? (
                                  <div className="text-xs text-gray-400">Chưa có trang phục liên kết</div>
                                ) : (
                                  linkedCostumeIds.map((cid) =>
                                    linkedAssetThumbByKey.get(`costume:${cid}`) ? (
                                      <Image
                                        key={cid}
                                        width={48}
                                        height={48}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                        src={resolveAssetUrl(linkedAssetThumbByKey.get(`costume:${cid}`) ?? '')}
                                        preview={{ src: resolveAssetUrl(linkedAssetThumbByKey.get(`costume:${cid}`) ?? '') }}
                                      />
                                    ) : (
                                      <div key={cid} className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <UserOutlined />
                                      </div>
                                    ),
                                  )
                                )}
                              </div>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {st.thumbs.map((it) => {
                              const inUse = inUseFileId && inUseFileId === it.fileId
                              return (
                                <div key={it.linkId} className="border rounded p-2">
                                  <img src={it.thumbUrl} alt="" className="w-full h-36 object-cover rounded" />
                                  <div className="mt-2 flex items-center justify-between">
                                    {inUse ? (
                                      <Tag color="green">Đang sử dụng</Tag>
                                    ) : (
                                      <Button size="small" loading={st.applyingFileId === it.fileId} onClick={() => void applyCardImage(ft, it.fileId)}>
                                        Sử dụng
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <Modal
                            title="Liên kết nhân vật"
                            open={linkRoleOpen}
                            onCancel={() => setLinkRoleOpen(false)}
                            footer={null}
                            destroyOnClose
                            width={560}
                          >
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">Nguồn: toàn bộ nhân vật trong dự án hiện tại (lưu ngay sau khi chọn; nhân vật đã liên kết không được chọn trùng)</div>
                              <Select
                                mode="multiple"
                                className="w-full"
                                placeholder="Chọn nhân vật cần liên kết vào phân cảnh hiện tại"
                                value={linkRoleSelectedIds}
                                loading={linkRoleLoading}
                                disabled={promptAssetsUpdating}
                                options={projectRoleOptions}
                                optionFilterProp="searchLabel"
                                showSearch
                                filterOption={(input: string, option?: any) =>
                                  String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(vals: Array<string | number>) => {
                                  const nextNew = (vals ?? []).map((v) => String(v)).filter(Boolean)
                                  setLinkRoleSelectedIds(nextNew)
                                  const merged = Array.from(new Set([...linkedCharacterIds, ...nextNew]))
                                  void (async () => {
                                    await onUpdatePromptActors(merged)
                                    setLinkRoleOpen(false)
                                    setLinkRoleSelectedIds([])
                                  })()
                                }}
                              />
                            </div>
                          </Modal>

                          <Modal
                            title="Liên kết bối cảnh"
                            open={linkSceneOpen}
                            onCancel={() => setLinkSceneOpen(false)}
                            footer={null}
                            destroyOnClose
                            width={560}
                          >
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">Nguồn: bối cảnh của dự án hiện tại (lưu ngay khi chọn)</div>
                              <Select
                                className="w-full"
                                placeholder="Chọn bối cảnh cần liên kết vào phân cảnh hiện tại"
                                value={linkedSceneId ?? undefined}
                                loading={linkSceneLoading}
                                disabled={promptAssetsUpdating}
                                options={projectSceneOptions}
                                optionFilterProp="searchLabel"
                                showSearch
                                filterOption={(input: string, option?: any) =>
                                  String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(v: string) => {
                                  void (async () => {
                                    await onUpdatePromptScene(v)
                                    setLinkSceneOpen(false)
                                  })()
                                }}
                              />
                            </div>
                          </Modal>

                          <Modal
                            title="Liên kết đạo cụ"
                            open={linkPropOpen}
                            onCancel={() => setLinkPropOpen(false)}
                            footer={null}
                            destroyOnClose
                            width={560}
                          >
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">Nguồn: đạo cụ của dự án hiện tại (lưu ngay khi chọn; những mục đã liên kết không được chọn lại)</div>
                              <Select
                                mode="multiple"
                                className="w-full"
                                placeholder="Chọn đạo cụ cần liên kết vào phân cảnh hiện tại"
                                value={linkPropSelectedIds}
                                loading={linkPropLoading}
                                disabled={promptAssetsUpdating}
                                options={projectPropOptions}
                                optionFilterProp="searchLabel"
                                showSearch
                                filterOption={(input: string, option?: any) =>
                                  String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(vals: Array<string | number>) => {
                                  const nextNew = (vals ?? []).map((v) => String(v)).filter(Boolean)
                                  setLinkPropSelectedIds(nextNew)
                                  const merged = Array.from(new Set([...linkedPropIds, ...nextNew]))
                                  void (async () => {
                                    await onUpdatePromptProps(merged)
                                    setLinkPropOpen(false)
                                    setLinkPropSelectedIds([])
                                  })()
                                }}
                              />
                            </div>
                          </Modal>

                          <Modal
                            title="Liên kết trang phục"
                            open={linkCostumeOpen}
                            onCancel={() => setLinkCostumeOpen(false)}
                            footer={null}
                            destroyOnClose
                            width={560}
                          >
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">Nguồn: trang phục của dự án hiện tại (lưu ngay khi chọn; những mục đã liên kết không được chọn lại)</div>
                              <Select
                                mode="multiple"
                                className="w-full"
                                placeholder="Chọn trang phục cần liên kết vào phân cảnh hiện tại"
                                value={linkCostumeSelectedIds}
                                loading={linkCostumeLoading}
                                disabled={promptAssetsUpdating}
                                options={projectCostumeOptions}
                                optionFilterProp="searchLabel"
                                showSearch
                                filterOption={(input: string, option?: any) =>
                                  String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(vals: Array<string | number>) => {
                                  const nextNew = (vals ?? []).map((v) => String(v)).filter(Boolean)
                                  setLinkCostumeSelectedIds(nextNew)
                                  const merged = Array.from(new Set([...linkedCostumeIds, ...nextNew]))
                                  void (async () => {
                                    await onUpdatePromptCostumes(merged)
                                    setLinkCostumeOpen(false)
                                    setLinkCostumeSelectedIds([])
                                  })()
                                }}
                              />
                            </div>
                          </Modal>
                        </Modal>
                      </div>
                    )
                  })}
                </div>
              ),
            },
              ...(showAvTab ? [{
                key: 'av',
                label: 'Kiểm soát âm - hình',
                children: (
                  <div>
                    <div className="cs-group">
                      <div className="cs-group-title">
                        <CustomerServiceOutlined /> Nhạc nền
                      </div>
                      <div className="space-y-3">
                        <Radio.Group
                          value={audioMode}
                          onChange={(e) => setAudioMode(e.target.value)}
                          options={[
                            { value: 'none', label: 'không có' },
                            { value: 'prompt', label: 'Prompt' },
                            { value: 'upload', label: 'Tải lên âm thanh' },
                          ]}
                        />
                        {audioMode === 'prompt' && <TextArea rows={3} placeholder="Prompt nhạc nền (hỗ trợ nhiều phiên bản)…" />}
                        {audioMode === 'upload' && (
                          <Button block icon={<UploadOutlined />}>
                            Tải âm thanh lên
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="cs-group">
                      <div className="cs-group-title">
                        <SoundOutlined /> Hiệu ứng âm thanh
                      </div>
                      <div className="space-y-3">
                        <Button block icon={<UploadOutlined />}>
                          Thêm một hiệu ứng âm thanh (Mock)
                        </Button>
                      </div>
                    </div>

                    <div className="cs-group">
                      <div className="cs-group-title">
                        <SettingOutlined /> Công tắc
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tắt nhạc nền</span>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tắt thoại</span>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Đồng bộ khẩu hình thông minh</span>
                          <Switch />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              }] : []),
              {
              key: 'gen_ref',
              label: 'Tạo video',
              children: (
                <div>
                  <ChapterStudioVideoReadinessPanel
                    selectedShot={selectedShot}
                    videoReadinessLoading={videoReadinessLoading}
                    videoReadiness={videoReadiness}
                    videoReferenceMode={videoReferenceMode}
                  />

                  <div className="cs-group">
                    <div className="cs-group-title">
                      <LinkOutlined /> Tham chiếu
                    </div>
                    <Select
                      allowClear
                      placeholder="Chọn theo loại khung hình chính đã có"
                      className="w-full"
                      value={refImageType}
                      onChange={(v) => setRefImageType(v === undefined || v === null ? undefined : String(v))}
                      options={refFrameTypeOptions}
                      loading={refFrameTypeSelectLoading}
                      onDropdownVisibleChange={handleRefFrameTypeDropdownVisibleChange}
                    />
                  </div>

                  {showGenRefParams && (
                    <div className="cs-group">
                      <div className="cs-group-title">
                        <ToolOutlined /> Tham số
                      </div>
                      <Space direction="vertical" className="w-full" size="small">
                        <Select
                          size="small"
                          placeholder="Chọn mô hình"
                          options={[
                            { value: 'model_a', label: 'Mô hình A (thực tế)' },
                            { value: 'model_b', label: 'mô hình B (mỹ học hóa)' },
                          ]}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-sm">ControlNet (độ sâu/xương)</span>
                          <Switch checked={useBoneDepth} onChange={setUseBoneDepth} />
                        </div>
                        <Slider min={3} max={12} defaultValue={5} />
                      </Space>
                    </div>
                  )}

                  <div className="cs-group">
                    <div className="cs-group-title">
                      <ThunderboltOutlined /> Tạo
                    </div>
                    <Space wrap>
                      <Button type="primary" icon={<VideoCameraOutlined />} loading={videoPromptPreviewSubmitting || videoTaskPolling} onClick={() => void openVideoPromptPreview()}>
                        Tạo video
                      </Button>
                      {videoTaskStatus ? <span className="text-xs text-gray-500">Trạng thái tác vụ: {videoTaskStatus}</span> : null}
                    </Space>
                  </div>

                  <div className="cs-group">
                    <div className="cs-group-title">
                      <VideoCameraOutlined /> Đã tạo video
                    </div>
                    {generatedVideos.length === 0 ? (
                      <div className="text-xs text-gray-400">Phân cảnh hiện tại chưa có video nào được tạo</div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {generatedVideos.map((item, idx) => (
                          <div key={`${item.linkId}-${item.fileId}`} className="border rounded p-2">
                            <video
                              src={item.url}
                              className="w-full h-20 rounded object-cover bg-black"
                              preload="metadata"
                              muted
                              onClick={() => onSelectPreviewVideo(item.fileId)}
                              style={{ cursor: 'pointer' }}
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500">Video {idx + 1}</span>
                              <Tooltip title="Tải video xuống">
                                <Button
                                  size="small"
                                  icon={<DownloadOutlined />}
                                  onClick={() => {
                                    if (!item.url) return
                                    window.open(item.url, '_blank', 'noopener,noreferrer')
                                  }}
                                />
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showGenRefVersions && (
                    <div className="cs-group">
                      <div className="cs-group-title">
                        <AppstoreOutlined /> Phiên bản
                      </div>
                      <Tabs
                        type="card"
                        size="small"
                        activeKey={imageVersion}
                        onChange={setImageVersion}
                        items={[
                          { key: 'v1', label: 'v1' },
                          { key: 'v2', label: 'v2' },
                          { key: 'v3', label: 'v3' },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ),
              },
            ]

            const order: Record<string, number> = {
              gen_ref: 0,
              keyframe_gen: 1,
              camera: 2,
              prompt_image: 3,
              dialogue: 4,
              ops: 5,
              av: 6,
            }

            return items.sort((a, b) => (order[String(a.key)] ?? 999) - (order[String(b.key)] ?? 999))
          })()}
        />

        <Modal
          title={`${frameLabel[keyframePromptPreviewFrameType]}Xem trước prompt tạo ảnh`}
          open={keyframePromptPreviewOpen}
          onCancel={() => {
            if (keyframePromptActionLoading) return
            setKeyframePromptPreviewOpen(false)
          }}
          footer={(
            <div className="flex items-center justify-between">
              <div />
              <Space>
                <Button
                  loading={keyframePromptActionLoading}
                  onClick={() => {
                    if (keyframePromptActionLoading) return
                    setKeyframePromptPreviewOpen(false)
                  }}
                >
                  Hủy
                </Button>
                <Button type="primary" loading={keyframePromptActionLoading} onClick={() => void confirmGenerateKeyframeWithPrompt()}>
                  Tạo
                </Button>
              </Space>
            </div>
          )}
          destroyOnClose
          width={900}
        >
          {(() => {
            const hasBasePrompt = keyframePromptPreviewDraft.trim().length > 0
            const renderStatusMeta = getKeyframeRenderStatusMeta(keyframePromptRenderState)
            const debugVisualStyle = readDebugContextText(keyframePromptDebugContext, 'visual_style')
            const debugStyle = readDebugContextText(keyframePromptDebugContext, 'style')
            const debugCharacterContext = readDebugContextText(keyframePromptDebugContext, 'character_context')
            const debugSceneContext = readDebugContextText(keyframePromptDebugContext, 'scene_context')
            const debugPropContext = readDebugContextText(keyframePromptDebugContext, 'prop_context')
            const debugCostumeContext = readDebugContextText(keyframePromptDebugContext, 'costume_context')
            const debugShotDescription = readDebugContextText(keyframePromptDebugContext, 'shot_description')
            const debugDialogSummary = readDebugContextText(keyframePromptDebugContext, 'dialog_summary')
            const debugPreviousShotTitle = readDebugContextText(keyframePromptDebugContext, 'previous_shot_title')
            const debugPreviousShotScriptExcerpt = readDebugContextText(keyframePromptDebugContext, 'previous_shot_script_excerpt')
            const debugPreviousShotEndState = readDebugContextText(keyframePromptDebugContext, 'previous_shot_end_state')
            const debugNextShotTitle = readDebugContextText(keyframePromptDebugContext, 'next_shot_title')
            const debugNextShotScriptExcerpt = readDebugContextText(keyframePromptDebugContext, 'next_shot_script_excerpt')
            const debugNextShotStartGoal = readDebugContextText(keyframePromptDebugContext, 'next_shot_start_goal')
            const debugContinuityGuidance = readDebugContextText(keyframePromptDebugContext, 'continuity_guidance')
            const debugCompositionAnchor = readDebugContextText(keyframePromptDebugContext, 'composition_anchor')
            const debugScreenDirectionGuidance = readDebugContextText(keyframePromptDebugContext, 'screen_direction_guidance')
            const debugFrameSpecificGuidance = readDebugContextText(keyframePromptDebugContext, 'frame_specific_guidance')
            const debugDirectorCommandSummary = readDebugContextText(keyframePromptDebugContext, 'director_command_summary')
            const debugActionBeatPhases = readDebugContextText(keyframePromptDebugContext, 'action_beat_phases')
            const debugSelectedActionBeatPhase = readDebugContextText(keyframePromptDebugContext, 'selected_action_beat_phase')
            const debugSelectedActionBeatText = readDebugContextText(keyframePromptDebugContext, 'selected_action_beat_text')
            const actionBeatPhaseTags = buildActionBeatPhaseTags(debugActionBeatPhases)
            const parsedDirectorCommandSummary = parseDirectorCommandSummary(debugDirectorCommandSummary)
            const keyframeGuidanceSummary = buildKeyframeGuidanceSummary([
              debugDirectorCommandSummary,
              debugFrameSpecificGuidance,
              debugContinuityGuidance,
              debugCompositionAnchor,
              debugScreenDirectionGuidance,
            ])
            const guidanceLevelSummary = buildGuidanceLevelSummary(parsedDirectorCommandSummary, keyframeGuidanceSummary)
            const debugUnifyStyle =
              typeof keyframePromptDebugContext?.unify_style === 'boolean'
                ? (keyframePromptDebugContext.unify_style ? 'Có' : 'Không')
                : readDebugContextText(keyframePromptDebugContext, 'unify_style')
            const hasPromptDebugContext = Boolean(
              debugVisualStyle ||
                debugStyle ||
                debugCharacterContext ||
                debugSceneContext ||
                debugPropContext ||
                debugCostumeContext ||
                debugShotDescription ||
                debugDialogSummary ||
                debugPreviousShotTitle ||
                debugPreviousShotScriptExcerpt ||
                debugPreviousShotEndState ||
                debugNextShotTitle ||
                debugNextShotScriptExcerpt ||
                debugNextShotStartGoal ||
                debugContinuityGuidance ||
                debugCompositionAnchor ||
                debugScreenDirectionGuidance ||
                debugFrameSpecificGuidance ||
                debugDirectorCommandSummary ||
                debugActionBeatPhases ||
                debugSelectedActionBeatText ||
                debugUnifyStyle,
            )
            const hasPromptQualityChecks = keyframePromptQualityChecks !== null
            return keyframePromptPreviewLoading ? (
              <div className="py-8 text-center">
                <Spin />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Ánh xạ ảnh tham chiếu</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Thứ tự ảnh sẽ quyết định trực tiếp mối quan hệ ánh xạ 图1, 图2 trong prompt cuối cùng và ảnh hưởng kết quả tạo của mô hình.
                      </div>
                    </div>
                    <Tag color="gold">Thứ tự ảnh hưởng hình 1/hình 2</Tag>
                  </div>
                  {keyframePromptPreviewRefFileIds.length === 0 ? (
                    <div className="text-xs text-gray-400">Chưa có ảnh liên kết</div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      <Image.PreviewGroup>
                        {keyframePromptPreviewRefFileIds.map((fid, index) => (
                          <div key={fid} className="w-[92px] shrink-0">
                            <Tooltip title={shotLinkedAssetNameByFileId.get(fid) ?? fid}>
                              <Image
                                width={72}
                                height={72}
                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                src={buildFileDownloadUrl(fid)}
                              />
                            </Tooltip>
                            <div className="mt-1">
                              <Tag color="blue">{`ảnh${index + 1}`}</Tag>
                            </div>
                            <div className="truncate text-[11px] text-gray-700">
                              {shotLinkedAssetNameByFileId.get(fid) ?? fid}
                            </div>
                            <div className="mt-1 flex gap-1">
                              <Button
                                size="small"
                                disabled={index === 0 || keyframePromptActionLoading || shotRenderPromptLoading}
                                onClick={() => moveKeyframePromptRefFile(index, index - 1)}
                              >
                                Dịch trái
                              </Button>
                              <Button
                                size="small"
                                disabled={
                                  index === keyframePromptPreviewRefFileIds.length - 1 ||
                                  keyframePromptActionLoading ||
                                  shotRenderPromptLoading
                                }
                                onClick={() => moveKeyframePromptRefFile(index, index + 1)}
                              >
                                Dịch phải
                              </Button>
                            </div>
                          </div>
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}
                </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Prompt cơ sở</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Mô tả nội dung khung hình, không chứa diễn giải ánh xạ ảnh.
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Tạo bằng AI sẽ kế thừa style dự án hiện tại và ưu tiên tham khảo các thiết lập nhân vật, bối cảnh, đạo cụ, trang phục đã xác nhận.
                    </div>
                  </div>
                  <Space size="small">
                    <Tag color={hasBasePrompt ? 'blue' : 'default'}>{hasBasePrompt ? 'Có thể chỉnh sửa' : 'Chưa tạo'}</Tag>
                    <Button
                      size="small"
                      type={hasBasePrompt ? 'default' : 'primary'}
                      loading={keyframePromptActionLoading}
                      onClick={() => void regenerateKeyframePrompt()}
                    >
                      AItạo
                    </Button>
                  </Space>
                </div>
                {!hasBasePrompt ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    hiện chưa có prompt nền. Bạn có thể để AI sinh một bản trước rồi sửa theo cần；hoặc cũng có thể tự nhập trực tiếp.
                  </div>
                  ) : null}
                  {hasPromptQualityChecks ? (
                    <div
                      className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                        keyframePromptQualityChecks?.passed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag color={keyframePromptQualityChecks?.passed ? 'green' : 'gold'}>
                          {keyframePromptQualityChecks?.passed ? 'Xác thực chất lượng đạt' : 'Đã kích hoạt sửa tự động'}
                        </Tag>
                        <span>
                          {keyframePromptQualityChecks?.passed
                            ? 'Lần tạo AI này đã vượt qua xác thực chất lượng cơ bản.'
                            : 'lượt sinh AI này đã kích hoạt hiệu chỉnh tự động, hệ thống đã dọn theo mức có thể nội dung không khớp yêu cầu prompt nền.'}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <Input.TextArea
                    rows={6}
                    value={keyframePromptPreviewDraft}
                    onChange={(e) => {
                      keyframePromptDraft.setBase((prev) => ({ ...prev, prompt: e.target.value }))
                      if (!e.target.value.trim()) {
                        keyframePromptDraft.resetDerived()
                      }
                    }}
                    placeholder="vui lòng nhập prompt nền, ví dụ hành động nhân vật, không khí bối cảnh, góc shot…"
                    disabled={keyframePromptActionLoading || shotRenderPromptLoading}
                  />
                  {keyframeGuidanceSummary.length > 0 || debugDirectorCommandSummary ? (
                    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">cơ sở sinh prompt nền</div>
                          <div className="mt-1 text-sky-700">
                            Các ràng buộc đạo diễn này chủ yếu dùng để tạo prompt nền tảng phía upstream, mặc định chỉ xem tóm tắt; một số ít quy tắc ưu tiên cao mới bước tiếp vào prompt ảnh cuối cùng.
                          </div>
                        </div>
                        <Button size="small" type="text" onClick={() => setKeyframeDirectiveCollapsed((prev) => !prev)}>
                          {keyframeDirectiveCollapsed ? 'mở rộng chi tiết' : 'thu gọn chi tiết'}
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Tag color="red">{`Bắt buộc ${guidanceLevelSummary.must}`}</Tag>
                        <Tag color="blue">{`Ưu tiên ${guidanceLevelSummary.prefer}`}</Tag>
                        <Tag>{`thường ${guidanceLevelSummary.normal}`}</Tag>
                        {actionBeatPhaseTags.length > 0 ? (
                          <Tag color="purple">{`Giai đoạn hành động ${actionBeatPhaseTags.length}`}</Tag>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(keyframeDirectiveCollapsed
                          ? (
                            parsedDirectorCommandSummary.length > 0
                              ? parsedDirectorCommandSummary
                                  .slice(0, 2)
                                  .map((item) => `${item.level === 'must' ? 'Bắt buộc' : 'Ưu tiên'} · ${item.text}`)
                              : keyframeGuidanceSummary.slice(0, 2)
                          )
                          : keyframeGuidanceSummary
                        ).map((item) => (
                          <Tooltip key={item} title={item}>
                            <Tag color="blue" className="max-w-[240px] overflow-hidden">
                              <span className="inline-block max-w-[200px] truncate align-bottom">{item}</span>
                            </Tag>
                          </Tooltip>
                        ))}
                      </div>
                      {actionBeatPhaseTags.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-slate-800">Giai đoạn hành động mà khung hình hiện tại tiêu thụ</div>
                            {debugSelectedActionBeatPhase && debugSelectedActionBeatText ? (
                              <Tag color="purple">
                                {`${debugSelectedActionBeatPhase} · ${debugSelectedActionBeatText}`}
                              </Tag>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {actionBeatPhaseTags.map((item, index) => (
                              <Tooltip key={`${item.phaseLabel}:${index}:${item.text}`} title={`${item.phaseLabel} · ${item.text}`}>
                                <Tag
                                  color={
                                    item.phaseLabel === 'Kích hoạt'
                                      ? 'gold'
                                      : item.phaseLabel === 'Đỉnh'
                                        ? 'blue'
                                        : 'green'
                                  }
                                  className="max-w-[240px] overflow-hidden"
                                >
                                  <span className="inline-block max-w-[200px] truncate align-bottom">
                                    {item.phaseLabel} · {item.text}
                                  </span>
                                </Tag>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {!keyframeDirectiveCollapsed ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {debugDirectorCommandSummary ? (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs text-indigo-800">
                              <div className="font-medium">lệnh đạo diễn ưu tiên cao</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {parsedDirectorCommandSummary.map((item, index) => (
                                  <Tooltip key={`${item.level}:${index}:${item.text}`} title={`${item.level === 'must' ? 'Bắt buộc' : 'Ưu tiên'} · ${item.text}`}>
                                    <Tag
                                      color={item.level === 'must' ? 'red' : 'blue'}
                                      className="max-w-[240px] overflow-hidden"
                                    >
                                      <span className="inline-block max-w-[200px] truncate align-bottom">
                                        {item.level === 'must' ? 'Bắt buộc' : 'Ưu tiên'} · {item.text}
                                      </span>
                                    </Tag>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {keyframeGuidanceSummary.length > 0 ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-800">
                              <div className="font-medium">Guidance bổ sung</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {keyframeGuidanceSummary.map((item) => (
                                  <Tooltip key={item} title={item}>
                                    <Tag color="blue" className="max-w-[220px] overflow-hidden">
                                      <span className="inline-block max-w-[180px] truncate align-bottom">{item}</span>
                                    </Tag>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {hasPromptDebugContext ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-700">Bối cảnh tạo bằng AI gần nhất</div>
                        <Space size="small">
                          <Tag color="default">Thông tin gỡ lỗi</Tag>
                          <Button
                            size="small"
                            type="text"
                            onClick={() => setKeyframePromptDebugCollapsed((prev) => !prev)}
                          >
                            {keyframePromptDebugCollapsed ? 'mở rộng chi tiết' : 'thu gọn chi tiết'}
                          </Button>
                        </Space>
                      </div>
                      {keyframePromptDebugCollapsed ? (
                        <div className="mt-2 text-slate-500">
                          Thông tin gỡ lỗi mặc định là thu gọn; sau khi mở rộng có thể xem phong cách dự án, mô tả phân cảnh, ràng buộc liên tục và ngữ cảnh thực thể được dùng trong lần tạo AI gần nhất.
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="text-slate-500">phong cách dự án</div>
                            <div className="mt-1 text-slate-700">
                              {[debugVisualStyle, debugStyle].filter(Boolean).join(' / ') || 'Không có'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">phong cách thống nhất</div>
                            <div className="mt-1 text-slate-700">{debugUnifyStyle || 'Không có'}</div>
                          </div>
                          {debugShotDescription ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">mô tả bổ sung shot</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugShotDescription}</div>
                            </div>
                          ) : null}
                          {debugDialogSummary ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">tóm tắt thoại</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugDialogSummary}</div>
                            </div>
                          ) : null}
                          {debugActionBeatPhases ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">giai đoạn mốc hành động</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {actionBeatPhaseTags.map((item, index) => (
                                  <Tag
                                    key={`debug-action-phase:${index}:${item.text}`}
                                    color={
                                      item.phaseLabel === 'Kích hoạt'
                                        ? 'gold'
                                        : item.phaseLabel === 'Đỉnh'
                                          ? 'blue'
                                          : 'green'
                                    }
                                  >
                                    {`${item.phaseLabel} · ${item.text}`}
                                  </Tag>
                                ))}
                              </div>
                              {debugSelectedActionBeatPhase || debugSelectedActionBeatText ? (
                                <div className="mt-2 text-slate-700">
                                  {`Khung hình hiện tại ưu tiên dùng: ${[debugSelectedActionBeatPhase, debugSelectedActionBeatText].filter(Boolean).join(' · ')}`}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {debugPreviousShotTitle || debugPreviousShotScriptExcerpt || debugPreviousShotEndState ? (
                            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                              <div className="text-slate-500">tiếp nối shot trước</div>
                              <div className="mt-1 space-y-1 text-slate-700">
                                {debugPreviousShotTitle ? <div>Tiêu đề: {debugPreviousShotTitle}</div> : null}
                                {debugPreviousShotScriptExcerpt ? (
                                  <div className="whitespace-pre-wrap">Trích dẫn: {debugPreviousShotScriptExcerpt}</div>
                                ) : null}
                                {debugPreviousShotEndState ? (
                                  <div className="whitespace-pre-wrap">Trạng thái kết thúc: {debugPreviousShotEndState}</div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {debugNextShotTitle || debugNextShotScriptExcerpt || debugNextShotStartGoal ? (
                            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                              <div className="text-slate-500">nối tiếp shot tiếp theo</div>
                              <div className="mt-1 space-y-1 text-slate-700">
                                {debugNextShotTitle ? <div>Tiêu đề: {debugNextShotTitle}</div> : null}
                                {debugNextShotScriptExcerpt ? (
                                  <div className="whitespace-pre-wrap">Trích dẫn: {debugNextShotScriptExcerpt}</div>
                                ) : null}
                                {debugNextShotStartGoal ? (
                                  <div className="whitespace-pre-wrap">Mục tiêu khởi đầu: {debugNextShotStartGoal}</div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {debugContinuityGuidance ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">Gợi ý liên tục</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugContinuityGuidance}</div>
                            </div>
                          ) : null}
                          {debugCompositionAnchor ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">Bố cục và mỏ neo không gian</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugCompositionAnchor}</div>
                            </div>
                          ) : null}
                          {debugScreenDirectionGuidance ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">Gợi ý hướng nhìn và ánh mắt</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugScreenDirectionGuidance}</div>
                            </div>
                          ) : null}
                          {debugFrameSpecificGuidance ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">đề xuất chuyên biệt khung hiện tại</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugFrameSpecificGuidance}</div>
                            </div>
                          ) : null}
                          {debugCharacterContext ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">ngữ cảnh nhân vật</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugCharacterContext}</div>
                            </div>
                          ) : null}
                          {debugSceneContext ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">ngữ cảnh bối cảnh</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugSceneContext}</div>
                            </div>
                          ) : null}
                          {debugPropContext ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">ngữ cảnh đạo cụ</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugPropContext}</div>
                            </div>
                          ) : null}
                          {debugCostumeContext ? (
                            <div className="md:col-span-2">
                              <div className="text-slate-500">ngữ cảnh trang phục</div>
                              <div className="mt-1 whitespace-pre-wrap text-slate-700">{debugCostumeContext}</div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Prompt tạo cuối cùng</div>
                      <div className="mt-1 text-xs text-slate-500">
                        hệ thống sẽ tự động sinh nội dung phiên này dựa trên prompt nền và thứ tự ảnh tham chiếu hiện tại, khi gửi cho mô hình sẽ dùng kết quả ở đây.
                      </div>
                    </div>
                    <Space size="small">
                      <Tag color="geekblue">Hệ thống tạo</Tag>
                      <Tag>Chỉ đọc</Tag>
                      <Button
                        size="small"
                        onClick={() =>
                          void renderShotPromptToTextarea({
                            frameType: keyframePromptPreviewFrameType,
                            prompt: keyframePromptPreviewDraft,
                            refFileIds:
                              keyframePromptPreviewRefFileIds.length > 0
                                ? keyframePromptPreviewRefFileIds
                                : autoKeyframeRefFileIds,
                          })
                        }
                        disabled={!hasBasePrompt}
                        loading={shotRenderPromptLoading}
                      >
                        Đồng bộ lại
                      </Button>
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(keyframePromptRenderedDraft || '')
                            message.success('Đã sao chép prompt cuối cùng')
                          } catch {
                            message.error('Sao chép thất bại')
                          }
                        }}
                        disabled={!keyframePromptRenderedDraft.trim()}
                      >
                        Sao chép
                      </Button>
                    </Space>
                  </div>
                  <div
                    className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                      renderStatusMeta.color === 'green'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : renderStatusMeta.color === 'blue'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : renderStatusMeta.color === 'red'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : renderStatusMeta.color === 'gold'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag color={renderStatusMeta.color}>{renderStatusMeta.label}</Tag>
                      <span>{renderStatusMeta.description}</span>
                    </div>
                  </div>
                  {keyframePromptRenderMappings.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {keyframePromptRenderMappings.map((mapping) => (
                        <Tag key={`${mapping.token}:${mapping.file_id}`}>{`${mapping.token} = ${mapping.name}`}</Tag>
                      ))}
                    </div>
                  ) : null}
                  {keyframePromptSelectedGuidance.length > 0 || keyframePromptDroppedGuidance.length > 0 ? (
                    <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">Kết quả hội tụ prompt ảnh cuối cùng</div>
                          <div className="mt-1 text-slate-500">
                            Hệ thống sẽ chọn từ ràng buộc đạo diễn thượng nguồn một số quy tắc quan trọng nhất, bổ sung vào prompt hình ảnh cuối cùng.
                          </div>
                        </div>
                        <Space size="small" wrap>
                          <Tag color="green">{`Giữ lại ${keyframePromptSelectedGuidance.length}`}</Tag>
                          <Tag color="gold">{`Nén ${keyframePromptDroppedGuidance.length}`}</Tag>
                          {(keyframePromptSelectedGuidance.length > 2 || keyframePromptDroppedGuidance.length > 0) ? (
                            <Button
                              size="small"
                              type="text"
                              onClick={() => setKeyframePromptDecisionCollapsed((prev) => !prev)}
                            >
                              {keyframePromptDecisionCollapsed ? 'Xem sự đánh đổi' : 'Thu gọn sự đánh đổi'}
                            </Button>
                          ) : null}
                        </Space>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
                          <div className="font-medium">Guidance được giữ lại</div>
                          {keyframePromptSelectedGuidance.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {keyframePromptVisibleSelectedGuidanceDetails.map((item) => (
                                <Tooltip
                                  key={`selected:${item.text}`}
                                  title={(
                                    <div className="max-w-[320px] text-xs leading-5">
                                      {item.reasonTag ? (
                                        <Tag color="green" className="mb-1">
                                          {item.reasonTag}
                                        </Tag>
                                      ) : null}
                                      <div>{item.text}</div>
                                      {item.reason ? <div className="mt-1 text-slate-500">{item.reason}</div> : null}
                                    </div>
                                  )}
                                >
                                  <Tag color="green" className="max-w-[240px] overflow-hidden">
                                    <span className="inline-block max-w-[200px] truncate align-bottom">{item.text}</span>
                                  </Tag>
                                </Tooltip>
                              ))}
                              {keyframePromptDecisionCollapsed && keyframePromptSelectedGuidanceDetails.length > 2 ? (
                                <Tag>{`+${keyframePromptSelectedGuidanceDetails.length - 2} mục`}</Tag>
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-2 text-emerald-700">Hiện không có guidance bổ sung nào được giữ.</div>
                          )}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                          <div className="font-medium">Guidance đã nén</div>
                          {keyframePromptDroppedGuidance.length > 0 ? (
                            keyframePromptDecisionCollapsed ? (
                              <div className="mt-2 text-amber-700">
                                Hiện có {keyframePromptDroppedGuidance.length} guidance bị nén, xem chi tiết lý do chọn/bỏ sau khi mở rộng.
                              </div>
                            ) : (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {keyframePromptVisibleDroppedGuidanceDetails.map((item) => (
                                  <Tooltip
                                    key={`dropped:${item.text}`}
                                    title={(
                                      <div className="max-w-[320px] text-xs leading-5">
                                        {item.reasonTag ? (
                                          <Tag color="gold" className="mb-1">
                                            {item.reasonTag}
                                          </Tag>
                                        ) : null}
                                        <div>{item.text}</div>
                                        {item.reason ? <div className="mt-1 text-slate-500">{item.reason}</div> : null}
                                      </div>
                                    )}
                                  >
                                    <Tag color="gold" className="max-w-[240px] overflow-hidden">
                                      <span className="inline-block max-w-[200px] truncate align-bottom">{item.text}</span>
                                    </Tag>
                                  </Tooltip>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="mt-2 text-amber-700">Hiện không có guidance nào bị nén.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {hasBasePrompt ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-800 whitespace-pre-wrap min-h-[220px]">
                      {keyframePromptRenderedDraft || 'Hệ thống đang chuẩn bị prompt cuối cùng dựa trên nội dung hiện tại…'}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                      <div className="font-medium text-slate-700">Đợi prompt nền tảng</div>
                      <div className="mt-2">
                        Sau khi chuẩn bị xong prompt cơ bản, hệ thống sẽ tự động:
                      </div>
                      <div className="mt-2 space-y-1 text-slate-500">
                        <div>1. Tạo ánh xạ 图1 / 图2 theo thứ tự ảnh tham chiếu hiện tại</div>
                        <div>2. Bổ sung “## Diễn giải nội dung hình ảnh”</div>
                        <div>3. Tạo prompt cuối cùng để gửi cho mô hình</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </Modal>

        <Modal
          title="Xem trước prompt tạo video"
          open={videoPromptPreviewOpen}
          onCancel={() => {
            if (videoPromptPreviewSubmitting) return
            setVideoPromptPreviewOpen(false)
          }}
          okText="Tạo"
          cancelText="Hủy"
          onOk={() => void submitVideoGeneration()}
          confirmLoading={videoPromptPreviewSubmitting}
          width={900}
          destroyOnClose
        >
          {videoPromptPreviewLoading ? (
            <div className="py-8 text-center">
              <Spin />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700">Bối cảnh liên tục của phân cảnh</div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-500">
                      những ngữ cảnh này sẽ tham gia render mẫu video và tăng cường prompt cuối, mặc định trước chỉ hiển thị tóm tắt, cần thì mới mở rộng chi tiết.
                    </div>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    className="px-0"
                    onClick={() => setVideoPromptContextCollapsed((prev) => !prev)}
                  >
                    {videoPromptContextCollapsed ? 'mở rộng chi tiết' : 'thu gọn chi tiết'}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag color="blue">{`Mốc hành động ${videoActionBeats.length}`}</Tag>
                  {videoPromptPreviewPack?.previous_shot_summary ? (
                    <Tag color="purple">Phân cảnh trước</Tag>
                  ) : null}
                  {videoPromptPreviewPack?.next_shot_goal ? (
                    <Tag color="cyan">Phân cảnh tiếp theo</Tag>
                  ) : null}
                  {videoPromptPreviewPack?.continuity_guidance ? (
                    <Tag color="gold">Liên tục</Tag>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-slate-500">nhịp hành động</div>
                    {videoVisibleActionBeats.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {videoVisibleActionBeats.map((item, index) => (
                          <Tag
                            key={`${index}:${item.phase ?? 'raw'}:${item.text}`}
                            color={
                              item.phase === 'trigger'
                                ? 'gold'
                                : item.phase === 'peak'
                                  ? 'blue'
                                  : item.phase === 'aftermath'
                                    ? 'green'
                                    : 'default'
                            }
                          >
                            {item.phase
                              ? `${item.phase === 'trigger' ? 'Kích hoạt' : item.phase === 'peak' ? 'Đỉnh' : 'Khép lại'} · ${item.text}`
                              : item.text}
                          </Tag>
                        ))}
                        {videoPromptContextCollapsed && hiddenVideoActionBeatCount > 0 ? (
                          <Tag>{`+${hiddenVideoActionBeatCount}`}</Tag>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-1 text-gray-400">chưa có nhịp hành động</div>
                    )}
                  </div>
                  {!videoPromptContextCollapsed ? (
                    <>
                      <div>
                        <div className="text-slate-500">tóm tắt shot trước</div>
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                          {videoPromptPreviewPack?.previous_shot_summary || 'Trống'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">mục tiêu shot tiếp theo</div>
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                          {videoPromptPreviewPack?.next_shot_goal || 'không có'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Gợi ý liên tục</div>
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                          {videoPromptPreviewPack?.continuity_guidance || 'Trống'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Bố cục và mỏ neo không gian</div>
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                          {videoPromptPreviewPack?.composition_anchor || 'Trống'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Gợi ý hướng nhìn và ánh mắt</div>
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                          {videoPromptPreviewPack?.screen_direction_guidance || 'Trống'}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Hình liên kết (ảnh tham chiếu)</div>
                {videoPromptPreviewImages.length === 0 ? (
                  <div className="text-xs text-gray-400">Chưa có ảnh liên kết</div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <Image.PreviewGroup>
                      {videoPromptPreviewImages.map((fid) => (
                        <Image
                          key={fid}
                          width={72}
                          height={72}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                          src={buildFileDownloadUrl(fid)}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Prompt (chỉnh sửa được)</div>
                <Input.TextArea
                  rows={10}
                  value={videoPromptPreviewDraft}
                  onChange={(e) => videoPromptDraft.setBase({ prompt: e.target.value })}
                  placeholder="Vui lòng nhập prompt video…"
                  disabled={videoPromptPreviewSubmitting}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
