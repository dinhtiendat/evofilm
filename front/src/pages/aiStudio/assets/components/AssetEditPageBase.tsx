import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, CloseCircleOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { FilmService, ScriptProcessingService } from '../../../../services/generated'
import type { TaskStatus } from '../../../../services/generated'
import { listTaskLinksNormalized } from '../../../../services/filmTaskLinks'
import { buildFileDownloadUrl } from '../utils'
import { DisplayImageCard } from './DisplayImageCard'
import { ProjectVisualStyleAndStyleFields } from '../../project/ProjectVisualStyleAndStyleFields'
import { useProjectStyleOptions } from '../../project/useProjectStyleOptions'
import { defaultTaskActionErrorMessage, executeAsyncTaskCreate, executeTaskCancel, notifyExistingTask } from '../../components/taskActionHelpers'
import { handleTaskResultSafely } from '../../components/taskResultHelpers'
import { useRelationTaskNotification } from '../../components/taskNotificationHelpers'
import { useTaskPageContext } from '../../components/taskPageContext'
import { TASK_COPY } from '../../components/taskCopy'
import { useLocation } from 'react-router-dom'
import { useGenerationDraft } from '../../hooks/useGenerationDraft'
import {
  CHARACTER_PORTRAIT_ANALYSIS_RELATION_TYPE,
  COSTUME_INFO_ANALYSIS_RELATION_TYPE,
  PROP_INFO_ANALYSIS_RELATION_TYPE,
  SCENE_INFO_ANALYSIS_RELATION_TYPE,
  type RelationTaskState,
  toRelationTaskStateFromStatusRead,
  useCancelableRelationTask,
} from '../../project/ProjectWorkbench/chapterDivisionTasks'

const MAX_VIEW_COUNT = 4
// Giá trị mã trùng với `AssetViewAngle` của backend (backend/app/models/studio.py)
export type AssetViewAngle =
  | 'FRONT'
  | 'LEFT'
  | 'RIGHT'
  | 'BACK'
  | 'THREE_QUARTER'
  | 'TOP'
  | 'DETAIL'

export type AssetUpdate = {
  name: string
  description: string
  tags: string[]
  view_count: number
  visual_style: 'live_action' | 'anime'
  style?: string
}

const DEFAULT_ANGLES: AssetViewAngle[] = ['FRONT', 'LEFT', 'RIGHT', 'BACK']

const ANGLE_LABEL_MAP: Record<AssetViewAngle, string> = {
  FRONT: 'Mặt trước',
  LEFT: 'Bên trái',
  RIGHT: 'Bên phải',
  BACK: 'Mặt sau',
  THREE_QUARTER: '3/4 nghiêng',
  TOP: 'Nhìn từ trên xuống',
  DETAIL: 'Chi tiết',
}

export type BaseAsset = {
  id: string
  name: string
  description?: string
  tags?: string[]
  view_count?: number
  visual_style?: 'live_action' | 'anime'
  style?: string
}

export type BaseAssetImage = {
  id: number
  view_angle?: AssetViewAngle
  file_id?: string | null
  width?: number | null
  height?: number | null
  format?: string | null
}

export type AssetEditPageBaseProps<TAsset extends BaseAsset, TImage extends BaseAssetImage> = {
  assetId?: string
  missingAssetIdText: string
  assetDisplayName: string
  backTo: string
  relationType: string
  getAsset: (assetId: string) => Promise<TAsset | null>
  updateAsset: (assetId: string, payload: AssetUpdate) => Promise<TAsset | null>
  listImages: (assetId: string) => Promise<TImage[]>
  createImageSlot: (assetId: string, angle: AssetViewAngle) => Promise<void>
  updateImage: (assetId: string, imageId: number, payload: { file_id: string; width?: number | null; height?: number | null; format?: string | null }) => Promise<void>
  renderPrompt: (assetId: string, imageId: number) => Promise<{ prompt: string; images: string[] }>
  createGenerationTask: (assetId: string, imageId: number, payload: { prompt: string; images: string[] }) => Promise<string | null>
  onNavigate: (to: string, replace?: boolean) => void
}

type HistoryCandidate<TImage extends BaseAssetImage> = {
  id: string
  file_id: string
  view_angle?: AssetViewAngle
  width?: number | null
  height?: number | null
  format?: string | null
  source: 'task-link' | 'image'
  originalImage?: TImage
}

