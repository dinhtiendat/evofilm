import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Layout,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScissorOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { ShotRead, ShotRuntimeSummaryRead, ShotStatus } from '../../../services/generated'
import { ScriptProcessingService, StudioChaptersService, StudioShotsService } from '../../../services/generated'
import { executeAsyncTaskCreate, executeTaskCancel } from '../components/taskActionHelpers'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getChapterShotEditPath, getChapterShotsPath, getChapterStudioPath } from '../project/ProjectWorkbench/routes'
import { useCancelableRelationTask } from '../project/ProjectWorkbench/chapterDivisionTasks'
import { useRelationTaskNotification } from '../components/taskNotificationHelpers'
import { useTaskPageContext } from '../components/taskPageContext'
import { createTaskSettledReloader } from '../components/taskResultHelpers'
import { TASK_COPY } from '../components/taskCopy'

const { Header, Content } = Layout
type ShotListFilter = 'all' | 'pending' | 'generating' | 'ready'

function getErrorMessage(e: unknown) {
  if (!e) return 'Yêu cầu thất bại'
  if (typeof e === 'string') return e
  if (typeof e === 'object') {
    const maybeAny = e as any
    const detail = maybeAny?.body?.detail ?? maybeAny?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const msg = maybeAny?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return 'Yêu cầu thất bại'
}

function statusTag(status?: ShotStatus) {
  if (!status) return <span className="text-gray-400">—</span>
  const color = status === 'ready' ? 'success' : 'default'
  return <Tag color={color}>{status}</Tag>
}

type ShotPreparationState = {
  text: string
  color: string
  hint: string
}

type ShotRuntimeState = {
  has_active_tasks: boolean
  has_active_video_tasks: boolean
  has_active_prompt_tasks: boolean
  has_active_frame_tasks: boolean
  active_task_count: number
}

function getShotPreparationState(shot: ShotRead, runtime?: ShotRuntimeState): ShotPreparationState {
  if (runtime?.has_active_tasks) {
    return {
      text: 'Đang tạo',
      color: 'processing',
      hint: `Phân cảnh hiện tại có ${runtime.active_task_count} tác vụ đang chạy`,
    }
  }
  if (shot.status === 'ready') {
    return {
      text: 'Đã sẵn sàng',
      color: 'green',
      hint: shot.skip_extraction
        ? 'Phân cảnh hiện tại đã được đánh dấu không cần trích xuất, có thể tiếp tục vào quy trình tạo video'
        : 'Xác nhận trích xuất thông tin đã xong, có thể tiếp tục quy trình tạo video',
    }
  }
  return {
    text: 'Chờ xác nhận',
    color: 'gold',
    hint: shot.skip_extraction
      ? 'Phân cảnh hiện tại đã được đánh dấu không cần trích xuất, đang chờ hệ thống đồng bộ trạng thái quy trình mới nhất'
      : 'Vui lòng hoàn tất xác nhận trích xuất thông tin trước, rồi mới vào quy trình tạo video',
  }
}

export function ChapterShotsPage() {
  const taskCopy = TASK_COPY.chapterDivision
  const navigate = useNavigate()
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>()
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [shots, setShots] = useState<ShotRead[]>([])
  const [shotRuntimeMap, setShotRuntimeMap] = useState<Record<string, ShotRuntimeState>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [listFilter, setListFilter] = useState<ShotListFilter>('all')
  const [searchText, setSearchText] = useState('')
  const [chapterTitle, setChapterTitle] = useState<string>('')
  const [chapterIndex, setChapterIndex] = useState<number | null>(null)
  const [chapterRawText, setChapterRawText] = useState<string>('')
  const [chapterCondensedText, setChapterCondensedText] = useState<string>('')
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm] = Form.useForm<{ title: string; script_excerpt?: string }>()
  const [chapterDivisionTaskLoading, setChapterDivisionTaskLoading] = useState(false)

  const refresh = async () => {
    if (!chapterId) return
    setLoading(true)
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
      setShots(res.data?.items ?? [])
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
      setSelectedRowKeys([])
    } catch {
      message.error('Tải phân cảnh thất bại')
    } finally {
      setLoading(false)
    }
  }

  const reloadShotsAfterTaskSettled = useCallback(createTaskSettledReloader(refresh), [refresh])
  const { task: chapterDivisionTask, settledTask: chapterDivisionSettledTask, trackTaskData, applyCancelData } = useCancelableRelationTask({
    enabled: !!chapterId,
    relationType: 'chapter_division',
    relationEntityId: chapterId,
    onTaskSettled: reloadShotsAfterTaskSettled,
  })
  useTaskPageContext(
    chapterId
      ? [
          {
            relationType: 'chapter_division',
            relationEntityId: chapterId,
          },
        ]
      : [],
  )

  useEffect(() => {
    setSelectedRowKeys([])
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  useEffect(() => {
    if (!chapterId) return
    setLoadingChapter(true)
    StudioChaptersService.getChapterApiV1StudioChaptersChapterIdGet({ chapterId })
      .then((res) => {
        const c = res.data
        setChapterTitle(c?.title ?? '')
        setChapterIndex(typeof c?.index === 'number' ? c.index : null)
        setChapterRawText(c?.raw_text?.trim?.() ? c.raw_text.trim() : '')
        setChapterCondensedText(c?.condensed_text?.trim?.() ? c.condensed_text.trim() : '')
      })
      .catch(() => {
        message.error('Nạp chương thất bại')
      })
      .finally(() => {
        setLoadingChapter(false)
      })
  }, [chapterId])

  const filteredShots = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const byWorkflow = shots.filter((s) => {
      const runtime = shotRuntimeMap[s.id]
      if (listFilter === 'generating') return Boolean(runtime?.has_active_tasks)
      if (listFilter === 'ready') return s.status === 'ready' && !runtime?.has_active_tasks
      if (listFilter === 'pending') return s.status !== 'ready' && !runtime?.has_active_tasks
      return true
    })
    if (!q) return byWorkflow
    return byWorkflow.filter((s) => {
      const title = String(s.title ?? '').toLowerCase()
      const ex = String(s.script_excerpt ?? '').toLowerCase()
      const idx = String(s.index)
      return title.includes(q) || ex.includes(q) || idx.includes(q)
    })
  }, [listFilter, searchText, shotRuntimeMap, shots])

  const shotFilterCounts = useMemo(
    () => ({
      all: shots.length,
      pending: shots.filter((s) => s.status !== 'ready' && !shotRuntimeMap[s.id]?.has_active_tasks).length,
      generating: shots.filter((s) => Boolean(shotRuntimeMap[s.id]?.has_active_tasks)).length,
      ready: shots.filter((s) => s.status === 'ready' && !shotRuntimeMap[s.id]?.has_active_tasks).length,
    }),
    [shotRuntimeMap, shots],
  )

  const selectedShotIds = useMemo(() => selectedRowKeys.map((k) => String(k)), [selectedRowKeys])

  const openCreate = useCallback(() => {
    createForm.resetFields()
    setCreateOpen(true)
  }, [createForm])

  const closeCreate = useCallback(() => {
    setCreateOpen(false)
    createForm.resetFields()
  }, [createForm])

  const submitCreate = useCallback(async () => {
    if (!chapterId) return
    try {
      const v = await createForm.validateFields()
      setCreateSubmitting(true)
      const nextIndex = shots.reduce((m, s) => Math.max(m, s.index), 0) + 1
      const res = await StudioShotsService.createShotApiV1StudioShotsPost({
        requestBody: {
          id: crypto.randomUUID(),
          chapter_id: chapterId,
          index: nextIndex,
          title: v.title.trim(),
          script_excerpt: v.script_excerpt?.trim() ? v.script_excerpt.trim() : '',
          status: 'pending',
        },
      })
      const created = res.data
      if (created) {
        setShots((prev) => [...prev, created].sort((a, b) => a.index - b.index))
        message.success('Đã tạo phân cảnh')
        closeCreate()
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('Tạo thất bại')
    } finally {
      setCreateSubmitting(false)
    }
  }, [chapterId, closeCreate, createForm, shots])

  const handleOneClickExtract = useCallback(async () => {
    if (!chapterId) return
    const scriptText = (chapterCondensedText || chapterRawText).trim()
    if (!scriptText) {
      message.error('chương không có văn bản khả dụng (condensed/raw rỗng)')
      return
    }
    setExtracting(true)
    try {
      await executeAsyncTaskCreate({
        request: () =>
          ScriptProcessingService.divideScriptAsyncApiV1ScriptProcessingDivideAsyncPost({
            requestBody: {
              script_text: scriptText,
              write_to_db: true,
              chapter_id: chapterId,
            },
          }),
        trackTaskData,
        startedMessage: taskCopy.startedMessage,
        reusedMessage: taskCopy.reusedMessage,
        fallbackErrorMessage: 'Khởi động trích xuất phân cảnh thất bại',
        getErrorMessage: (error) => getErrorMessage(error),
      })
    } catch {
      // executeAsyncTaskCreate đã xử lý thống nhất thông báo lỗi
    } finally {
      setExtracting(false)
    }
  }, [chapterCondensedText, chapterId, chapterRawText])

  const handleCancelChapterDivisionTask = useCallback(async () => {
    if (!chapterDivisionTask) return
    setChapterDivisionTaskLoading(true)
    try {
      await executeTaskCancel({
        taskId: chapterDivisionTask.taskId,
        reason: 'Người dùng hủy trích xuất phân cảnh tại trang danh sách phân cảnh',
        applyCancelData,
        cancelledImmediatelyMessage: taskCopy.cancelledImmediatelyMessage,
        cancelRequestedMessage: taskCopy.cancelRequestedMessage,
        fallbackErrorMessage: 'Hủy tác vụ thất bại',
      })
    } catch {
      // executeTaskCancel đã xử lý thống nhất thông báo lỗi
    } finally {
      setChapterDivisionTaskLoading(false)
    }
  }, [chapterDivisionTask])

  useRelationTaskNotification({
    task: chapterDivisionTask,
    settledTask: chapterDivisionSettledTask,
    title: taskCopy.title,
    sourceLabel: chapterTitle ? `Chương: ${chapterTitle}` : 'Trang quản lý phân cảnh',
    runningDescription: taskCopy.runningDescription,
    cancellingDescription: taskCopy.cancellingDescription,
    successDescription: taskCopy.successDescription,
    cancelledDescription: taskCopy.cancelledDescription,
    failedDescription: taskCopy.failedDescription,
    onCancel: chapterDivisionTask ? () => void handleCancelChapterDivisionTask() : null,
    onNavigate:
      projectId && chapterId
        ? () => navigate(getChapterShotsPath(projectId, chapterId))
        : null,
  })

  const handleDelete = useCallback(
    async (shotId: string) => {
      setDeletingId(shotId)
      try {
        await StudioShotsService.deleteShotApiV1StudioShotsShotIdDelete({ shotId })
        setShots((prev) => prev.filter((s) => s.id !== shotId))
        setSelectedRowKeys((prev) => prev.filter((k) => String(k) !== shotId))
        message.success('Đã xóa')
      } catch {
        message.error('Xóa thất bại')
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

  const handleBatchDelete = useCallback(async () => {
    if (selectedShotIds.length === 0) return
    const ids = [...selectedShotIds]

    setBatchDeleting(true)
    let ok = 0
    let fail = 0
    try {
      for (const id of ids) {
        try {
          await StudioShotsService.deleteShotApiV1StudioShotsShotIdDelete({ shotId: id })
          ok += 1
          setShots((prev) => prev.filter((s) => s.id !== id))
          setSelectedRowKeys((prev) => prev.filter((k) => String(k) !== id))
        } catch {
          fail += 1
        }
      }
    } finally {
      setBatchDeleting(false)
    }

    if (ok > 0 && fail === 0) {
      message.success(`Đã xóa ${ok} mục`)
    } else if (ok > 0 && fail > 0) {
      message.warning(`đã xóa ${ok} dòng, thất bại ${fail} dòng`)
    } else if (ok === 0 && fail > 0) {
      message.error(`Xóa thất bại (tổng cộng ${fail} mục)`)
    }
  }, [selectedShotIds])

  const handleOpenSelectedInStudio = useCallback(() => {
    if (!projectId || !chapterId || selectedShotIds.length === 0) return
    navigate(getChapterStudioPath(projectId, chapterId), {
      state: {
        focusShotId: selectedShotIds[0],
        selectedShotIds,
      },
    })
  }, [chapterId, navigate, projectId, selectedShotIds])

  const columns: TableColumnsType<ShotRead> = useMemo(
    () => [
      {
        title: 'Số thứ tự',
        dataIndex: 'index',
        key: 'index',
        width: 72,
        align: 'center',
      },
      {
        title: 'Tiêu đề',
        dataIndex: 'title',
        key: 'title',
        width: 200,
        ellipsis: { showTitle: false },
        render: (t: string) => {
          const text = t?.trim() ? t : '—'
          return (
            <Tooltip title={text}>
              <span>{text}</span>
            </Tooltip>
          )
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (_: unknown, r) => statusTag(r.status),
      },
      {
        title: 'Độ sẵn sàng',
        key: 'preparation',
        width: 168,
        render: (_: unknown, r) => {
          const state = getShotPreparationState(r, shotRuntimeMap[r.id])
          return (
            <div className="space-y-1">
              <Tag color={state.color}>{state.text}</Tag>
              <div className="text-[11px] text-gray-500 leading-5">{state.hint}</div>
            </div>
          )
        },
      },
      {
        title: 'Trích đoạn kịch bản',
        dataIndex: 'script_excerpt',
        key: 'script_excerpt',
        width: 280,
        ellipsis: { showTitle: false },
        render: (v: string | undefined) => {
          const raw = v?.trim() ?? ''
          const display = raw || '—'
          return (
            <Tooltip title={raw ? raw : undefined} placement="topLeft">
              <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{display}</span>
            </Tooltip>
          )
        },
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 170,
        render: (_: unknown, r) => (
          <Space size={0} wrap>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={extracting}
              loading={extracting}
              onClick={() =>
                projectId &&
                chapterId &&
                navigate(getChapterShotEditPath(projectId, chapterId, r.id))
              }
            >
              Chỉnh sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa phân cảnh này?"
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => void handleDelete(r.id)}
              okButtonProps={{ loading: extracting || deletingId === r.id, disabled: extracting }}
              cancelButtonProps={{ disabled: extracting }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={extracting || deletingId === r.id}
                disabled={extracting}
              >
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [chapterId, deletingId, extracting, handleDelete, navigate, projectId, shotRuntimeMap],
  )

  const tableEmpty =
    !loading && shots.length === 0 ? (
      <Empty description="Chưa có phân cảnh" />
    ) : !loading && filteredShots.length === 0 ? (
      <Empty description="Không có phân cảnh phù hợp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : undefined

  const tableScrollY = 'calc(100vh - 320px)'

  if (!projectId || !chapterId) {
    return <Navigate to="/projects" replace />
  }

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
          to={`/projects/${projectId}?tab=chapters`}
          className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
        >
          <ArrowLeftOutlined /> Quay lại danh sách chương
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
            {loadingChapter ? 'Đang tải…' : 'Danh sách phân cảnh'}
          </Typography.Text>
        </div>

        {shots.length > 0 ? (
          <Space>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              onClick={() => navigate(getChapterStudioPath(projectId, chapterId))}
            >
              Vào studio phân cảnh
            </Button>
            <Button
              icon={<VideoCameraOutlined />}
              onClick={() => navigate(getChapterStudioPath(projectId, chapterId))}
            >
              Tiếp tục phân cảnh hiện tại
            </Button>
          </Space>
        ) : null}
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
          title={
            <div className="flex flex-wrap items-center gap-3">
              <span>Phân cảnh</span>
              {shots.length > 0 ? (
                <Tag color="warning" className="!mr-0">
                  Chương hiện tại đã có phân cảnh, nếu trích xuất lại vui lòng xóa phân cảnh hiện có trước
                </Tag>
              ) : null}
            </div>
          }
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
          }}
          extra={
            <Space wrap>
              {selectedRowKeys.length > 0 ? (
                <>
                  <span className="text-gray-500 text-sm">Đã chọn {selectedRowKeys.length} mục</span>
                  <Popconfirm
                    title={`xác nhận xóa ${selectedRowKeys.length} phân cảnh được chọn?`}
                    okText="Xóa"
                    cancelText="Hủy"
                    onConfirm={() => void handleBatchDelete()}
                    okButtonProps={{ danger: true, loading: batchDeleting, disabled: extracting || batchDeleting }}
                    cancelButtonProps={{ disabled: extracting || batchDeleting }}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={batchDeleting} disabled={extracting || batchDeleting}>
                      Xóa hàng loạt
                    </Button>
                  </Popconfirm>
                </>
              ) : null}
              <Tooltip
                title={
                  chapterDivisionTask
                    ? 'Chương hiện tại đã có tác vụ trích xuất phân cảnh đang chạy'
                    : shots.length > 0
                      ? 'Khi đã có phân cảnh không cho phép đồng bộ, phải xóa hết phân cảnh trước'
                      : undefined
                }
              >
                <span>
                  <Button
                    type={shots.length === 0 ? 'primary' : 'default'}
                    icon={<ScissorOutlined />}
                    loading={extracting}
                    disabled={extracting || shots.length > 0 || !!chapterDivisionTask}
                    onClick={() => void handleOneClickExtract()}
                  >
                    {chapterDivisionTask ? 'Đang trích xuất phân cảnh' : shots.length === 0 ? 'Trích xuất phân cảnh một chạm' : 'Trích xuất lại cần xóa toàn bộ phân cảnh trước'}
                  </Button>
                </span>
              </Tooltip>
              <Button icon={<PlusOutlined />} onClick={openCreate} loading={extracting} disabled={extracting}>
                Tạo phân cảnh
              </Button>
              <Button
                icon={<ReloadOutlined />}
                loading={extracting || loading}
                disabled={extracting || batchDeleting}
                onClick={() => void refresh()}
              >
                Làm mới
              </Button>
              {chapterDivisionTask ? (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={chapterDivisionTaskLoading}
                  disabled={chapterDivisionTask.cancelRequested || chapterDivisionTaskLoading}
                  onClick={() => void handleCancelChapterDivisionTask()}
                >
                  {chapterDivisionTask.cancelRequested ? 'Đang hủy' : 'Hủy trích xuất'}
                </Button>
              ) : null}
            </Space>
          }
        >
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <Input.Search
              allowClear
              placeholder="Tìm thứ tự, tiêu đề hoặc trích đoạn kịch bản…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                size="small"
                value={listFilter}
                onChange={(value) => setListFilter(value as ShotListFilter)}
                options={[
                  { label: `Tất cả ${shotFilterCounts.all}`, value: 'all' },
                  { label: `Chờ xác nhận ${shotFilterCounts.pending}`, value: 'pending' },
                  { label: `Đang tạo ${shotFilterCounts.generating}`, value: 'generating' },
                  { label: `Sẵn sàng ${shotFilterCounts.ready}`, value: 'ready' },
                ]}
              />
              {selectedRowKeys.length > 0 ? (
                <Space size="small" wrap>
                  <Button
                    icon={<FileSearchOutlined />}
                    disabled={extracting || batchDeleting}
                    onClick={handleOpenSelectedInStudio}
                  >
                    Xử lý mục đầu tiên được chọn
                  </Button>
                  <Button
                    type="text"
                    disabled={extracting || batchDeleting}
                    onClick={() => setSelectedRowKeys([])}
                  >
                    Xóa hết lựa chọn
                  </Button>
                </Space>
              ) : null}
            </div>
            <div className="flex-1 min-h-0">
              <Table<ShotRead>
                rowKey="id"
                size="small"
                loading={loading}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  getCheckboxProps: () => ({
                    disabled: extracting || batchDeleting,
                  }),
                }}
                columns={columns}
                dataSource={filteredShots}
                pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
                scroll={{ x: 1180, y: tableScrollY }}
                locale={{
                  emptyText: tableEmpty ?? <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
              />
            </div>
          </div>
        </Card>
      </Content>

      <Modal
        title="Tạo phân cảnh"
        open={createOpen}
        onCancel={extracting ? undefined : closeCreate}
        onOk={() => void submitCreate()}
        confirmLoading={extracting || createSubmitting}
        okButtonProps={{ loading: extracting || createSubmitting, disabled: extracting }}
        cancelButtonProps={{ disabled: extracting }}
        closable={!extracting}
        maskClosable={!extracting}
        keyboard={!extracting}
        destroyOnClose
        width={520}
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="Tiêu đề phân cảnh" />
          </Form.Item>
          <Form.Item name="script_excerpt" label="trích đoạn kịch bản">
            <Input.TextArea rows={8} placeholder="tùy chọn" />
          </Form.Item>
        </Form>
      </Modal>

    </Layout>
  )
}
