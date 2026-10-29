import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Input,
  Button,
  Progress,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  message,
  Space,
  Tag,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnterOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  BarsOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { chapters as mockChapters, projects as mockProjects, type Project } from '../../../mocks/data'
import { StudioChaptersService, StudioProjectsService } from '../../../services/generated'
import type { ChapterRead, ProjectRead, ProjectStyle } from '../../../services/generated'
import {
  ProjectVisualStyleAndStyleFields,
  type ProjectVisualStyleChoice,
} from './ProjectVisualStyleAndStyleFields'
import { useProjectStyleOptions } from './useProjectStyleOptions'
import { getChapterPreparationState } from './ProjectWorkbench/chapterPreparation'
import { ensureHasShotsBeforeShooting } from './ProjectWorkbench/ensureHasShotsBeforeShooting'
import { getChapterShotsPath, getChapterStudioPath } from './ProjectWorkbench/routes'
import { loadProjectFlowStatsForChapters, type ProjectFlowStats } from './ProjectWorkbench/projectFlowStats'

type ViewMode = 'grid' | 'compact' | 'large'
type FilterTab = 'all' | 'editRaw' | 'extractShots' | 'prepareShots' | 'generating' | 'ready'
type SortKey = 'updatedAt' | 'name' | 'createdAt' | 'chapters'
type ChapterPreparationInput = Parameters<typeof getChapterPreparationState>[0]
type ProjectStageSummary = {
  key: ReturnType<typeof getChapterPreparationState>['key'] | 'create_first_chapter'
  stageText: string
  stageColor: string
  nextActionLabel: string
  nextActionHint: string
  chapterId?: string
  storyboardCount?: number
}
type ProjectFlowStatsMap = Record<string, ProjectFlowStats>
type ProjectView = Project & {
  visualStyle?: ProjectVisualStyleChoice
  defaultVideoRatio?: string | null
}

