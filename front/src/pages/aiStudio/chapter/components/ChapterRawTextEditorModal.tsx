import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Collapse, Empty, Input, List, Modal, Space, Spin, Tag, message } from 'antd'
import {
  CloseCircleOutlined,
  DiffOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { ScriptProcessingService, StudioChaptersService } from '../../../../services/generated'
import type { ScriptConsistencyCheckResult } from '../../../../services/generated'
import {
  CONSISTENCY_CHECK_RELATION_TYPE,
  SCRIPT_OPTIMIZATION_RELATION_TYPE,
  SCRIPT_SIMPLIFICATION_RELATION_TYPE,
  useCancelableRelationTask,
} from '../../project/ProjectWorkbench/chapterDivisionTasks'
import { executeAsyncTaskCreate, executeTaskCancel, notifyExistingTask } from '../../components/taskActionHelpers'
import { handleTaskResultSafely } from '../../components/taskResultHelpers'
import { useRelationTaskNotification } from '../../components/taskNotificationHelpers'
import { useTaskPageContext } from '../../components/taskPageContext'
import { TASK_COPY } from '../../components/taskCopy'

type EditorMode = 'raw' | 'condensed' | 'compare'

type HistoryItem = {
  id: string
  at: number
  rawText: string
  condensedText: string
}

export function ChapterRawTextEditorModal({
  open,
  onClose,
  chapterId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  chapterId: string | undefined
  onSaved?: (next: { rawText?: string; condensedText?: string }) => void
}) {
  const consistencyTaskCopy = TASK_COPY.consistencyCheck
  const simplifyTaskCopy = TASK_COPY.scriptSimplify
  const optimizeTaskCopy = TASK_COPY.scriptOptimize
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [checkingConsistency, setCheckingConsistency] = useState(false)
  const [optimizingScript, setOptimizingScript] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [mode, setMode] = useState<EditorMode>('raw')
  const [rawText, setRawText] = useState('')
  const [condensedText, setCondensedText] = useState('')
  const [savedRawText, setSavedRawText] = useState('')
  const [savedCondensedText, setSavedCondensedText] = useState('')
  const [editorText, setEditorText] = useState('')
  const [compareRaw, setCompareRaw] = useState('')
  const [compareCondensed, setCompareCondensed] = useState('')
  const [consistencyResult, setConsistencyResult] = useState<ScriptConsistencyCheckResult | null>(null)

  const applyConsistencyTaskResult = useCallback(async (taskId: string) => {
    await handleTaskResultSafely(taskId, {
      readErrorMessage: 'Đọc kết quả kiểm tra tính nhất quán thất bại',
      failedFallbackMessage: 'Kiểm tra tính nhất quán thất bại',
      onSucceeded: (resultValue) => {
        setConsistencyResult(resultValue as ScriptConsistencyCheckResult)
        const result = resultValue as Record<string, any>
        if (result?.has_issues) {
          message.warning(`Phát hiện ${Array.isArray(result.issues) ? result.issues.length : 0} vấn đề nhầm lẫn nhân vật`)
        } else {
          message.success('Không phát hiện vấn đề nhầm lẫn nhân vật')
        }
      },
      onFailed: (errorMessage) => {
        message.error(errorMessage)
      },
      onReadError: () => {
        message.error('Đọc kết quả kiểm tra tính nhất quán thất bại')
      },
    })
  }, [])

  const applySimplifyResult = useCallback(async (taskId: string) => {
    await handleTaskResultSafely(taskId, {
      readErrorMessage: 'Đọc kết quả tinh giản thông minh thất bại',
      failedFallbackMessage: 'Tinh giản thông minh thất bại',
      onSucceeded: (resultValue) => {
        const result = resultValue as Record<string, any>
        const simplified = String(result?.simplified_script_text ?? '').trim()
        if (!simplified) {
          message.error('Tinh giản thông minh thất bại: không trả về nội dung hợp lệ')
          return
        }
        setCondensedText(simplified)
        if (mode === 'compare') {
          setCompareCondensed(simplified)
        } else {
          setMode('condensed')
          setEditorText(simplified)
        }
        message.success('Tóm gọn thông minh hoàn tất')
      },
      onFailed: (errorMessage) => {
        message.error(errorMessage)
      },
      onReadError: () => {
        message.error('Đọc kết quả tóm gọn thông minh thất bại')
      },
    })
  }, [mode])

  const applyOptimizeResult = useCallback(async (taskId: string) => {
    await handleTaskResultSafely(taskId, {
      readErrorMessage: 'Đọc kết quả tối ưu hóa một nút thất bại',
      failedFallbackMessage: 'Tối ưu hóa một nút thất bại',
      onSucceeded: (resultValue) => {
        const result = resultValue as Record<string, any>
        const optimized = String(result?.optimized_script_text ?? '').trim()
        if (!optimized) {
          message.error('Tối ưu hóa một nút thất bại: không trả về nội dung hợp lệ')
          return
        }
        setRawText(optimized)
        setEditorText(optimized)
        setMode('raw')
        setCompareRaw(optimized)
        message.success('Tối ưu một chạm hoàn tất')
      },
      onFailed: (errorMessage) => {
        message.error(errorMessage)
      },
      onReadError: () => {
        message.error('Đọc kết quả tối ưu một chạm thất bại')
      },
    })
  }, [])

  const { task: consistencyTask, settledTask: consistencySettledTask, trackTaskData: trackConsistencyTaskData, applyCancelData: applyConsistencyCancelData } = useCancelableRelationTask({
    enabled: open && !!chapterId,
    relationType: CONSISTENCY_CHECK_RELATION_TYPE,
    relationEntityId: chapterId,
    onTaskSettled: applyConsistencyTaskResult,
  })

  const { task: simplifyTask, settledTask: simplifySettledTask, trackTaskData: trackSimplifyTaskData, applyCancelData: applySimplifyCancelData } = useCancelableRelationTask({
    enabled: open && !!chapterId,
    relationType: SCRIPT_SIMPLIFICATION_RELATION_TYPE,
    relationEntityId: chapterId,
    onTaskSettled: applySimplifyResult,
  })

  const { task: optimizeTask, settledTask: optimizeSettledTask, trackTaskData: trackOptimizeTaskData, applyCancelData: applyOptimizeCancelData } = useCancelableRelationTask({
    enabled: open && !!chapterId,
    relationType: SCRIPT_OPTIMIZATION_RELATION_TYPE,
    relationEntityId: chapterId,
    onTaskSettled: applyOptimizeResult,
  })
  useTaskPageContext(
    open && chapterId
      ? [
          {
            relationType: CONSISTENCY_CHECK_RELATION_TYPE,
            relationEntityId: chapterId,
          },
          {
            relationType: SCRIPT_SIMPLIFICATION_RELATION_TYPE,
            relationEntityId: chapterId,
          },
          {
            relationType: SCRIPT_OPTIMIZATION_RELATION_TYPE,
            relationEntityId: chapterId,
          },
        ]
      : [],
  )

  const plainWordCount = useMemo(() => editorText.trim().length, [editorText])
  const paragraphCount = useMemo(() => editorText.split(/\n\s*\n/).filter((p) => p.trim()).length, [editorText])
  const actionsLoading =
    extracting || checkingConsistency || optimizingScript || !!simplifyTask || !!optimizeTask || !!consistencyTask
  const consistencyIssues = useMemo(() => {
    const list = (consistencyResult?.issues as any[] | undefined) ?? []
    return Array.isArray(list) ? list : []
  }, [consistencyResult])

  useEffect(() => {
    if (!open) return
    if (!chapterId) return
    setLoading(true)
    StudioChaptersService.getChapterApiV1StudioChaptersChapterIdGet({ chapterId })
      .then((res) => {
        const data = res.data
        const nextRaw = data?.raw_text ?? ''
        const nextCondensed = data?.condensed_text ?? ''
        setRawText(nextRaw)
        setCondensedText(nextCondensed)
        setSavedRawText(nextRaw)
        setSavedCondensedText(nextCondensed)
        setMode('raw')
        setEditorText(nextRaw)
        setCompareRaw(nextRaw)
        setCompareCondensed(nextCondensed)
        setConsistencyResult(null)
      })
      .catch(() => {
        message.error('Nạp chương thất bại')
      })
      .finally(() => setLoading(false))
  }, [open, chapterId])

  const handleSmartSimplify = async () => {
    if (!rawText.trim()) {
      message.warning('Vui lòng nhập nguyên văn trước')
      return
    }
    if (notifyExistingTask(simplifyTask, {
      cancellingMessage: simplifyTaskCopy.cancellingMessage,
      runningMessage: simplifyTaskCopy.runningMessage,
    })) {
      return
    }
    setExtracting(true)
    try {
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.simplifyScriptAsyncApiV1ScriptProcessingSimplifyScriptAsyncPost({
            requestBody: {
              chapter_id: chapterId ?? null,
              script_text: rawText,
            },
          }),
        trackTaskData: trackSimplifyTaskData,
        startedMessage: simplifyTaskCopy.startedMessage,
        reusedMessage: simplifyTaskCopy.reusedMessage,
        fallbackErrorMessage: 'Tinh giản thông minh thất bại',
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setExtracting(false)
    }
  }

  const handleCheckConsistency = async () => {
    const scriptText = rawText.trim()
    if (!scriptText) {
      message.warning('Vui lòng nhập nguyên văn trước')
      return
    }
    if (notifyExistingTask(consistencyTask, {
      cancellingMessage: consistencyTaskCopy.cancellingMessage,
      runningMessage: consistencyTaskCopy.runningMessage,
    })) {
      return
    }
    setCheckingConsistency(true)
    try {
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.checkConsistencyAsyncApiV1ScriptProcessingCheckConsistencyAsyncPost({
            requestBody: { script_text: scriptText, chapter_id: chapterId ?? null },
          }),
        trackTaskData: trackConsistencyTaskData,
        startedMessage: consistencyTaskCopy.startedMessage,
        reusedMessage: consistencyTaskCopy.reusedMessage,
        fallbackErrorMessage: 'Kiểm tra tính nhất quán thất bại',
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setCheckingConsistency(false)
    }
  }

  const handleCancelConsistencyTask = async () => {
    if (!consistencyTask?.taskId) return
    try {
      await executeTaskCancel({
        taskId: consistencyTask.taskId,
        reason: 'Người dùng hủy tác vụ kiểm tra tính nhất quán trong hộp thoại chỉnh sửa nguyên văn',
        applyCancelData: applyConsistencyCancelData,
        cancelledImmediatelyMessage: consistencyTaskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: consistencyTaskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ kiểm tra tính nhất quán thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    }
  }

  const handleOneClickOptimize = async () => {
    const scriptText = rawText.trim()
    if (!scriptText) {
      message.warning('Vui lòng nhập nguyên văn trước')
      return
    }
    if (!consistencyResult) {
      message.info('Vui lòng kiểm tra nhầm lẫn nhân vật trước')
      return
    }
    if (notifyExistingTask(optimizeTask, {
      cancellingMessage: optimizeTaskCopy.cancellingMessage,
      runningMessage: optimizeTaskCopy.runningMessage,
    })) {
      return
    }
    setOptimizingScript(true)
    try {
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.optimizeScriptAsyncApiV1ScriptProcessingOptimizeScriptAsyncPost({
            requestBody: {
              chapter_id: chapterId ?? null,
              script_text: scriptText,
              consistency: consistencyResult as any,
            },
          }),
        trackTaskData: trackOptimizeTaskData,
        startedMessage: optimizeTaskCopy.startedMessage,
        reusedMessage: optimizeTaskCopy.reusedMessage,
        fallbackErrorMessage: 'Tối ưu hóa một nút thất bại',
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setOptimizingScript(false)
    }
  }

  const handleCancelSimplifyTask = async () => {
    if (!simplifyTask?.taskId) return
    try {
      await executeTaskCancel({
        taskId: simplifyTask.taskId,
        reason: 'Người dùng hủy tác vụ tinh giản thông minh trong hộp thoại chỉnh sửa nguyên văn',
        applyCancelData: applySimplifyCancelData,
        cancelledImmediatelyMessage: simplifyTaskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: simplifyTaskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ tinh giản thông minh thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    }
  }

  const handleCancelOptimizeTask = async () => {
    if (!optimizeTask?.taskId) return
    try {
      await executeTaskCancel({
        taskId: optimizeTask.taskId,
        reason: 'Người dùng hủy tác vụ tối ưu hóa một nút trong hộp thoại chỉnh sửa nguyên văn',
        applyCancelData: applyOptimizeCancelData,
        cancelledImmediatelyMessage: optimizeTaskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: optimizeTaskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ tối ưu một chạm thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    }
  }

  useRelationTaskNotification({
    task: consistencyTask,
    settledTask: consistencySettledTask,
    title: consistencyTaskCopy.title,
    sourceLabel: 'Chỉnh sửa nguyên văn chương',
    runningDescription: consistencyTaskCopy.runningDescription,
    cancellingDescription: consistencyTaskCopy.cancellingDescription,
    successDescription: consistencyTaskCopy.successDescription,
    cancelledDescription: consistencyTaskCopy.cancelledDescription,
    failedDescription: consistencyTaskCopy.failedDescription,
    onCancel: consistencyTask ? () => void handleCancelConsistencyTask() : null,
  })

  useRelationTaskNotification({
    task: simplifyTask,
    settledTask: simplifySettledTask,
    title: simplifyTaskCopy.title,
    sourceLabel: 'Chỉnh sửa nguyên văn chương',
    runningDescription: simplifyTaskCopy.runningDescription,
    cancellingDescription: simplifyTaskCopy.cancellingDescription,
    successDescription: simplifyTaskCopy.successDescription,
    cancelledDescription: simplifyTaskCopy.cancelledDescription,
    failedDescription: simplifyTaskCopy.failedDescription,
    onCancel: simplifyTask ? () => void handleCancelSimplifyTask() : null,
  })

  useRelationTaskNotification({
    task: optimizeTask,
    settledTask: optimizeSettledTask,
    title: optimizeTaskCopy.title,
    sourceLabel: 'Chỉnh sửa nguyên văn chương',
    runningDescription: optimizeTaskCopy.runningDescription,
    cancellingDescription: optimizeTaskCopy.cancellingDescription,
    successDescription: optimizeTaskCopy.successDescription,
    cancelledDescription: optimizeTaskCopy.cancelledDescription,
    failedDescription: optimizeTaskCopy.failedDescription,
    onCancel: optimizeTask ? () => void handleCancelOptimizeTask() : null,
  })

  const handleBackToRaw = () => {
    setMode('raw')
    setEditorText(rawText)
  }

  const handleViewCondensed = () => {
    if (!condensedText.trim()) {
      message.info('Chưa có nội dung rút gọn')
      return
    }
    setMode('condensed')
    setEditorText(condensedText)
  }

  const handleSave = async (): Promise<boolean> => {
    if (!chapterId) return false
    setSaving(true)
    try {
      if (mode === 'raw') {
        await StudioChaptersService.updateChapterApiV1StudioChaptersChapterIdPatch({
          chapterId,
          requestBody: { raw_text: editorText },
        })
        setRawText(editorText)
        setSavedRawText(editorText)
        onSaved?.({ rawText: editorText })
        message.success('Đã lưu nguyên văn')
        return true
      }

      if (mode === 'condensed') {
        await StudioChaptersService.updateChapterApiV1StudioChaptersChapterIdPatch({
          chapterId,
          requestBody: { condensed_text: editorText },
        })
        setCondensedText(editorText)
        setSavedCondensedText(editorText)
        onSaved?.({ condensedText: editorText })
        message.success('Đã lưu nội dung tóm gọn')
        return true
      }

      await StudioChaptersService.updateChapterApiV1StudioChaptersChapterIdPatch({
        chapterId,
        requestBody: { raw_text: compareRaw, condensed_text: compareCondensed },
      })
      setRawText(compareRaw)
      setCondensedText(compareCondensed)
      setSavedRawText(compareRaw)
      setSavedCondensedText(compareCondensed)
      onSaved?.({ rawText: compareRaw, condensedText: compareCondensed })
      message.success('Đã lưu')
      return true
    } catch {
      message.error('Lưu thất bại')
      return false
    } finally {
      setSaving(false)
    }
  }

  const hasUnsavedChanges = useMemo(() => {
    if (mode === 'compare') return compareRaw !== savedRawText || compareCondensed !== savedCondensedText
    if (mode === 'raw') return editorText !== savedRawText
    return editorText !== savedCondensedText
  }, [compareCondensed, compareRaw, editorText, mode, savedCondensedText, savedRawText])

  const handleRequestClose = () => {
    if (actionsLoading) return
    if (!hasUnsavedChanges) {
      onClose()
      return
    }
    Modal.confirm({
      title: 'Phát hiện thay đổi chưa lưu',
      content: 'Khu nhập văn bản có thay đổi chưa lưu, vui lòng chọn thao tác trước khi đóng.',
      okText: 'Lưu',
      cancelText: 'Bỏ qua',
      onOk: async () => {
        const ok = await handleSave()
        if (ok) onClose()
      },
      onCancel: () => {
        onClose()
      },
    })
  }

  const mockHistory: HistoryItem[] = useMemo(
    () => [
      {
        id: 'h-1',
        at: Date.now() - 1000 * 60 * 60 * 2,
        rawText: '【Nguyên văn】Bản ví dụ 1 (dữ liệu có sẵn)',
        condensedText: '【TINH GIAN】Phiên bản ví dụ 1 (dữ liệu có sẵn)',
      },
      {
        id: 'h-2',
        at: Date.now() - 1000 * 60 * 22,
        rawText: '【Nguyên văn】Bản ví dụ 2 (dữ liệu có sẵn)',
        condensedText: '【TINH GIAN】Phiên bản ví dụ 2 (dữ liệu có sẵn)',
      },
    ],
    [],
  )

  return (
    <>
      <Modal
        title={
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <FileTextOutlined />{' '}
              {mode === 'raw' ? 'Vùng chỉnh sửa nguyên văn' : mode === 'condensed' ? 'Vùng chỉnh sửa nội dung thu gọn' : 'Chế độ so sánh'}
              <Tag color="blue">{plainWordCount} chữ</Tag>
              <Tag color="default">{paragraphCount} đoạn</Tag>
            </div>
            <Space size="small">
              <Button size="small" type="primary" icon={<SaveOutlined />} loading={actionsLoading || saving} disabled={actionsLoading} onClick={() => void handleSave()}>
                Lưu
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={checkingConsistency || !!consistencyTask}
                disabled={actionsLoading || !!consistencyTask}
                onClick={() => void handleCheckConsistency()}
              >
                {consistencyTask ? 'Đang kiểm tra' : 'Kiểm tra nhầm lẫn nhân vật'}
              </Button>
              {consistencyTask ? (
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  disabled={consistencyTask.cancelRequested}
                  onClick={() => void handleCancelConsistencyTask()}
                >
                  {consistencyTask.cancelRequested ? 'Đang hủy' : 'Hủy kiểm tra'}
                </Button>
              ) : null}
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                loading={extracting || !!simplifyTask}
                disabled={actionsLoading || !!simplifyTask}
                onClick={() => void handleSmartSimplify()}
              >
                {simplifyTask ? 'Đang tinh giản' : 'Tinh giản thông minh'}
              </Button>
              {simplifyTask ? (
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  disabled={simplifyTask.cancelRequested}
                  onClick={() => void handleCancelSimplifyTask()}
                >
                  {simplifyTask.cancelRequested ? 'đang hủy' : 'hủy rút gọn'}
                </Button>
              ) : null}
              {mode === 'condensed' ? (
                <Button size="small" icon={<ReloadOutlined />} loading={actionsLoading} disabled={actionsLoading} onClick={handleBackToRaw}>
                  Quay về nguyên văn
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={actionsLoading}
                  disabled={actionsLoading || !condensedText.trim()}
                  onClick={handleViewCondensed}
                >
                  Xem bản rút gọn
                </Button>
              )}
              <Button
                size="small"
                icon={<DiffOutlined />}
                loading={actionsLoading}
                disabled={actionsLoading}
                type={mode === 'compare' ? 'primary' : 'default'}
                onClick={() => {
                  if (mode === 'compare') {
                    setMode('raw')
                    setEditorText(rawText)
                    return
                  }
                  setCompareRaw(rawText)
                  setCompareCondensed(condensedText)
                  setMode('compare')
                }}
              >
                Chế độ so sánh
              </Button>
              <Button size="small" icon={<HistoryOutlined />} loading={actionsLoading} disabled={actionsLoading} onClick={() => setHistoryOpen(true)}>
                Lịch sử phiên bản
              </Button>
            </Space>
          </div>
        }
        open={open}
        onCancel={() => {
          handleRequestClose()
        }}
        width={900}
        footer={
          <Button type="primary" loading={actionsLoading} disabled={actionsLoading} onClick={handleRequestClose}>
            Đóng
          </Button>
        }
        styles={{
          header: { paddingRight: 48 },
          body: { maxHeight: '70vh', overflow: 'auto', paddingTop: 12 },
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Spin />
          </div>
        ) : mode === 'compare' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="text-xs text-gray-500 mb-2">Nguyên văn</div>
              <Input.TextArea
                value={compareRaw}
                onChange={(e) => setCompareRaw(e.target.value)}
                rows={14}
                disabled={actionsLoading}
                style={{ resize: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
            </div>
            <div className="flex flex-col">
              <div className="text-xs text-gray-500 mb-2">Nội dung rút gọn</div>
              <Input.TextArea
                value={compareCondensed}
                onChange={(e) => setCompareCondensed(e.target.value)}
                rows={14}
                disabled={actionsLoading}
                style={{ resize: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input.TextArea
              value={editorText}
              onChange={(e) => {
                const v = e.target.value
                setEditorText(v)
                if (mode === 'raw') setRawText(v)
                if (mode === 'condensed') setCondensedText(v)
              }}
            disabled={actionsLoading}
              placeholder={mode === 'raw' ? 'Chỉnh sửa nguyên văn chương…' : 'Chỉnh sửa nội dung rút gọn…'}
              rows={16}
              style={{ resize: 'none', background: '#fdfdfd' }}
            />
            {consistencyResult ? (
              <Card
                size="small"
                title="Kết quả kiểm tra nhầm lẫn nhân vật"
                extra={
                  <Space wrap>
                    <Tag color={consistencyResult.has_issues ? 'red' : 'green'}>
                      {consistencyResult.has_issues ? 'phát hiện vấn đề' : 'không có vấn đề'}
                    </Tag>
                    <Tag>issues：{consistencyIssues.length}</Tag>
                    <Button
                      size="small"
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      loading={optimizingScript || !!optimizeTask}
                      disabled={actionsLoading || !!optimizeTask}
                      onClick={() => void handleOneClickOptimize()}
                    >
                      {optimizeTask ? 'Đang tối ưu' : 'Tối ưu một nút'}
                    </Button>
                    {optimizeTask ? (
                      <Button
                        size="small"
                        danger
                        icon={<CloseCircleOutlined />}
                        disabled={optimizeTask.cancelRequested}
                        onClick={() => void handleCancelOptimizeTask()}
                      >
                        {optimizeTask.cancelRequested ? 'đang hủy' : 'hủy tối ưu'}
                      </Button>
                    ) : null}
                  </Space>
                }
              >
                {consistencyIssues.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không phát hiện vấn đề nhầm lẫn nhân vật" />
                ) : (
                  <List
                    size="small"
                    dataSource={consistencyIssues}
                    renderItem={(it: any, idx) => (
                      <List.Item>
                        <div className="min-w-0">
                          <div className="font-medium">
                            {it?.issue_type ? `[${it.issue_type}] ` : ''}
                            Issue {idx + 1}
                          </div>
                          <div className="text-sm">{it?.description}</div>
                          {it?.character_candidates?.length ? (
                            <div className="text-xs text-gray-500 mt-1">Ứng viên nhân vật: {it.character_candidates.join('、')}</div>
                          ) : null}
                          {it?.suggestion ? (
                            <div className="text-xs text-gray-500 mt-1">Gợi ý: {it.suggestion}</div>
                          ) : null}
                          {it?.affected_lines ? (
                            <div className="text-xs text-gray-400 mt-1">
                              Phạm vi ảnh hưởng: {it.affected_lines.start_line ?? '-'}–{it.affected_lines.end_line ?? '-'}
                            </div>
                          ) : null}
                        </div>
                      </List.Item>
                    )}
                  />
                )}
                {consistencyResult.summary ? (
                  <div className="text-xs text-gray-500 mt-2">{String(consistencyResult.summary)}</div>
                ) : null}
              </Card>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined /> Phiên bản lịch sử
          </div>
        }
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        width={920}
        footer={
          <Button type="primary" onClick={() => setHistoryOpen(false)}>
            Đóng
          </Button>
        }
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {/* TODO: API phiên bản lịch sử chưa được nối vào, hiện là dữ liệu sẵn; sau khi nối vào sẽ render theo trục thời gian */}
        <div className="text-xs text-gray-500 mb-3">Nội dung mặc định thu gọn, chỉ hiển thị nút trên trục thời gian.</div>
        <div className="space-y-3">
          {mockHistory.map((h) => (
            <div key={h.id} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="text-sm font-medium mb-2">{new Date(h.at).toLocaleString()}</div>
              <Collapse
                items={[
                  {
                    key: 'content',
                    label: 'Mở rộng để xem nội dung',
                    children: (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Nội dung nguyên văn</div>
                          <Input.TextArea
                            value={h.rawText}
                            readOnly
                            rows={8}
                            style={{ resize: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Nội dung rút gọn</div>
                          <Input.TextArea
                            value={h.condensedText}
                            readOnly
                            rows={8}
                            style={{ resize: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