function normalizeTags(input: string): string[] {
  return input
    .split(/[,，\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
}

function clampViewCount(value?: number | null): number {
  const next = Number.isFinite(value as number) ? Number(value) : 1
  return Math.max(1, Math.min(MAX_VIEW_COUNT, Math.trunc(next)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isTerminalStatus(status: TaskStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

function getSmartDetectRelationType(relationType: string): string | null {
  if (relationType === 'actor_image' || relationType === 'character_image') return CHARACTER_PORTRAIT_ANALYSIS_RELATION_TYPE
  if (relationType === 'scene_image') return SCENE_INFO_ANALYSIS_RELATION_TYPE
  if (relationType === 'prop_image') return PROP_INFO_ANALYSIS_RELATION_TYPE
  if (relationType === 'costume_image') return COSTUME_INFO_ANALYSIS_RELATION_TYPE
  return null
}

function getAssetNavigateRelationType(relationType: string): string | null {
  if (relationType === 'actor_image') return 'actor'
  if (relationType === 'character_image') return 'character'
  if (relationType === 'scene_image') return 'scene'
  if (relationType === 'prop_image') return 'prop'
  if (relationType === 'costume_image') return 'costume'
  return null
}

export function AssetEditPageBase<TAsset extends BaseAsset, TImage extends BaseAssetImage>({
  assetId,
  missingAssetIdText,
  assetDisplayName,
  backTo,
  relationType,
  getAsset,
  updateAsset,
  listImages,
  createImageSlot,
  updateImage,
  renderPrompt,
  createGenerationTask,
  onNavigate,
}: AssetEditPageBaseProps<TAsset, TImage>) {
  const { options: projectStyleOptions, defaultVisualStyle, getDefaultStyle } = useProjectStyleOptions()
  const taskCopy = TASK_COPY.smartDetect
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [asset, setAsset] = useState<TAsset | null>(null)
  const [images, setImages] = useState<TImage[]>([])

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formViewCount, setFormViewCount] = useState(1)
  const [formVisualStyle, setFormVisualStyle] = useState<'live_action' | 'anime'>(defaultVisualStyle as 'live_action' | 'anime')
  const [formStyle, setFormStyle] = useState<string>(getDefaultStyle(defaultVisualStyle))
  const [savingBase, setSavingBase] = useState(false)

  const [smartDetectLoading, setSmartDetectLoading] = useState(false)
  const [smartDetectOpen, setSmartDetectOpen] = useState(false)
  const [smartDetectIssues, setSmartDetectIssues] = useState<string[]>([])
  const [smartDetectOptimizedDesc, setSmartDetectOptimizedDesc] = useState('')

  const [generatingByImageId, setGeneratingByImageId] = useState<Record<number, boolean>>({})
  const [generationTask, setGenerationTask] = useState<RelationTaskState | null>(null)
  const [generationSettledTask, setGenerationSettledTask] = useState<RelationTaskState | null>(null)

  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false)
  const [promptPreviewImage, setPromptPreviewImage] = useState<TImage | null>(null)
  const promptDraft = useGenerationDraft<
    { prompt: string },
    { imageId: number | null; images: string[] },
    { prompt: string; images: string[] },
    { taskId: string | null }
  >({
    initialBase: { prompt: '' },
    initialContext: { imageId: null, images: [] },
    derive: async ({ base, context }) => {
      if (!assetId || !context.imageId) {
        throw new Error('asset image slot is required')
      }
      const result = await renderPrompt(assetId, context.imageId)
      return {
        prompt: (base.prompt || '').trim() || (result.prompt ?? ''),
        images: Array.isArray(result.images) ? result.images.filter(Boolean) : [],
      }
    },
    submit: async ({ context, derived }) => {
      if (!assetId || !context.imageId) {
        throw new Error('asset image slot is required')
      }
      const taskId = await createGenerationTask(assetId, context.imageId, {
        prompt: (derived.prompt || '').trim(),
        images: derived.images,
      })
      return { taskId }
    },
  })
  const promptPreviewDraft = promptDraft.base.prompt
  const promptPreviewRefFileIds = promptDraft.context.images

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyCandidates, setHistoryCandidates] = useState<HistoryCandidate<TImage>[]>([])
  const [editingSlotImage, setEditingSlotImage] = useState<TImage | null>(null)
  const [adoptingImageId, setAdoptingImageId] = useState<string | null>(null)
  const smartDetectRelationType = useMemo(() => getSmartDetectRelationType(relationType), [relationType])
  const smartDetectRelationEntityId = useMemo(
    () => (assetId && smartDetectRelationType ? `${relationType}:${assetId}` : null),
    [assetId, relationType, smartDetectRelationType],
  )
  const assetNavigateRelationType = useMemo(
    () => getAssetNavigateRelationType(relationType),
    [relationType],
  )
  const applySmartDetectResult = useCallback(async (taskId: string) => {
    await handleTaskResultSafely(taskId, {
      readErrorMessage: 'Đọc kết quả kiểm tra thông minh thất bại',
      failedFallbackMessage: 'Kiểm tra thông minh thất bại',
      onSucceeded: (resultValue) => {
        const result = resultValue as Record<string, any>
        const issues = Array.isArray(result.issues)
          ? result.issues.filter((it: unknown): it is string => typeof it === 'string' && it.trim().length > 0)
          : []
        const optimizedDesc = String(result.optimized_description ?? '').trim()
        setSmartDetectIssues(issues)
        setSmartDetectOptimizedDesc(optimizedDesc)
        setSmartDetectOpen(true)
        if (issues.length > 0) message.warning(`Phát hiện ${issues.length} mục có thể thiếu thông tin`)
        else message.success('Không phát hiện thông tin thiếu')
      },
      onFailed: (errorMessage) => {
        message.error(errorMessage)
      },
      onReadError: () => {
        message.error('Đọc kết quả kiểm tra thông minh thất bại')
      },
    })
  }, [])
  const { task: smartDetectTask, settledTask: smartDetectSettledTask, trackTaskData: trackSmartDetectTaskData, applyCancelData: applySmartDetectCancelData } = useCancelableRelationTask({
    enabled: !!assetId && !!smartDetectRelationType && !!smartDetectRelationEntityId,
    relationType: smartDetectRelationType || '',
    relationEntityId: smartDetectRelationEntityId,
    onTaskSettled: applySmartDetectResult,
  })
  useTaskPageContext(
    [
      smartDetectRelationType && smartDetectRelationEntityId
        ? {
            relationType: smartDetectRelationType,
            relationEntityId: smartDetectRelationEntityId,
          }
        : null,
      assetNavigateRelationType && assetId
        ? {
            relationType: assetNavigateRelationType,
            relationEntityId: assetId,
          }
        : null,
    ],
  )
  const smartDetectBusy = smartDetectLoading || !!smartDetectTask

  const ensureImageSlots = useCallback(async (targetViewCount: number) => {
    if (!assetId) return []

    let current = await listImages(assetId)

    const byAngle = new Map<AssetViewAngle, TImage>()
    current.forEach((img) => {
      if (img.view_angle && !byAngle.has(img.view_angle)) {
        byAngle.set(img.view_angle, img)
      }
    })

    const requiredAngles = DEFAULT_ANGLES.slice(0, targetViewCount)
    let created = false

    for (const angle of requiredAngles) {
      if (!byAngle.get(angle)) {
        await createImageSlot(assetId, angle)
        created = true
      }
    }

    if (created) {
      current = await listImages(assetId)
    }

    return current
  }, [assetId, createImageSlot, listImages])

  const loadData = useCallback(async () => {
    if (!assetId) return

    setLoading(true)
    try {
      const nextAsset = await getAsset(assetId)
      if (!nextAsset) {
        message.error(`không tìm thấy tài nguyên ${assetDisplayName}`)
        onNavigate(backTo, true)
        return
      }

      setAsset(nextAsset)
      setFormName(nextAsset.name)
      setFormDesc(nextAsset.description ?? '')
      setFormTags((nextAsset.tags ?? []).join(', '))
      {
        const nextVisual = (nextAsset.visual_style ?? defaultVisualStyle) as 'live_action' | 'anime'
        setFormVisualStyle(nextVisual)
        setFormStyle((nextAsset.style as string | undefined) ?? getDefaultStyle(nextVisual))
      }

      const targetCount = clampViewCount(nextAsset.view_count)
      setFormViewCount(targetCount)

      const imageRows = await ensureImageSlots(targetCount)
      setImages(imageRows)
    } catch {
      message.error(`tải tài nguyên ${assetDisplayName} thất bại`)
    } finally {
      setLoading(false)
    }
  }, [assetId, assetDisplayName, backTo, defaultVisualStyle, ensureImageSlots, getAsset, getDefaultStyle, onNavigate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const slotItems = useMemo(() => {
    const count = clampViewCount(formViewCount)
    const byAngle = new Map<AssetViewAngle, TImage>()
    images.forEach((img) => {
      if (img.view_angle) byAngle.set(img.view_angle, img)
    })

    return DEFAULT_ANGLES.slice(0, count).map((angle) => {
      const image = byAngle.get(angle) ?? null
      return {
        angle,
        image,
        imageUrl: buildFileDownloadUrl(image?.file_id),
      }
    })
  }, [formViewCount, images])

  const minViewCount = useMemo(() => clampViewCount(asset?.view_count), [asset?.view_count])

  const handleSaveBaseInfo = async () => {
    if (!assetId || !asset) return
    if (!formName.trim()) {
      message.warning('Vui lòng nhập tên')
      return
    }

    setSavingBase(true)
    try {
      const nextViewCount = Math.max(minViewCount, clampViewCount(formViewCount))
      const payload: AssetUpdate = {
        name: formName.trim(),
        description: formDesc.trim(),
        tags: normalizeTags(formTags),
        view_count: nextViewCount,
        visual_style: formVisualStyle,
        style: formStyle,
      }
      const nextAsset = await updateAsset(assetId, payload)
      if (nextAsset) setAsset(nextAsset)
      message.success('Đã lưu thông tin cơ bản')
      await loadData()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSavingBase(false)
    }
  }

  const handleSmartDetectMissing = async () => {
    if (!assetId) return
    if (!smartDetectRelationEntityId) return

    const description = (formDesc || '').trim()
    if (!description) {
      if (relationType === 'actor_image') message.warning('Vui lòng nhập mô tả diễn viên trước rồi mới chạy kiểm tra thông minh')
      else if (relationType === 'scene_image') message.warning('Vui lòng nhập mô tả bối cảnh trước khi tiến hành phát hiện thông minh')
      else if (relationType === 'prop_image') message.warning('Vui lòng nhập mô tả đạo cụ trước rồi mới chạy kiểm tra thông minh')
      else if (relationType === 'costume_image') message.warning('Vui lòng nhập mô tả trang phục trước khi tiến hành phát hiện thông minh')
      return
    }

    if (notifyExistingTask(smartDetectTask, {
      cancellingMessage: taskCopy.cancellingMessage,
      runningMessage: taskCopy.runningMessage,
    })) {
      return
    }

    setSmartDetectLoading(true)
    try {
      const request = () => {
        if (relationType === 'actor_image') {
          const character_context = asset?.name ? `Tên nhân vật: ${formName}\nThẻ diễn viên: ${formTags}` : `Thẻ diễn viên: ${formTags}`
          return ScriptProcessingService.analyzeCharacterPortraitAsyncApiV1ScriptProcessingAnalyzeCharacterPortraitAsyncPost({
            requestBody: {
              relation_entity_id: smartDetectRelationEntityId,
              character_description: description,
              character_context: (character_context || '').trim() || null,
            },
          })
        }
        if (relationType === 'scene_image') {
          const scene_context = asset?.name ? `Tên bối cảnh: ${formName}\nThẻ: ${formTags}` : `Thẻ: ${formTags}`
          return ScriptProcessingService.analyzeSceneInfoAsyncApiV1ScriptProcessingAnalyzeSceneInfoAsyncPost({
            requestBody: {
              relation_entity_id: smartDetectRelationEntityId,
              scene_description: description,
              scene_context: (scene_context || '').trim() || null,
            },
          })
        }
        if (relationType === 'prop_image') {
          const prop_context = asset?.name ? `Tên đạo cụ: ${formName}\nThẻ: ${formTags}` : `Thẻ: ${formTags}`
          return ScriptProcessingService.analyzePropInfoAsyncApiV1ScriptProcessingAnalyzePropInfoAsyncPost({
            requestBody: {
              relation_entity_id: smartDetectRelationEntityId,
              prop_description: description,
              prop_context: (prop_context || '').trim() || null,
            },
          })
        }
        const costume_context = asset?.name ? `Tên trang phục: ${formName}\nThẻ: ${formTags}` : `Thẻ: ${formTags}`
        return ScriptProcessingService.analyzeCostumeInfoAsyncApiV1ScriptProcessingAnalyzeCostumeInfoAsyncPost({
          requestBody: {
            relation_entity_id: smartDetectRelationEntityId,
            costume_description: description,
            costume_context: (costume_context || '').trim() || null,
          },
        })
      }

      await executeAsyncTaskCreate({
        request,
        trackTaskData: trackSmartDetectTaskData,
        startedMessage: taskCopy.startedMessage,
        reusedMessage: taskCopy.reusedMessage,
        fallbackErrorMessage: 'Kiểm tra thông minh thất bại',
        getErrorMessage: (error, fallbackMessage) => {
          const maybeAny = error as { response?: { status?: number }; status?: number }
          const status = maybeAny?.response?.status ?? maybeAny?.status
          if (status === 404) {
            return 'Giao diện không tìm thấy: hãy chạy `pnpm run openapi:update` để tạo client code rồi thử lại'
          }
          return defaultTaskActionErrorMessage(error, fallbackMessage)
        },
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setSmartDetectLoading(false)
    }
  }

  const handleCancelSmartDetectTask = async () => {
    if (!smartDetectTask?.taskId) return
    try {
      await executeTaskCancel({
        taskId: smartDetectTask.taskId,
        reason: `người dùng hủy tác vụ kiểm tra thông minh ở trang chỉnh sửa tài nguyên ${assetDisplayName}`,
        applyCancelData: applySmartDetectCancelData,
        cancelledImmediatelyMessage: taskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: taskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ kiểm tra thông minh thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    }
  }

  useRelationTaskNotification({
    task: smartDetectTask,
    settledTask: smartDetectSettledTask,
    title: taskCopy.title,
    sourceLabel: formName?.trim() ? `${assetDisplayName}:${formName.trim()}` : `${assetDisplayName}trang chỉnh sửa`,
    runningDescription: taskCopy.runningDescription,
    cancellingDescription: taskCopy.cancellingDescription,
    successDescription: taskCopy.successDescription,
    cancelledDescription: taskCopy.cancelledDescription,
    failedDescription: taskCopy.failedDescription,
    onCancel: smartDetectTask ? () => void handleCancelSmartDetectTask() : null,
    onNavigate: () => onNavigate(location.pathname),
  })
  useRelationTaskNotification({
    task: generationTask,
    settledTask: generationSettledTask,
    title: TASK_COPY.imageGeneration.title,
    sourceLabel: formName?.trim() ? `${assetDisplayName}:${formName.trim()}` : `${assetDisplayName}trang chỉnh sửa`,
    runningDescription: TASK_COPY.imageGeneration.runningDescription,
    cancellingDescription: TASK_COPY.imageGeneration.cancellingDescription,
    successDescription: TASK_COPY.imageGeneration.successDescription,
    cancelledDescription: TASK_COPY.imageGeneration.cancelledDescription,
    failedDescription: TASK_COPY.imageGeneration.failedDescription,
    onCancel:
      generationTask?.taskId
        ? () =>
            void executeTaskCancel({
              taskId: generationTask.taskId,
              reason: `người dùng hủy tác vụ sinh ảnh ở trang chỉnh sửa tài nguyên ${assetDisplayName}`,
              applyCancelData: (data) => {
                setGenerationTask((current) =>
                  current
                    ? {
                        ...current,
                        taskId: data?.task_id || current.taskId,
                        status: (data?.status ?? current.status) as TaskStatus,
                        cancelRequested: data?.cancel_requested ?? true,
                      }
                    : current,
                )
                return null
              },
              cancelledImmediatelyMessage: TASK_COPY.imageGeneration.cancelledImmediatelyMessage,
              cancelRequestedMessage: TASK_COPY.imageGeneration.cancelRequestedMessage,
              fallbackErrorMessage: 'Hủy tác vụ tạo ảnh thất bại',
            })
        : null,
    onNavigate: () => onNavigate(location.pathname),
  })

  const openPromptPreview = async (image: TImage) => {
    if (!assetId) return

    try {
      setPromptPreviewOpen(true)
      setPromptPreviewLoading(true)
      setPromptPreviewImage(image)
      const nextContext = { imageId: image.id, images: [] }
      promptDraft.hydrate({
        base: { prompt: '' },
        context: nextContext,
      })
      const derived = await promptDraft.deriveNow({
        base: { prompt: '' },
        context: nextContext,
      })
      if (derived) {
        promptDraft.hydrate({
          base: { prompt: derived.prompt },
          context: { imageId: image.id, images: derived.images },
          derived,
        })
      }
    } catch {
      message.error('Lấy prompt thất bại')
    } finally {
      setPromptPreviewLoading(false)
    }
  }

  const confirmGenerateWithPrompt = async () => {
    if (!assetId || !promptPreviewImage) return
    const prompt = (promptPreviewDraft || '').trim()
    if (!prompt) {
      message.warning('Vui lòng nhập prompt')
      return
    }

    setGeneratingByImageId((prev) => ({ ...prev, [promptPreviewImage.id]: true }))
    try {
      const submitted = await promptDraft.submitNow()
      const taskId = submitted?.taskId
      if (!taskId) {
        message.error('Tạo tác vụ thất bại: thiếu ID tác vụ')
        return
      }
      setGenerationTask({
        taskId,
        status: 'pending',
        progress: 0,
        cancelRequested: false,
      })
      setGenerationSettledTask(null)

      let finalStatus: TaskStatus = 'pending'
      let finalTaskState: RelationTaskState | null = null
      for (let i = 0; i < 30; i += 1) {
        await sleep(2000)
        const statusRes = await FilmService.getTaskStatusApiV1FilmTasksTaskIdStatusGet({ taskId })
        const status = statusRes.data?.status
        if (!status) continue
        finalStatus = status
        if (statusRes.data) {
          finalTaskState = toRelationTaskStateFromStatusRead(statusRes.data)
          setGenerationTask(finalTaskState)
        }
        if (isTerminalStatus(status)) break
      }
      if (finalTaskState && isTerminalStatus(finalTaskState.status)) {
        setGenerationTask(null)
        setGenerationSettledTask(finalTaskState)
      }

      if (finalStatus === 'succeeded') {
        setPromptPreviewOpen(false)
        setPromptPreviewImage(null)
        await loadData()
      } else if (finalStatus !== 'failed' && finalStatus !== 'cancelled') {
        message.warning('Tác vụ tạo vẫn đang thực thi, vui lòng làm mới sau')
      }
    } catch {
      message.error('Khởi tạo quy trình tạo thất bại')
    } finally {
      setGeneratingByImageId((prev) => ({ ...prev, [promptPreviewImage.id]: false }))
    }
  }

  const openHistoryModal = async (targetImage: TImage) => {
    setEditingSlotImage(targetImage)
    setHistoryOpen(true)
    setHistoryLoading(true)

    try {
      const links = await listTaskLinksNormalized({
        resourceType: 'image',
        relationType,
        relationEntityId: String(targetImage.id),
      })
      const imagesByFileId = new Map<string, TImage>()
      images.forEach((img) => {
        if (img.file_id) {
          imagesByFileId.set(img.file_id, img)
        }
      })

      const seenFileIds = new Set<string>()
      const taskLinkCandidates: HistoryCandidate<TImage>[] = links
        .filter((link) => Boolean(link.file_id))
        .map((link) => {
          const fileId = String(link.file_id)
          const matchedImage = imagesByFileId.get(fileId)
          return {
            id: `task-link-${link.id}`,
            file_id: fileId,
            view_angle: matchedImage?.view_angle ?? targetImage.view_angle,
            width: matchedImage?.width ?? null,
            height: matchedImage?.height ?? null,
            format: matchedImage?.format ?? null,
            source: 'task-link' as const,
            originalImage: matchedImage,
          }
        })
        .filter((candidate) => {
          if (seenFileIds.has(candidate.file_id)) return false
          seenFileIds.add(candidate.file_id)
          return true
        })

      const fallbackCandidates: HistoryCandidate<TImage>[] = images
        .filter((img) => img.file_id && img.id !== targetImage.id && !seenFileIds.has(String(img.file_id)))
        .map((img) => ({
          id: `image-${img.id}`,
          file_id: String(img.file_id),
          view_angle: img.view_angle,
          width: img.width ?? null,
          height: img.height ?? null,
          format: img.format ?? null,
          source: 'image' as const,
          originalImage: img,
        }))

      setHistoryCandidates(taskLinkCandidates.length > 0 ? taskLinkCandidates : fallbackCandidates)
    } catch {
      message.error('Nạp ảnh tạo trước đó thất bại')
      setHistoryCandidates([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleAdoptHistoryImage = async (candidate: HistoryCandidate<TImage>) => {
    if (!assetId || !editingSlotImage || !candidate.file_id) return

    setAdoptingImageId(candidate.id)
    try {
      await updateImage(assetId, editingSlotImage.id, {
        file_id: candidate.file_id,
        width: candidate.width ?? null,
        height: candidate.height ?? null,
        format: candidate.format ?? null,
      })
      message.success('Đã cập nhật ảnh góc nhìn')
      setHistoryOpen(false)
      setEditingSlotImage(null)
      await loadData()
    } catch {
      message.error('Cập nhật ảnh góc nhìn thất bại')
    } finally {
      setAdoptingImageId(null)
    }
  }

  if (!assetId) {
    return (
      <Card>
        <Empty description={missingAssetIdText} />
      </Card>
    )
  }

  return (
    <div className="space-y-4 h-full overflow-auto">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(backTo)}>
              Trả về tài nguyên {assetDisplayName}
            </Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {assetDisplayName}Chỉnh sửa tài nguyên
            </Typography.Title>
            {asset?.id ? <Tag>{asset.id}</Tag> : null}
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
        </div>
      </Card>

      <Collapse
        defaultActiveKey={['base', 'views']}
        items={[
          {
            key: 'base',
            label: 'Hiển thị thông tin cơ bản',
            children: loading ? (
              <div className="py-8 text-center">
                <Spin />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-gray-600 text-sm mb-1">Tên</div>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} disabled={smartDetectBusy || savingBase} />
                </div>
                <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-gray-600 text-sm">mô tả</div>
                      {relationType === 'actor_image' ||
                      relationType === 'scene_image' ||
                      relationType === 'prop_image' ||
                      relationType === 'costume_image' ? (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => void handleSmartDetectMissing()}
                            loading={smartDetectLoading}
                            disabled={Boolean(loading) || !!smartDetectTask}
                          >
                            {smartDetectTask ? 'Đang kiểm tra' : 'Kiểm tra thông minh'}
                          </Button>
                          {smartDetectTask ? (
                            <Button
                              size="small"
                              danger
                              icon={<CloseCircleOutlined />}
                              disabled={smartDetectTask.cancelRequested}
                              onClick={() => void handleCancelSmartDetectTask()}
                            >
                              {smartDetectTask.cancelRequested ? 'Đang hủy' : 'Hủy phát hiện'}
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  <Input.TextArea
                    rows={4}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    disabled={smartDetectBusy || savingBase}
                  />
                </div>
                <div>
                  <div className="text-gray-600 text-sm mb-1">Nhãn (phân cách bằng dấu phẩy)</div>
                  <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} disabled={smartDetectBusy || savingBase} />
                </div>
                <div>
                  <div className="text-gray-600 text-sm mb-1">Số phân cảnh (chỉ tăng được, tối đa 4)</div>
                  <InputNumber
                    min={minViewCount}
                    max={4}
                    precision={0}
                    value={formViewCount}
                    onChange={(v) => setFormViewCount(v ?? minViewCount)}
                    disabled={smartDetectBusy || savingBase}
                  />
                </div>
                <div>
                  <div className="text-gray-600 text-sm mb-1">Phong cách thị giác</div>
                  <ProjectVisualStyleAndStyleFields
                    disabled={smartDetectBusy || savingBase}
                    visual_style={formVisualStyle}
                    style={formStyle}
                    options={projectStyleOptions}
                    onChange={(next) => {
                      setFormVisualStyle(next.visual_style)
                      setFormStyle(next.style)
                    }}
                  />
                </div>
                <Button type="primary" onClick={() => void handleSaveBaseInfo()} loading={savingBase || smartDetectLoading}>
                  Lưu thông tin cơ bản
                </Button>
              </div>
            ),
          },
          {
            key: 'views',
            label: 'Ảnh đa phân cảnh',
            children: (
              <Row gutter={[16, 16]}>
                {slotItems.map((slot) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={slot.angle}>
                    <DisplayImageCard
                      title={`góc chụp:${ANGLE_LABEL_MAP[slot.angle]}`}
                      imageUrl={slot.imageUrl}
                      imageAlt={slot.angle}
                      placeholder="Chưa có ảnh"
                      hoverable={false}
                      imageHeightClassName="h-44"
                      extra={slot.image ? <Tag color="blue">ID {slot.image.id}</Tag> : null}
                      footer={
                        <div className="flex items-center gap-2">
                          <Button
                            type="primary"
                            size="small"
                            disabled={!slot.image}
                            loading={Boolean(slot.image && generatingByImageId[slot.image.id])}
                            onClick={() => slot.image && void openPromptPreview(slot.image)}
                          >
                            Tạo
                          </Button>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={!slot.image}
                            onClick={() => slot.image && void openHistoryModal(slot.image)}
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      }
                    />
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />

      <Modal
        title="Ảnh tạo lịch sử"
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false)
          setEditingSlotImage(null)
        }}
        footer={null}
        width={960}
      >
        {historyLoading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : historyCandidates.length === 0 ? (
          <Empty description="Chưa có hình ảnh lịch sử khả dụng" />
        ) : (
          <Row gutter={[16, 16]}>
            {historyCandidates.map((candidate) => (
              <Col xs={24} sm={12} md={8} key={candidate.id}>
                <DisplayImageCard
                  title={candidate.view_angle ? `Góc: ${ANGLE_LABEL_MAP[candidate.view_angle] ?? candidate.view_angle}` : candidate.source === 'task-link' ? 'Sản phẩm tác vụ' : `Ảnh ${candidate.id}`}
                  imageUrl={buildFileDownloadUrl(candidate.file_id)}
                  imageAlt={candidate.id}
                  placeholder="Không có ảnh thu nhỏ"
                  hoverable={false}
                  imageHeightClassName="h-44"
                  footer={
                    <Button
                      className="mt-2"
                      type="primary"
                      size="small"
                      block
                      disabled={!candidate.file_id}
                      loading={adoptingImageId === candidate.id}
                      onClick={() => void handleAdoptHistoryImage(candidate)}
                    >
                      Chọn và cập nhật góc hiện tại
                    </Button>
                  }
                />
              </Col>
            ))}
          </Row>
        )}
      </Modal>

      <Modal
        title="Xem trước nội dung prompt"
        open={promptPreviewOpen}
        onCancel={() => {
          setPromptPreviewOpen(false)
          setPromptPreviewImage(null)
        }}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={Boolean(promptPreviewImage && generatingByImageId[promptPreviewImage.id])}
        onOk={() => void confirmGenerateWithPrompt()}
        destroyOnClose
        width={900}
      >
        {promptPreviewLoading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-2">Hình liên kết (ảnh tham chiếu)</div>
              {promptPreviewRefFileIds.length === 0 ? (
                <div className="text-xs text-gray-400">Chưa có ảnh liên kết</div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Image.PreviewGroup>
                    {promptPreviewRefFileIds.map((fid) => (
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
                value={promptPreviewDraft}
                onChange={(e) => promptDraft.setBase({ prompt: e.target.value })}
                placeholder="Vui lòng nhập prompt…"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Kiểm tra thông minh: thông tin thiếu"
        open={smartDetectOpen}
        onCancel={() => setSmartDetectOpen(false)}
        footer={null}
        destroyOnClose
        width={880}
      >
        {smartDetectLoading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {smartDetectIssues.length === 0 ? (
                <div className="text-sm text-gray-600">Không phát hiện thông tin thiếu.</div>
              ) : (
                <div className="text-sm text-gray-600">Phát hiện {smartDetectIssues.length} mục thông tin có thể đang thiếu (khuyến nghị tham khảo mô tả tối ưu bên dưới):</div>
              )}
              {smartDetectIssues.length > 0 ? (
                <div className="space-y-2">
                  {smartDetectIssues.map((it, idx) => (
                    <div key={`${idx}_${it}`} className="text-sm text-gray-800">
                      {idx + 1}. {it}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Mô tả đã tối ưu (điền trực tiếp được)</div>
              <Input.TextArea rows={6} value={smartDetectOptimizedDesc} readOnly />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  const next = smartDetectOptimizedDesc.trim()
                  if (!next) {
                    message.warning('Không trả về mô tả tối ưu hợp lệ')
                    return
                  }
                  setFormDesc(next)
                  setSmartDetectOpen(false)
                  message.success('Đã điền mô tả')
                }}
                disabled={!smartDetectOptimizedDesc.trim()}
              >
                Điền mô tả
              </Button>
              <Button onClick={() => setSmartDetectOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