const ProjectLobby: React.FC = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectView[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectView | null>(null)
  const [projectStageMap, setProjectStageMap] = useState<Record<string, ProjectStageSummary>>({})
  const [projectFlowStatsMap, setProjectFlowStatsMap] = useState<ProjectFlowStatsMap>({})
  const {
    options: projectStyleOptions,
    videoRatioOptions,
    defaultVideoRatio,
  } = useProjectStyleOptions()
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const useMock = import.meta.env.VITE_USE_MOCK === 'true'

  const toUIProject = (p: ProjectRead): ProjectView => {
    const stats = (p.stats ?? {}) as Record<string, unknown>
    const getNum = (key: string) => {
      const v = stats[key]
      return typeof v === 'number' && Number.isFinite(v) ? v : 0
    }

    const updatedAt =
      (typeof stats.updated_at === 'string' && stats.updated_at) ||
      (typeof stats.updatedAt === 'string' && stats.updatedAt) ||
      new Date().toISOString()

    return {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      style: (p.style as Project['style']) ?? 'Chủ nghĩa hiện thực',
      seed: p.seed ?? 0,
      unifyStyle: p.unify_style ?? true,
      progress: p.progress ?? 0,
      stats: {
        chapters: getNum('chapters'),
        roles: getNum('roles'),
        scenes: getNum('scenes'),
        props: getNum('props'),
      },
      updatedAt,
      visualStyle: (p.visual_style as ProjectVisualStyleChoice | undefined) ?? '现实',
      defaultVideoRatio: p.default_video_ratio ?? null,
    }
  }

  const newProjectId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  const load = async () => {
    setLoading(true)
    try {
      if (useMock) {
        setProjects(mockProjects)
      } else {
        const res = await StudioProjectsService.listProjectsApiV1StudioProjectsGet({
          page: 1,
          pageSize: 10,
        })
        const items = res.data?.items ?? []
        setProjects(items.map(toUIProject))
      }
    } catch {
      setProjects(useMock ? mockProjects : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const getProjectStatus = (p: ProjectView): 'draft' | 'inProgress' | 'completed' => {
    if (p.progress >= 90) return 'completed'
    if (p.progress <= 5) return 'draft'
    return 'inProgress'
  }

  useEffect(() => {
    const list = Array.isArray(projects) ? projects : []
    if (!list.length) {
      setProjectStageMap({})
      setProjectFlowStatsMap({})
      return
    }

    const summarizeProjectChapters = (chapters: ChapterPreparationInput[]): ProjectStageSummary => {
      const chaptersByIndex = [...chapters].sort((a, b) => a.index - b.index)
      if (!chaptersByIndex.length) {
        return {
          key: 'create_first_chapter',
          stageText: 'Chờ tạo chương',
          stageColor: 'default',
          nextActionLabel: 'Tạo chương một',
          nextActionHint: 'Dự án chưa có chương nào, nên tạo chương đầu tiên trước',
        }
      }
      const findByState = (key: ReturnType<typeof getChapterPreparationState>['key']) =>
        chaptersByIndex.find((chapter) => getChapterPreparationState(chapter).key === key)
      const chapter =
        findByState('edit_raw') ??
        findByState('extract_shots') ??
        findByState('prepare_shots') ??
        findByState('shoot') ??
        chaptersByIndex[0]
      const state = getChapterPreparationState(chapter)
      return {
        key: state.key,
        stageText: state.text,
        stageColor: state.color,
        nextActionLabel: state.primaryAction,
        nextActionHint: `Chương ${chapter.index} · ${state.hint}`,
        chapterId: chapter.id,
        storyboardCount: chapter.storyboardCount,
      }
    }

    const loadSummaries = async () => {
      try {
        if (useMock) {
          const chapterGroups = Object.fromEntries(
            list.map((project) => [
              project.id,
              mockChapters
                .filter((chapter) => chapter.projectId === project.id)
                .map((chapter) => ({
                  id: chapter.id,
                  projectId: chapter.projectId,
                  index: chapter.index,
                  title: chapter.title,
                  summary: chapter.summary ?? '',
                  rawText: chapter.summary ?? '',
                  storyboardCount: chapter.storyboardCount,
                  status: chapter.status,
                  updatedAt: chapter.updatedAt,
                })),
            ]),
          )
          setProjectStageMap(
            Object.fromEntries(
              Object.entries(chapterGroups).map(([projectId, chapters]) => [
                projectId,
                summarizeProjectChapters(chapters),
              ]),
            ),
          )
          const flowStatsEntries = await Promise.all(
            Object.entries(chapterGroups).map(async ([projectId, chapters]) => [
              projectId,
              await loadProjectFlowStatsForChapters(chapters),
            ] as const),
          )
          setProjectFlowStatsMap(Object.fromEntries(flowStatsEntries))
          return
        }

        const chapterResponses = await Promise.all(
          list.map(async (project) => {
            const res = await StudioChaptersService.listChaptersApiV1StudioChaptersGet({
              projectId: project.id,
              page: 1,
              pageSize: 100,
            })
            const items: ChapterRead[] = res.data?.items ?? []
            return [
              project.id,
              summarizeProjectChapters(
                items.map((chapter) => ({
                  id: chapter.id,
                  projectId: chapter.project_id,
                  index: chapter.index,
                  title: chapter.title,
                  summary: chapter.summary ?? '',
                  rawText: chapter.raw_text ?? '',
                  storyboardCount: chapter.shot_count ?? chapter.storyboard_count ?? 0,
                  status: chapter.status ?? 'draft',
                  updatedAt: new Date().toISOString(),
                })),
              ),
              items.map((chapter) => ({
                id: chapter.id,
                projectId: chapter.project_id,
                index: chapter.index,
                title: chapter.title,
                summary: chapter.summary ?? '',
                rawText: chapter.raw_text ?? '',
                storyboardCount: chapter.shot_count ?? chapter.storyboard_count ?? 0,
                status: chapter.status ?? 'draft',
                updatedAt: new Date().toISOString(),
              })),
            ] as const
          }),
        )
        setProjectStageMap(
          Object.fromEntries(chapterResponses.map(([projectId, summary]) => [projectId, summary])),
        )
        const flowStatsEntries = await Promise.all(
          chapterResponses.map(async ([projectId, _summary, chapters]) => [
            projectId,
            await loadProjectFlowStatsForChapters(chapters),
          ] as const),
        )
        setProjectFlowStatsMap(Object.fromEntries(flowStatsEntries))
      } catch {
        setProjectStageMap({})
        setProjectFlowStatsMap({})
      }
    }

    void loadSummaries()
  }, [projects, useMock])

  const filteredSorted = useMemo(() => {
    const list = Array.isArray(projects) ? projects : []
    const keyword = search.trim().toLowerCase()

    let next = list.filter((p) => {
      if (keyword) {
        const inText =
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword)
        if (!inText) return false
      }

      if (filterTab === 'all') return true
      const stage = projectStageMap[p.id]
      const flowStats = projectFlowStatsMap[p.id]
      if (filterTab === 'editRaw') return stage?.key === 'edit_raw' || stage?.key === 'create_first_chapter'
      if (filterTab === 'extractShots') return stage?.key === 'extract_shots'
      if (filterTab === 'prepareShots') return stage?.key === 'prepare_shots'
      if (filterTab === 'generating') return (flowStats?.generatingShots ?? 0) > 0
      if (filterTab === 'ready') return (flowStats?.readyShots ?? 0) > 0
      return true
    })

    next.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'name') {
        av = a.name
        bv = b.name
      } else if (sortKey === 'chapters') {
        av = a.stats.chapters
        bv = b.stats.chapters
      } else if (sortKey === 'createdAt') {
        av = a.id
        bv = b.id
      } else {
        av = a.updatedAt
        bv = b.updatedAt
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortOrder === 'asc' ? av - bv : bv - av
      }
      const res = String(av).localeCompare(String(bv))
      return sortOrder === 'asc' ? res : -res
    })

    return next
  }, [projects, search, filterTab, sortKey, sortOrder, projectStageMap, projectFlowStatsMap])

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
  }

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    )
  }

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return
    try {
      await Promise.all(
        selectedIds.map((id) =>
          StudioProjectsService.deleteProjectApiV1StudioProjectsProjectIdDelete({ projectId: id }),
        ),
      )
      setProjects((prev) =>
        Array.isArray(prev) ? prev.filter((p) => !selectedIds.includes(p.id)) : prev
      )
      setSelectedIds([])
      message.success('Đã xóa hàng loạt các mục đã chọn')
    } catch {
      message.error('Xóa hàng loạt thất bại')
    }
  }

  const handleOpenCreate = () => {
    form.resetFields()
    const defaultVisual = (projectStyleOptions.visualStyles[0]?.value ?? '现实') as ProjectVisualStyleChoice
    const defaultStyle =
      projectStyleOptions.defaultStyleByVisual?.[defaultVisual] ??
      projectStyleOptions.stylesByVisual[defaultVisual]?.[0]?.value
    form.setFieldsValue({
      visual_style: defaultVisual,
      style: defaultStyle,
      seed: Math.floor(Math.random() * 99999),
      unifyStyle: true,
      default_video_ratio: defaultVideoRatio,
    })
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async (values: {
    name: string
    description?: string
    style: string
    visual_style: ProjectVisualStyleChoice
    seed: number
    unifyStyle: boolean
    default_video_ratio?: string
  }) => {
    try {
      const createdId = newProjectId()
      const res = await StudioProjectsService.createProjectApiV1StudioProjectsPost({
        requestBody: {
          id: createdId,
          name: values.name,
          description: values.description ?? '',
          style: values.style as ProjectStyle,
          visual_style: values.visual_style as any,
          seed: values.seed,
          unify_style: values.unifyStyle,
          default_video_ratio: values.default_video_ratio || null,
          progress: 0,
        },
      })
      const created = res.data
      if (!created) throw new Error('empty project')
      const ui = toUIProject(created)
      message.success('Tạo dự án thành công')
      setCreateModalOpen(false)
      setProjects((prev) => (Array.isArray(prev) ? [...prev, ui] : [ui]))
      navigate(`/projects/${ui.id}`)
    } catch {
      message.error('Tạo thất bại')
    }
  }

  const handleOpenEdit = (e: React.MouseEvent, p: ProjectView) => {
    e.stopPropagation()
    setEditingProject(p)
    editForm.setFieldsValue({
      name: p.name,
      description: p.description,
      style: p.style,
      visual_style: p.visualStyle ?? '现实',
      seed: p.seed,
      unifyStyle: p.unifyStyle,
      default_video_ratio: p.defaultVideoRatio ?? undefined,
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (values: {
    name: string
    description?: string
    style: string
    visual_style: ProjectVisualStyleChoice
    seed: number
    unifyStyle: boolean
    default_video_ratio?: string
  }) => {
    if (!editingProject) return
    try {
      const res = await StudioProjectsService.updateProjectApiV1StudioProjectsProjectIdPatch({
        projectId: editingProject.id,
        requestBody: {
          name: values.name,
          description: values.description ?? '',
          style: values.style as ProjectStyle,
          visual_style: values.visual_style as any,
          seed: values.seed,
          unify_style: values.unifyStyle,
          default_video_ratio: values.default_video_ratio || null,
        },
      })
      const updated = res.data
      if (!updated) throw new Error('empty project')
      const ui = toUIProject(updated)
      message.success('Đã cập nhật dự án')
      setEditModalOpen(false)
      setEditingProject(null)
      setProjects((prev) =>
        Array.isArray(prev) ? prev.map((x) => (x.id === ui.id ? ui : x)) : prev
      )
    } catch {
      message.error('Cập nhật thất bại')
    }
  }

  const handleDelete = async (projectId: string) => {
    try {
      await StudioProjectsService.deleteProjectApiV1StudioProjectsProjectIdDelete({ projectId })
      message.success('Đã xóa')
      setProjects((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== projectId) : []))
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const renderStatusTag = (p: ProjectView) => {
    const status = getProjectStatus(p)
    if (status === 'completed') return <Tag color="green" className="mr-0 text-[11px] leading-4">Đã hoàn thành</Tag>
    if (status === 'draft') return <Tag color="default" className="mr-0 text-[11px] leading-4">Bản nháp</Tag>
    return <Tag color="orange" className="mr-0 text-[11px] leading-4">Đang thực hiện</Tag>
  }

  const handlePrimaryAction = (project: ProjectView, stageSummary?: ProjectStageSummary) => {
    if (!stageSummary) {
      navigate(`/projects/${project.id}`)
      return
    }
    if (stageSummary.key === 'create_first_chapter') {
      navigate(`/projects/${project.id}?tab=chapters&create=1`)
      return
    }
    if (!stageSummary.chapterId) {
      navigate(`/projects/${project.id}`)
      return
    }
    if (stageSummary.key === 'edit_raw') {
      navigate(`/projects/${project.id}?tab=chapters&edit=${stageSummary.chapterId}`)
      return
    }
    if (stageSummary.key === 'extract_shots') {
      navigate(getChapterShotsPath(project.id, stageSummary.chapterId))
      return
    }
    if (stageSummary.key === 'prepare_shots') {
      navigate(getChapterStudioPath(project.id, stageSummary.chapterId))
      return
    }
    void ensureHasShotsBeforeShooting({
      projectId: project.id,
      chapterId: stageSummary.chapterId,
      storyboardCount: stageSummary.storyboardCount,
      navigate,
    })
  }

  /**
   * Sinh nền chuyển màu nhạt ổn định theo ID dự án, tránh nền tối.
   */
  const getLightGradientByProjectId = (id: string): string => {
    const gradients = [
      'from-sky-100 via-sky-50 to-white',
      'from-emerald-100 via-emerald-50 to-white',
      'from-indigo-100 via-indigo-50 to-white',
      'from-amber-100 via-amber-50 to-white',
      'from-rose-100 via-rose-50 to-white',
      'from-violet-100 via-violet-50 to-white',
      'from-teal-100 via-teal-50 to-white',
    ]

    let hash = 0
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    }

    const index = hash % gradients.length
    return gradients[index]
  }

  const selectedProject = filteredSorted.find((p) => p.id === selectedProjectId) ?? filteredSorted[0]

  const renderCard = (p: ProjectView) => {
    const status = getProjectStatus(p)
    const stageSummary = projectStageMap[p.id]
    const flowStats = projectFlowStatsMap[p.id]
    const isCompact = viewMode === 'compact'
    const isLarge = viewMode === 'large'
    const mainActionLabel = stageSummary?.nextActionLabel ?? (status === 'completed' ? 'Tiếp tục dựng phim' : p.progress > 0 ? 'Tiếp tục quay' : 'Vào dự án')

    const isSelected = selectedProject && selectedProject.id === p.id
    const isChecked = selectedIds.includes(p.id)

    return (
      <Card
        key={p.id}
        hoverable
        loading={loading}
        size="small"
        className={`h-full cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:shadow-lg'
        }`}
        bodyStyle={{ padding: '10px' }}
        onClick={() => {
          handleSelectProject(p.id)
          if (!multiSelectMode) {
            navigate(`/projects/${p.id}`)
          }
        }}
        onMouseEnter={() => handleSelectProject(p.id)}
      >
        <div
          className={`relative mb-1.5 rounded bg-gradient-to-r ${getLightGradientByProjectId(
            p.id,
          )} text-gray-900 p-2 overflow-hidden`}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">{p.style}</div>
              <div className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold truncate text-gray-900`}>
                {p.name}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {p.updatedAt}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {renderStatusTag(p)}
              {multiSelectMode && (
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleToggleSelect(p.id, e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>

        {!isCompact && (
          <p className={`text-gray-600 text-xs mb-1.5 ${isLarge ? 'line-clamp-2 min-h-[2rem]' : 'line-clamp-1 min-h-0'}`}>
            {p.description}
          </p>
        )}

        <div className={`mb-1.5 rounded border border-gray-100 bg-gray-50 ${isCompact ? 'px-2 py-1' : 'px-2 py-1.5'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500">Giai đoạn hiện tại</span>
            <Tag color={stageSummary?.stageColor ?? 'default'} className="mr-0 text-[11px] leading-4">
              {stageSummary?.stageText ?? 'Chờ xử lý'}
            </Tag>
          </div>
          <div className={`mt-1 text-[11px] text-gray-600 ${isLarge ? 'line-clamp-2 min-h-[2rem]' : 'line-clamp-1 min-h-0'}`}>
            {stageSummary?.nextActionHint ?? 'Sau khi vào không gian làm việc dự án, tiếp tục thúc đẩy quy trình chính'}
          </div>
          {isCompact ? (
            <div className="mt-1 text-[11px] text-gray-500 truncate">
              bước tiếp theo:{stageSummary?.nextActionLabel ?? 'vào dự án'}
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag bordered={false} color="gold" className="mr-0 text-[11px]">
                chờ xác nhận {flowStats?.pendingConfirmShots ?? 0}
              </Tag>
              <Tag bordered={false} color="green" className="mr-0 text-[11px]">
                Đã sẵn sàng {flowStats?.readyShots ?? 0}
              </Tag>
              <Tag bordered={false} color="processing" className="mr-0 text-[11px]">
                Đang tạo {flowStats?.generatingShots ?? 0}
              </Tag>
            </div>
          )}
        </div>

        {!isCompact && (
          <div className="mb-1.5">
            <div className="flex justify-between text-[11px] mb-0.5 text-gray-500">
              <span>Tiến độ</span>
              <span>{p.progress}%</span>
            </div>
            <Progress
              percent={p.progress}
              size="small"
              showInfo={false}
              strokeColor={{ from: '#6366f1', to: '#a855f7' }}
            />
          </div>
        )}

        {isLarge ? (
          <Row gutter={6} className="mb-1.5">
            <Col span={6}>
              <Statistic title={<span className="text-[11px]">Chương</span>} value={p.stats.chapters} valueStyle={{ fontSize: '13px' }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="text-[11px]">Nhân vật</span>} value={p.stats.roles} valueStyle={{ fontSize: '13px' }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="text-[11px]">Bối cảnh</span>} value={p.stats.scenes} valueStyle={{ fontSize: '13px' }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="text-[11px]">Đạo cụ</span>} value={p.stats.props} valueStyle={{ fontSize: '13px' }} />
            </Col>
          </Row>
        ) : (
          <div className="mb-1.5 text-[11px] text-gray-500 truncate">
            Chương {p.stats.chapters} · Nhân vật {p.stats.roles} · Cảnh {p.stats.scenes} · Đạo cụ {p.stats.props}
          </div>
        )}

        <div className={`mt-1 border-t border-gray-100 flex items-center justify-between gap-1 ${isCompact ? 'pt-1' : 'pt-1.5'}`}>
          <span className="text-[11px] text-gray-500 truncate">{p.updatedAt}</span>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button
              type="primary"
              size="small"
              icon={<EnterOutlined />}
              onClick={() => handlePrimaryAction(p, stageSummary)}
              className="text-[11px]"
            >
              {isCompact ? 'Vào' : mainActionLabel}
            </Button>
            {!isCompact && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => handleOpenEdit(e, p)}
                  className="text-[11px]"
                />
                <Popconfirm
                  title="Xác nhận xóa dự án này?"
                  description="Sau khi xóa không thể khôi phục, các chương và tài liệu liên quan sẽ không còn được liên kết."
                  onConfirm={() => handleDelete(p.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} className="text-[11px]" />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-2 pb-2">
      <div className="sticky top-0 z-10 pb-1.5 bg-gradient-to-b from-[rgba(249,250,251,0.96)] to-[rgba(249,250,251,0.9)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Space wrap size="small" className="flex-1 min-w-[240px]">
            <Input.Search
              placeholder="Tìm kiếm tên dự án hoặc mô tả"
              allowClear
              size="small"
              className="w-64 max-w-full"
              onSearch={setSearch}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Space size="small" wrap>
              <Button
                type={filterTab === 'all' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('all')}
              >
                Tất cả
              </Button>
              <Button
                type={filterTab === 'editRaw' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('editRaw')}
              >
                Chờ bổ sung nguyên văn
              </Button>
              <Button
                type={filterTab === 'extractShots' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('extractShots')}
              >
                Phân cảnh chờ trích xuất
              </Button>
              <Button
                type={filterTab === 'prepareShots' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('prepareShots')}
              >
                Phân cảnh chờ chuẩn bị
              </Button>
              <Button
                type={filterTab === 'generating' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('generating')}
              >
                Đang tạo
              </Button>
              <Button
                type={filterTab === 'ready' ? 'primary' : 'text'}
                size="small"
                className="text-[11px]"
                onClick={() => setFilterTab('ready')}
              >
                Có thể tiếp tục
              </Button>
            </Space>
          </Space>

            <Space size="small" wrap>
            <Space size="small">
              <span className="text-xs text-gray-500">sắp xếp</span>
              <Select
                size="small"
                value={sortKey}
                style={{ width: 128 }}
                onChange={(value: SortKey) => setSortKey(value)}
                options={[
                  { label: 'Cập nhật gần nhất', value: 'updatedAt' },
                  { label: 'Tên A-Z', value: 'name' },
                  { label: 'Số lượng chương', value: 'chapters' },
                ]}
              />
              <Button
                size="small"
                type="text"
                className="text-[11px]"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </Space>

            <Space size="small">
              <span className="text-xs text-gray-500">khung nhìn</span>
              <Button
                size="small"
                type={viewMode === 'grid' ? 'primary' : 'text'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
              />
              <Button
                size="small"
                type={viewMode === 'compact' ? 'primary' : 'text'}
                icon={<BarsOutlined />}
                onClick={() => setViewMode('compact')}
              />
              <Button
                size="small"
                type={viewMode === 'large' ? 'primary' : 'text'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('large')}
              />
            </Space>

            <Space size="small">
              <Button
                size="small"
                type={multiSelectMode ? 'primary' : 'text'}
                className="text-[11px]"
                onClick={() => {
                  setMultiSelectMode((prev) => !prev)
                  setSelectedIds([])
                }}
              >
                Hàng loạt
              </Button>
              {multiSelectMode && (
                <Popconfirm
                  title="Xóa hàng loạt dự án"
                  description="Xác nhận xóa tất cả mục dự án đã chọn? Thao tác này không thể hoàn tác."
                  onConfirm={handleBatchDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedIds.length}
                >
                  <Button size="small" danger disabled={!selectedIds.length} className="text-[11px]">
                    Xóa phần đã chọn
                  </Button>
                </Popconfirm>
              )}
            </Space>

            <Button type="primary" size="small" className="text-[11px]" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              Tạo dự án mới
            </Button>
          </Space>
        </div>
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
      <Row gutter={12}>
        <Col xs={24} lg={18}>
          <Row gutter={viewMode === 'compact' ? [8, 8] : viewMode === 'large' ? [14, 14] : [12, 12]}>
            {!loading && filteredSorted.length === 0 && (
              <Col span={24}>
                <Card>
                  <div className="text-center text-gray-500 py-8 text-sm">
                    {search ? 'Không có dự án khớp' : 'Chưa có dự án, nhấn "Tạo dự án mới" để bắt đầu'}
                  </div>
                </Card>
              </Col>
            )}
            {filteredSorted.map((p) => (
              <Col
                key={p.id}
                xs={24}
                sm={viewMode === 'compact' ? 12 : viewMode === 'grid' ? 12 : 24}
                md={viewMode === 'compact' ? 8 : viewMode === 'grid' ? 8 : 24}
                lg={viewMode === 'compact' ? 6 : viewMode === 'grid' ? 6 : 24}
                xl={viewMode === 'compact' ? 4 : viewMode === 'grid' ? 6 : 24}
              >
                {renderCard(p)}
              </Col>
            ))}
          </Row>
        </Col>

        <Col xs={24} lg={6} className="flex-shrink-0">
          <div className="h-full">
            <Card
              size="small"
              title="Điểm qua dự án"
              className="mb-1.5"
              bodyStyle={{ padding: '10px' }}
              headStyle={{ minHeight: 36, paddingInline: 10 }}
            >
              {selectedProject ? (
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Tên dự án</div>
                    <div className="font-medium">{selectedProject.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Giới thiệu</div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {selectedProject.description || 'Chưa có mô tả'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>phong cách video:{selectedProject.style}</span>
                    <span>Hạt giống: {selectedProject.seed}</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Tiến độ</div>
                    <Progress
                      percent={selectedProject.progress}
                      size="small"
                      strokeColor={{ from: '#6366f1', to: '#22c55e' }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Chương {selectedProject.stats.chapters} · Nhân vật {selectedProject.stats.roles} · Bối cảnh {selectedProject.stats.scenes} · Đạo cụ {selectedProject.stats.props}
                  </div>
                  <Button
                    type="primary"
                    block
                    size="small"
                    icon={<EnterOutlined />}
                    onClick={() => navigate(`/projects/${selectedProject.id}`)}
                    className="text-[11px]"
                  >
                    Vào không gian làm việc chương
                  </Button>
                </div>
              ) : (
                <div className="text-gray-500 text-sm py-6 text-center">
                  Đưa chuột lên thẻ dự án để xem chi tiết
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>
      </div>

      <Modal
        title="Tạo mới dự án kịch bản ngắn"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            visual_style: projectStyleOptions.visualStyles[0]?.value ?? 'thực tế',
            style:
              projectStyleOptions.defaultStyleByVisual?.[projectStyleOptions.visualStyles[0]?.value ?? '现实'] ??
              projectStyleOptions.stylesByVisual[projectStyleOptions.visualStyles[0]?.value ?? '现实']?.[0]?.value ??
              'Người thật đô thị',
            seed: Math.floor(Math.random() * 99999),
            unifyStyle: true,
            default_video_ratio: defaultVideoRatio,
          }}
        >
          <Form.Item
            name="name"
            label="Tên dự án"
            rules={[{ required: true, message: 'vui lòng nhập tên dự án' }]}
          >
            <Input placeholder="Ví dụ: ngắn kỳ tình yêu đô thị hiện thực" />
          </Form.Item>
          <Form.Item name="description" label="giới thiệu dự án (tùy chọn)">
            <Input.TextArea rows={4} placeholder="Giới thiệu dự án và mô tả phong cách, khuyến nghị 80–120 chữ" />
          </Form.Item>
          <ProjectVisualStyleAndStyleFields form={form} options={projectStyleOptions} />
          <Form.Item
            name="seed"
            label="Giá trị hạt giống (seed) toàn cục"
            tooltip="Cố định seed giúp đảm bảo tông trực quan của cả bộ phim ngắn nhất quán"
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="default_video_ratio" label="Tỷ lệ video mặc định">
            <Select allowClear placeholder="Khi không đặt thì do mô hình/nhà cung cấp quyết định" options={videoRatioOptions} />
          </Form.Item>
          <Form.Item
            name="unifyStyle"
            label="Mọi chương bắt buộc kế thừa phong cách này"
            valuePropName="checked"
            tooltip="Khi bật, tất cả chương kế thừa phong cách dự án"
          >
            <Switch />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Tạo và đi vào
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chỉnh sửa dự án"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingProject(null) }}
        footer={null}
        width={520}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          initialValues={{ style: '真人都市', visual_style: '现实', unifyStyle: true }}
        >
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}>
            <Input placeholder="Tên dự án" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Giới thiệu dự án và mô tả phong cách" />
          </Form.Item>
          <ProjectVisualStyleAndStyleFields form={editForm} options={projectStyleOptions} />
          <Form.Item name="seed" label="Giá trị seed toàn cục" tooltip="Cố định seed giúp đảm bảo tông hình ảnh nhất quán cho toàn bộ bộ phim ngắn">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="default_video_ratio" label="Tỷ lệ video mặc định">
            <Select allowClear placeholder="Khi không đặt thì do mô hình/nhà cung cấp quyết định" options={videoRatioOptions} />
          </Form.Item>
          <Form.Item name="unifyStyle" label="Thống nhất phong cách" valuePropName="checked" tooltip="Khi bật, mọi chương sẽ kế thừa phong cách dự án">
            <Switch />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => { setEditModalOpen(false); setEditingProject(null) }}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lưu</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectLobby
