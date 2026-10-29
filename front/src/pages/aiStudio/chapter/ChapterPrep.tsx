import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Empty,
  Checkbox,
  Input,
  Layout,
  List,
  Modal,
  Skeleton,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  MergeCellsOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StudioChaptersService } from '../../../services/generated'
import type { ChapterRead } from '../../../services/generated'
import type { Chapter } from '../../../mocks/data'
import { ChapterRawTextEditorModal } from './components/ChapterRawTextEditorModal'

const { Header, Content } = Layout

type ExtractKind = 'storyboards' | 'roles' | 'scenes' | 'props'

type StoryboardSuggestion = {
  id: string
  index: number
  title: string
  preview: string
  paragraphRange: string
  duration: string
  actions: string[]
  roles: string[]
  scenes: string[]
  props: string[]
  isTransition?: boolean
}

type RoleItem = {
  id: string
  name: string
  aliases: string[]
  firstSeen: string
  description: string
  primary: boolean
}

type SceneItem = {
  id: string
  name: string
  indoorOutdoor: 'trong nhà' | 'ngoài trời' | 'chưa rõ'
  time: 'Ban ngày' | 'Ban đêm' | 'Không rõ'
  keywords: string[]
}

type PropItem = {
  id: string
  name: string
  owner?: string
  count: number
  key: boolean
}

type SceneDraft = SceneItem & { description?: string; imageUrl?: string }
type PropDraft = PropItem & { description?: string; imageUrl?: string }
type RoleDraft = RoleItem & { imageUrl?: string }

type StoryboardDraft = StoryboardSuggestion

type ExtractResults = {
  storyboards: StoryboardSuggestion[]
  roles: RoleItem[]
  scenes: SceneItem[]
  props: PropItem[]
}

// TODO: sau khi tích hợp các API "bản nháp chương/lịch sử phiên bản/giản lược thông minh", có thể gỡ logic Mock và dữ liệu định sẵn của trang hiện tại.

type EntityKind = 'roles' | 'scenes' | 'props'

type ExistingEntities = {
  roles: string[]
  scenes: string[]
  props: string[]
}

function entitiesStorageKey(projectId: string) {
  return `jellyfish_project_entities_v1:${projectId}`
}

function extractMock(text: string): ExtractResults {
  const baseRoles = ['Tiểu Vũ', 'A Xuyên', 'Chủ nhà']
  const baseScenes = ['căn cho thuê 10m vuông', 'hành lang khu chung cư cũ ven đô', 'cạnh cửa sổ']
  const baseProps = ['mậu nợ', 'quạt', 'điện thoại', 'chìa khóa']
  const hasText = text.trim().length > 0

  const storyboards: StoryboardSuggestion[] = (hasText ? Array.from({ length: 8 }) : []).map((_, i) => ({
    id: `sb-${i + 1}`,
    index: i + 1,
    title:
      i === 2 ? 'Hai người đối đầu' :
        i === 5 ? 'Dừng lại trước cửa' :
          `Đẩy đoạn · ${i + 1}`,
    preview:
      i === 0 ? 'Khu nhà cũ dưới ánh đêm, đèn đường vàng úa, cảm xúc đè nén.' :
        i === 1 ? 'Trong phòng thuê, chiếc quạt kêu ọ ọ, tờ nợ trải trên bàn.' :
          i === 2 ? 'Im lặng kéo dài, ánh mắt đối đầu, ai cũng không chịu mở lời trước.' :
            'Th thoại đẩy mạch truyện, cảm xúc lên xuống, hành động kéo theo thay đổi quan hệ.',
    paragraphRange: `đoạn ${i * 2 + 1}–${i * 2 + 2}`,
    duration: i % 3 === 0 ? '8–12 giây' : '5–9 giây',
    actions: i % 2 === 0 ? ['Lặng lẽ', 'Quay người'] : ['Chất vấn', 'Trì hoãn'],
    roles: i % 2 === 0 ? ['Tiểu Vũ', 'A Xuyên'] : ['Tiểu Vũ'],
    scenes: i % 3 === 0 ? ['căn cho thuê 10m vuông'] : ['hành lang khu chung cư cũ ven đô'],
    props: i % 2 === 0 ? ['Giấy nợ'] : ['Điện thoại'],
    isTransition: i === 5,
  }))

  const roles: RoleItem[] = (hasText ? baseRoles : []).map((name, i) => ({
    id: `r-${i + 1}`,
    name,
    aliases: name === 'Tiểu Vũ' ? ['Tiểu Vũ'] : [],
    firstSeen: `Đoạn ${i + 1}`,
    description: name === 'Xiao Vũ' ? 'Chuyên viên vận hành Internet 25 tuổi, mệt mỏi nhưng ánh mắt kiên định.' : 'Cảm xúc kìm chế, ít nói nhưng sắc lạnh.',
    primary: name !== 'Chủ nhà',
  }))

  const scenes: SceneItem[] = (hasText ? baseScenes : []).map((name, i) => ({
    id: `s-${i + 1}`,
    name,
    indoorOutdoor: i === 0 ? 'trong nhà' : i === 1 ? 'ngoài trời' : 'chưa rõ',
    time: i === 1 ? 'Ban đêm' : 'Ban ngày',
    keywords: i === 0 ? ['Hẹp', 'Đèn trần lạnh trắng'] : ['Đèn đường vàng úa', 'Đông'],
  }))

  const props: PropItem[] = (hasText ? baseProps : []).map((name, i) => ({
    id: `p-${i + 1}`,
    name,
    owner: name === 'Điện thoại' ? 'Tiểu Vũ' : undefined,
    count: 1 + (i % 3),
    key: name === 'Ghi nợ',
  }))

  return { storyboards, roles, scenes, props }
}

function toUIChapter(c: ChapterRead): Chapter {
  return {
    id: c.id,
    projectId: c.project_id,
    index: c.index,
    title: c.title,
    summary: c.summary ?? '',
    storyboardCount: c.storyboard_count ?? 0,
    status: c.status ?? 'draft',
    updatedAt: new Date().toISOString(),
  }
}

const ChapterPrep: React.FC = () => {
  const { projectId, chapterId } = useParams<{ projectId?: string; chapterId?: string }>()
  const navigate = useNavigate()

  const [activeStep, setActiveStep] = useState(0)

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  const [rawText, setRawText] = useState('')
  const [, setCondensedText] = useState('')

  const [editorModalOpen, setEditorModalOpen] = useState(false)

  const [extracting, setExtracting] = useState(false)
  const [results, setResults] = useState<ExtractResults>({ storyboards: [], roles: [], scenes: [], props: [] })
  const [extractReviewOpen, setExtractReviewOpen] = useState(false)
  const [extractReviewTab, setExtractReviewTab] = useState<EntityKind>('roles')
  const [existingEntities, setExistingEntities] = useState<ExistingEntities>({ roles: [], scenes: [], props: [] })
  const [selectedEntityKeys, setSelectedEntityKeys] = useState<Record<EntityKind, string[]>>({
    roles: [],
    scenes: [],
    props: [],
  })

  const [selectedKind, setSelectedKind] = useState<ExtractKind>('storyboards')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [sceneDrafts, setSceneDrafts] = useState<SceneDraft[]>([])
  const [propDrafts, setPropDrafts] = useState<PropDraft[]>([])
  const [roleDrafts, setRoleDrafts] = useState<RoleDraft[]>([])
  const [storyboardDrafts, setStoryboardDrafts] = useState<StoryboardDraft[]>([])

  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([])
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  const [editEntityOpen, setEditEntityOpen] = useState(false)
  const [editEntityKind, setEditEntityKind] = useState<'scene' | 'prop' | 'role'>('scene')
  const [editEntityId, setEditEntityId] = useState<string | null>(null)
  const [editEntityName, setEditEntityName] = useState('')
  const [editEntityDesc, setEditEntityDesc] = useState('')

  const [addEntityOpen, setAddEntityOpen] = useState(false)
  const [addEntityKind, setAddEntityKind] = useState<'scene' | 'prop' | 'role'>('scene')
  const [addEntityName, setAddEntityName] = useState('')
  const [addEntityDesc, setAddEntityDesc] = useState('')

  const [pickFromAssetsOpen, setPickFromAssetsOpen] = useState(false)
  const [pickFromAssetsKind, setPickFromAssetsKind] = useState<'scene' | 'prop' | 'role'>('scene')
  const [pickFromAssetsSelected, setPickFromAssetsSelected] = useState<string[]>([])

  const [editStoryboardOpen, setEditStoryboardOpen] = useState(false)
  const [editingStoryboard, setEditingStoryboard] = useState<StoryboardDraft | null>(null)

  const handleFinishPrep = () => {
    if (!projectId) {
      navigate('/projects')
      return
    }
    navigate(`/projects/${projectId}?tab=chapters`)
  }

  // Lưu chỗ: sau này có thể hiển thị số chữ/số đoạn trong vùng chỉnh sửa step

  useEffect(() => {
    if (!chapterId) return
    StudioChaptersService.getChapterApiV1StudioChaptersChapterIdGet({ chapterId })
      .then((res) => {
        const data = res.data
        if (!data) {
          setChapter(null)
          return
        }
        const ui = toUIChapter(data)
        setChapter(ui)
        setTitleValue(ui.title)

        const nextRaw = data.raw_text ?? ''
        const nextCondensed = data.condensed_text ?? ''
        setRawText(nextRaw)
        setCondensedText(nextCondensed)
        setResults(extractMock(nextRaw))
      })
      .catch(() => {
        setChapter(null)
      })
  }, [chapterId])

  useEffect(() => {
    // Ánh xạ kết quả trích xuất thành bản nháp có thể chỉnh sửa của từng step (giữ tối đa trạng thái chỉnh sửa/tạo của người dùng)
    setSceneDrafts((prev) => {
      const prevMap = new Map(prev.map((x) => [x.id, x]))
      return results.scenes.map((s) => ({ ...s, ...(prevMap.get(s.id) ?? {}) }))
    })
    setPropDrafts((prev) => {
      const prevMap = new Map(prev.map((x) => [x.id, x]))
      return results.props.map((p) => ({ ...p, ...(prevMap.get(p.id) ?? {}) }))
    })
    setRoleDrafts((prev) => {
      const prevMap = new Map(prev.map((x) => [x.id, x]))
      return results.roles.map((r) => ({ ...r, ...(prevMap.get(r.id) ?? {}) }))
    })
    setStoryboardDrafts((prev) => {
      const prevMap = new Map(prev.map((x) => [x.id, x]))
      return results.storyboards.map((sb) => ({ ...sb, ...(prevMap.get(sb.id) ?? {}) }))
    })
  }, [results.scenes, results.props, results.roles, results.storyboards])

  useEffect(() => {
    if (!projectId) return
    try {
      const raw = window.localStorage.getItem(entitiesStorageKey(projectId))
      const parsed = raw ? (JSON.parse(raw) as ExistingEntities) : null
      if (parsed && typeof parsed === 'object') {
        setExistingEntities({
          roles: Array.isArray(parsed.roles) ? parsed.roles : [],
          scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
          props: Array.isArray(parsed.props) ? parsed.props : [],
        })
      }
    } catch {
      // ignore
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    try {
      window.localStorage.setItem(entitiesStorageKey(projectId), JSON.stringify(existingEntities))
    } catch {
      // ignore
    }
  }, [projectId, existingEntities])

  // TODO: sau này có thể nối API "bản nháp chương/lịch sử phiên bản" tại đây, thay thế dữ liệu sẵn và trạng thái local hiện tại.

  const runExtract = async (kind: 'all' | ExtractKind) => {
    if (!rawText.trim()) {
      message.warning('Vui lòng dán hoặc nhập nguyên văn trước')
      return
    }
    setExtracting(true)
    try {
      await new Promise((r) => setTimeout(r, 900))
      const next = extractMock(rawText)
      setResults((prev) => {
        if (kind === 'all') return next
        switch (kind) {
          case 'storyboards':
            return { ...prev, storyboards: next.storyboards }
          case 'roles':
            return { ...prev, roles: next.roles }
          case 'scenes':
            return { ...prev, scenes: next.scenes }
          case 'props':
            return { ...prev, props: next.props }
          default:
            return prev
        }
      })
      message.success('Hoàn tất trích xuất (Mock)')

      // Mở hộp nổi hồi chiếu trích xuất
      if (kind === 'roles' || kind === 'scenes' || kind === 'props') {
        setExtractReviewTab(kind)
      } else {
        setExtractReviewTab('roles')
      }
      setSelectedEntityKeys({ roles: [], scenes: [], props: [] })
      setExtractReviewOpen(true)
    } finally {
      setExtracting(false)
    }
  }

  const existingSet = useMemo(() => {
    return {
      roles: new Set(existingEntities.roles),
      scenes: new Set(existingEntities.scenes),
      props: new Set(existingEntities.props),
    }
  }, [existingEntities])

  const addSelectedEntities = (kind: EntityKind) => {
    const selected = selectedEntityKeys[kind]
    if (selected.length === 0) {
      message.info('Vui lòng chọn nội dung cần thêm')
      return
    }
    const duplicates = selected.filter((name) => existingSet[kind].has(name))
    const uniques = selected.filter((name) => !existingSet[kind].has(name))

    const doAdd = () => {
      if (uniques.length === 0) {
        message.info('Nội dung đã chọn đều tồn tại, không cần thêm')
        return
      }
      setExistingEntities((prev) => ({
        ...prev,
        [kind]: Array.from(new Set([...(prev[kind] as string[]), ...uniques])),
      }))
      setSelectedEntityKeys((prev) => ({ ...prev, [kind]: [] }))
      message.success(`đã thêm ${uniques.length} mục`)
    }

    if (duplicates.length > 0) {
      Modal.confirm({
        title: 'Tồn tại nội dung trùng lặp',
        content: `Nội dung bạn chọn có ${duplicates.length} mục đã tồn tại, hệ thống sẽ tự động bỏ qua các mục trùng lặp, có tiếp tục thêm nội dung còn lại không？`,
        okText: 'Tiếp tục thêm',
        cancelText: 'Hủy',
        onOk: doAdd,
      })
      return
    }
    doAdd()
  }

  const toggleSelectAllNew = (kind: EntityKind) => {
    const items =
      kind === 'roles'
        ? results.roles.map((r) => r.name)
        : kind === 'scenes'
          ? results.scenes.map((s) => s.name)
          : results.props.map((p) => p.name)
    const newOnes = items.filter((name) => !existingSet[kind].has(name))
    setSelectedEntityKeys((prev) => ({ ...prev, [kind]: newOnes }))
  }

  const openEditEntity = (kind: 'scene' | 'prop' | 'role', id: string) => {
    setEditEntityKind(kind)
    setEditEntityId(id)
    if (kind === 'scene') {
      const it = sceneDrafts.find((x) => x.id === id)
      setEditEntityName(it?.name ?? '')
      setEditEntityDesc(it?.description ?? '')
    } else if (kind === 'prop') {
      const it = propDrafts.find((x) => x.id === id)
      setEditEntityName(it?.name ?? '')
      setEditEntityDesc(it?.description ?? '')
    } else {
      const it = roleDrafts.find((x) => x.id === id)
      setEditEntityName(it?.name ?? '')
      setEditEntityDesc(it?.description ?? it?.description ?? '')
    }
    setEditEntityOpen(true)
  }

  const saveEditEntity = () => {
    if (!editEntityId) return
    if (editEntityKind === 'scene') {
      setSceneDrafts((prev) =>
        prev.map((x) => (x.id === editEntityId ? { ...x, name: editEntityName, description: editEntityDesc } : x)),
      )
    } else if (editEntityKind === 'prop') {
      setPropDrafts((prev) =>
        prev.map((x) => (x.id === editEntityId ? { ...x, name: editEntityName, description: editEntityDesc } : x)),
      )
    } else {
      setRoleDrafts((prev) =>
        prev.map((x) => (x.id === editEntityId ? { ...x, name: editEntityName, description: editEntityDesc } : x)),
      )
    }
    setEditEntityOpen(false)
    setEditEntityId(null)
    message.success('Đã lưu (Mock)')
  }

  const openAddEntity = (kind: 'scene' | 'prop' | 'role') => {
    setAddEntityKind(kind)
    setAddEntityName('')
    setAddEntityDesc('')
    setAddEntityOpen(true)
  }

  const addEntity = () => {
    if (!addEntityName.trim()) {
      message.warning('Vui lòng nhập tên')
      return
    }
    const id = `${addEntityKind}-${Date.now()}`
    if (addEntityKind === 'scene') {
      setSceneDrafts((prev) => [
        ...prev,
        {
          id,
          name: addEntityName.trim(),
          indoorOutdoor: 'chưa rõ' as const,
          time: 'Không rõ' as const,
          keywords: [] as string[],
          description: addEntityDesc,
        },
      ])
    } else if (addEntityKind === 'prop') {
      setPropDrafts((prev) => [
        ...prev,
        { id, name: addEntityName.trim(), count: 1, key: false, description: addEntityDesc },
      ])
    } else {
      setRoleDrafts((prev) => [
        ...prev,
        {
          id,
          name: addEntityName.trim(),
          aliases: [],
          firstSeen: '',
          description: addEntityDesc,
          primary: true,
        },
      ])
    }
    setAddEntityOpen(false)
    message.success('Đã thêm (Mock)')
  }

  const openPickFromAssets = (kind: 'scene' | 'prop' | 'role') => {
    setPickFromAssetsKind(kind)
    setPickFromAssetsSelected([])
    setPickFromAssetsOpen(true)
  }

  const confirmPickFromAssets = () => {
    if (pickFromAssetsSelected.length === 0) {
      message.info('Vui lòng chọn nội dung cần thêm')
      return
    }
    if (pickFromAssetsKind === 'scene') {
      setSceneDrafts((prev) => [
        ...prev,
        ...pickFromAssetsSelected.map((name) => ({
          id: `asset-scene-${name}`,
          name,
          indoorOutdoor: 'chưa rõ' as const,
          time: 'Không rõ' as const,
          keywords: [] as string[],
          description: 'Từ thư viện tài nguyên (Mock)',
        })),
      ])
    } else if (pickFromAssetsKind === 'prop') {
      setPropDrafts((prev) => [
        ...prev,
        ...pickFromAssetsSelected.map((name) => ({
          id: `asset-prop-${name}`,
          name,
          count: 1,
          key: false,
          description: 'Từ thư viện tài nguyên (Mock)',
        })),
      ])
    } else {
      setRoleDrafts((prev) => [
        ...prev,
        ...pickFromAssetsSelected.map((name) => ({
          id: `asset-role-${name}`,
          name,
          aliases: [],
          firstSeen: '',
          description: 'Từ thư viện tài nguyên (Mock)',
          primary: true,
        })),
      ])
    }
    setPickFromAssetsOpen(false)
    message.success('Đã thêm từ kho tài nguyên (Mock)')
  }

  const generateImages = (kind: 'scene' | 'prop' | 'role') => {
    const stamp = Date.now()
    const url = `mock://generated/${kind}/${stamp}`
    if (kind === 'scene') {
      setSceneDrafts((prev) =>
        prev.map((x) => (selectedSceneIds.includes(x.id) ? { ...x, imageUrl: url } : x)),
      )
      message.success('Đã tạo hình ảnh bối cảnh (Mock)')
      return
    }
    if (kind === 'prop') {
      setPropDrafts((prev) =>
        prev.map((x) => (selectedPropIds.includes(x.id) ? { ...x, imageUrl: url } : x)),
      )
      message.success('Đã tạo hình ảnh đạo cụ (Mock)')
      return
    }
    setRoleDrafts((prev) =>
      prev.map((x) => (selectedRoleIds.includes(x.id) ? { ...x, imageUrl: url } : x)),
    )
    message.success('Đã tạo hình ảnh nhân vật (Mock)')
  }

  const openEditStoryboard = (sb: StoryboardDraft) => {
    setEditingStoryboard(sb)
    setEditStoryboardOpen(true)
  }

  const saveStoryboard = () => {
    if (!editingStoryboard) return
    setStoryboardDrafts((prev) => prev.map((x) => (x.id === editingStoryboard.id ? editingStoryboard : x)))
    setEditStoryboardOpen(false)
    setEditingStoryboard(null)
    message.success('Đã lưu phân cảnh (Mock)')
  }

  const currentItemsCount = useMemo(() => {
    return {
      storyboards: results.storyboards.length,
      roles: results.roles.length,
      scenes: results.scenes.length,
      props: results.props.length,
    }
  }, [results])

  const selectedStoryboard = useMemo(
    () => results.storyboards.find((x) => x.id === selectedId) ?? null,
    [results.storyboards, selectedId],
  )

  const selectedRole = useMemo(
    () => results.roles.find((x) => x.id === selectedId) ?? null,
    [results.roles, selectedId],
  )

  const selectedScene = useMemo(
    () => results.scenes.find((x) => x.id === selectedId) ?? null,
    [results.scenes, selectedId],
  )

  const selectedProp = useMemo(
    () => results.props.find((x) => x.id === selectedId) ?? null,
    [results.props, selectedId],
  )

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
          to={projectId ? `/projects/${projectId}?tab=chapters` : '/projects'}
          className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
        >
          <ArrowLeftOutlined /> Quay lại danh sách chương
        </Link>
        <Divider type="vertical" />

        <div className="min-w-0 flex-1 flex items-center gap-2">
          {titleEditing ? (
            <Input
              value={titleValue}
              autoFocus
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setTitleEditing(false)
                if (e.key === 'Escape') {
                  setTitleEditing(false)
                  setTitleValue(chapter?.title ?? titleValue)
                }
              }}
              style={{ maxWidth: 520 }}
            />
          ) : (
            <div
              className="font-medium text-gray-900 truncate cursor-pointer"
              title="Nhấp đúp để sửa tiêu đề"
              onDoubleClick={() => setTitleEditing(true)}
            >
              {chapter ? `Chương ${chapter.index} · ${titleValue || chapter.title}` : 'Chỉnh sửa chương'}
            </div>
          )}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <CheckCircleOutlined /> Đã nạp
          </div>
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
        <Card size="small" className="mb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <Steps
              current={activeStep}
              onChange={setActiveStep}
              className="flex-1 min-w-[520px]"
              items={[
                { title: 'Trích xuất thông minh' },
                { title: 'Tạo bối cảnh' },
                { title: 'Tạo đạo cụ' },
                { title: 'Tạo nhân vật' },
                { title: 'Xem trước phân cảnh' },
              ]}
            />
            <Space>
              {activeStep > 0 && (
                <Button onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>
                  Bước trước: {['Trích xuất thông minh', 'Tạo bối cảnh', 'Tạo đạo cụ', 'Tạo nhân vật', 'Xem trước phân cảnh'][activeStep - 1]}
                </Button>
              )}
              {activeStep < 4 ? (
                <Button type="primary" onClick={() => setActiveStep((s) => Math.min(4, s + 1))}>
                  Bước tiếp: {['Trích xuất thông minh', 'Tạo bối cảnh', 'Tạo đạo cụ', 'Tạo nhân vật', 'Xem trước phân cảnh'][activeStep + 1]}
                </Button>
              ) : (
                <Button type="primary" onClick={handleFinishPrep}>
                  Chuẩn bị kết thúc
                </Button>
              )}
            </Space>
          </div>
        </Card>

        {activeStep === 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <Card size="small">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Space>
                  <Button icon={<FileTextOutlined />} onClick={() => setEditorModalOpen(true)}>
                    Chỉnh sửa nguyên văn
                  </Button>
                  <Button type="primary" loading={extracting} icon={<ThunderboltOutlined />} onClick={() => void runExtract('all')}>
                    Trích xuất tất cả bằng một nút
                  </Button>
                  <span className="text-xs text-gray-500">
                    {currentItemsCount.roles + currentItemsCount.scenes + currentItemsCount.props > 0 ? 'Đã trích xuất, có thể trích xuất lại' : 'Chưa trích xuất'}
                  </span>
                </Space>
              </div>
            </Card>

            {/* Điều hướng trái + chi tiết phải */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
              {/* Điều hướng bên trái */}
              <Card
                style={{ width: 340, minWidth: 280, maxWidth: 420, height: '100%', overflow: 'hidden', flexShrink: 0 }}
                bodyStyle={{ padding: 12, height: '100%', minHeight: 0, overflow: 'auto' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">điều hướng kết quả trích xuất</div>
                  <Badge status={extracting ? 'processing' : 'success'} text={extracting ? 'Đang trích xuất…' : 'Sẵn sàng'} />
                </div>
                <Collapse
                  defaultActiveKey={['storyboards']}
                  items={[
                    {
                      key: 'storyboards',
                      label: `Gợi ý phân cảnh nguyên văn (${currentItemsCount.storyboards})`,
                      extra: (
                        <Space size="small">
                          <Tooltip title="Trích xuất lại">
                            <Button size="small" type="text" icon={<ReloadOutlined />} onClick={() => void runExtract('storyboards')} />
                          </Tooltip>
                        </Space>
                      ),
                      children: extracting ? (
                        <Skeleton active paragraph={{ rows: 4 }} />
                      ) : (
                        <List
                          size="small"
                          dataSource={results.storyboards}
                          locale={{ emptyText: <Empty description="Chưa có gợi ý phân cảnh" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                          renderItem={(it) => (
                            <List.Item
                              onClick={() => {
                                setSelectedKind('storyboards')
                                setSelectedId(it.id)
                              }}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 10,
                                padding: '8px 10px',
                                background: selectedKind === 'storyboards' && selectedId === it.id ? 'rgba(59,130,246,0.10)' : undefined,
                              }}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {String(it.index).padStart(2, '0')} · {it.title}
                                </div>
                                <div className="text-xs text-gray-500 truncate">{it.preview}</div>
                              </div>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                    {
                      key: 'roles',
                      label: `Nhân vật (${currentItemsCount.roles})`,
                      children: extracting ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : (
                        <List
                          size="small"
                          dataSource={results.roles}
                          locale={{ emptyText: <Empty description="Chưa có nhân vật" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                          renderItem={(it) => (
                            <List.Item
                              onClick={() => {
                                setSelectedKind('roles')
                                setSelectedId(it.id)
                              }}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 10,
                                padding: '8px 10px',
                                background: selectedKind === 'roles' && selectedId === it.id ? 'rgba(59,130,246,0.10)' : undefined,
                              }}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{it.name}</div>
                                <div className="text-xs text-gray-500 truncate">{it.description}</div>
                              </div>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                    {
                      key: 'scenes',
                      label: `bối cảnh(${currentItemsCount.scenes})`,
                      children: extracting ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : (
                        <List
                          size="small"
                          dataSource={results.scenes}
                          locale={{ emptyText: <Empty description="Chưa có bối cảnh" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                          renderItem={(it) => (
                            <List.Item
                              onClick={() => {
                                setSelectedKind('scenes')
                                setSelectedId(it.id)
                              }}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 10,
                                padding: '8px 10px',
                                background: selectedKind === 'scenes' && selectedId === it.id ? 'rgba(59,130,246,0.10)' : undefined,
                              }}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{it.name}</div>
                                <div className="text-xs text-gray-500 truncate">{it.indoorOutdoor} · {it.time}</div>
                              </div>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                    {
                      key: 'props',
                      label: `Đạo cụ (${currentItemsCount.props})`,
                      children: extracting ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : (
                        <List
                          size="small"
                          dataSource={results.props}
                          locale={{ emptyText: <Empty description="Chưa có đạo cụ" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                          renderItem={(it) => (
                            <List.Item
                              onClick={() => {
                                setSelectedKind('props')
                                setSelectedId(it.id)
                              }}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 10,
                                padding: '8px 10px',
                                background: selectedKind === 'props' && selectedId === it.id ? 'rgba(59,130,246,0.10)' : undefined,
                              }}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{it.name}</div>
                                <div className="text-xs text-gray-500 truncate">Xuất hiện {it.count} lần{it.key ? ' · Đạo cụ chính' : ''}</div>
                              </div>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                  ]}
                />
              </Card>

              {/* Chi tiết bên phải */}
              <Card style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }} bodyStyle={{ padding: 12, height: '100%', minHeight: 0, overflow: 'auto' }}>
                {selectedKind === 'storyboards' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Gợi ý phân cảnh</div>
                      <Space>
                        <Button icon={<MergeCellsOutlined />}>Thao tác theo lô (Mock)</Button>
                        <Button icon={<PlayCircleOutlined />}>Xem trước（Mock）</Button>
                      </Space>
                    </div>
                    {selectedStoryboard ? (
                      <Card size="small">
                        <div className="text-base font-semibold">
                          {String(selectedStoryboard.index).padStart(2, '0')} · {selectedStoryboard.title}
                          {selectedStoryboard.isTransition && <Tag color="purple" className="ml-2">Điểm chuyển cảnh</Tag>}
                        </div>
                        <Divider />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-gray-500">Đoạn văn bản gốc:</span>{selectedStoryboard.paragraphRange}</div>
                          <div><span className="text-gray-500">Thời lượng đề xuất：</span>{selectedStoryboard.duration}</div>
                          <div><span className="text-gray-500">Hành động chính:</span>{selectedStoryboard.actions.join('、')}</div>
                          <div><span className="text-gray-500">Nhân vật liên quan:</span>{selectedStoryboard.roles.join('、')}</div>
                          <div><span className="text-gray-500">Bối cảnh liên quan:</span>{selectedStoryboard.scenes.join('、')}</div>
                          <div><span className="text-gray-500">Đạo cụ liên quan:</span>{selectedStoryboard.props.join('、')}</div>
                        </div>
                        <Divider />
                        <Space wrap>
                          <Button icon={<EditOutlined />}>Chỉnh sửa tiêu đề (Mock)</Button>
                          <Button icon={<MergeCellsOutlined />}>Gộp vào mục trước (Mock)</Button>
                          <Button icon={<DeleteOutlined />} danger>Xóa (Mock)</Button>
                          <Button icon={<VideoCameraOutlined />}>Đánh dấu là chuyển cảnh (Mock)</Button>
                        </Space>
                      </Card>
                    ) : (
                      <Empty description="Hãy chọn một gợi ý phân cảnh từ thanh bên trái" />
                    )}
                  </div>
                )}

                {selectedKind === 'roles' && (
                  <div className="space-y-3">
                    <div className="font-medium">Nhân vật</div>
                    {selectedRole ? (
                      <Card size="small">
                        <div className="flex items-center justify-between">
                          <div className="text-base font-semibold">{selectedRole.name}</div>
                          <Space>
                            <span className="text-sm text-gray-500">Nhân vật chính</span>
                            <Switch checked={selectedRole.primary} />
                          </Space>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Xuất hiện lần đầu: {selectedRole.firstSeen}</div>
                        <Divider />
                        <div className="text-sm">{selectedRole.description}</div>
                        <div className="mt-2">
                          {selectedRole.aliases.map((a) => (
                            <Tag key={a}>{a}</Tag>
                          ))}
                        </div>
                        <Divider />
                        <Space wrap>
                          <Button>Liên kết nhân vật từ kho tài nguyên (Mock)</Button>
                          <Button type="primary">tạo tài nguyên nhân vật mới(Mock)</Button>
                          <Button danger icon={<DeleteOutlined />}>Xóa (Mock)</Button>
                        </Space>
                      </Card>
                    ) : (
                      <Empty description="Hãy chọn một nhân vật từ thanh bên trái" />
                    )}
                  </div>
                )}

                {selectedKind === 'scenes' && (
                  <div className="space-y-3">
                    <div className="font-medium">Bối cảnh</div>
                    {selectedScene ? (
                      <Card size="small">
                        <div className="text-base font-semibold">{selectedScene.name}</div>
                        <div className="text-sm text-gray-500 mt-1">{selectedScene.indoorOutdoor} · {selectedScene.time}</div>
                        <Divider />
                        <div className="flex flex-wrap gap-2">
                          {selectedScene.keywords.map((k) => <Tag key={k} color="blue">{k}</Tag>)}
                        </div>
                        <Divider />
                        <Space wrap>
                          <Button>Liên kết bối cảnh từ kho tài nguyên (Mock)</Button>
                          <Button type="primary">tạo tài nguyên bối cảnh mới(Mock)</Button>
                          <Button danger icon={<DeleteOutlined />}>Xóa (Mock)</Button>
                        </Space>
                      </Card>
                    ) : (
                      <Empty description="Hãy chọn một bối cảnh từ thanh bên trái" />
                    )}
                  </div>
                )}

                {selectedKind === 'props' && (
                  <div className="space-y-3">
                    <div className="font-medium">Đạo cụ</div>
                    {selectedProp ? (
                      <Card size="small">
                        <div className="flex items-center gap-2">
                          <div className="text-base font-semibold">{selectedProp.name}</div>
                          {selectedProp.key && <Tag color="gold">Đạo cụ chính</Tag>}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Số lần xuất hiện: {selectedProp.count}</div>
                        <Divider />
                        <Space wrap>
                          <Button>Liên kết đạo cụ từ kho tài nguyên (Mock)</Button>
                          <Button type="primary">tạo tài nguyên đạo cụ mới(Mock)</Button>
                          <Button danger icon={<DeleteOutlined />}>Xóa (Mock)</Button>
                        </Space>
                      </Card>
                    ) : (
                      <Empty description="Hãy chọn một đạo cụ từ thanh bên trái" />
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <Card title="Tạo bối cảnh" style={{ flex: 1, minHeight: 0, overflow: 'auto' }} bodyStyle={{ padding: 12 }}>
            <div className="flex items-center justify-between mb-3">
              <Space>
                <Button type="primary" disabled={selectedSceneIds.length === 0} onClick={() => generateImages('scene')}>
                  Tạo hàng loạt ảnh (Mock)
                </Button>
                <span className="text-xs text-gray-500">Đã chọn {selectedSceneIds.length} mục</span>
              </Space>
              <Space>
                <Button onClick={() => openAddEntity('scene')}>Thêm thủ công</Button>
                <Button onClick={() => openPickFromAssets('scene')}>Thêm từ thư viện tài nguyên</Button>
              </Space>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sceneDrafts.map((s) => (
                <Card
                  key={s.id}
                  size="small"
                  title={
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedSceneIds.includes(s.id)}
                        onChange={(e) =>
                          setSelectedSceneIds((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id),
                          )
                        }
                      />
                      <span className="truncate">{s.name}</span>
                    </div>
                  }
                  extra={
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditEntity('scene', s.id)}>
                      Chỉnh sửa
                    </Button>
                  }
                >
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2">{s.description || 'Chưa có mô tả'}</div>
                  <div className="h-32 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
                    {s.imageUrl ? 'Đã tạo (Mock)' : 'Chưa tạo'}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {activeStep === 2 && (
          <Card title="Tạo đạo cụ" style={{ flex: 1, minHeight: 0, overflow: 'auto' }} bodyStyle={{ padding: 12 }}>
            <div className="flex items-center justify-between mb-3">
              <Space>
                <Button type="primary" disabled={selectedPropIds.length === 0} onClick={() => generateImages('prop')}>
                  Tạo hàng loạt ảnh (Mock)
                </Button>
                <span className="text-xs text-gray-500">Đã chọn {selectedPropIds.length} mục</span>
              </Space>
              <Space>
                <Button onClick={() => openAddEntity('prop')}>Thêm thủ công</Button>
                <Button onClick={() => openPickFromAssets('prop')}>Thêm từ thư viện tài nguyên</Button>
              </Space>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {propDrafts.map((p) => (
                <Card
                  key={p.id}
                  size="small"
                  title={
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedPropIds.includes(p.id)}
                        onChange={(e) =>
                          setSelectedPropIds((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                          )
                        }
                      />
                      <span className="truncate">{p.name}</span>
                    </div>
                  }
                  extra={
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditEntity('prop', p.id)}>
                      Chỉnh sửa
                    </Button>
                  }
                >
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description || 'Chưa có mô tả'}</div>
                  <div className="h-32 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
                    {p.imageUrl ? 'Đã tạo (Mock)' : 'Chưa tạo'}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {activeStep === 3 && (
          <Card title="Tạo nhân vật" style={{ flex: 1, minHeight: 0, overflow: 'auto' }} bodyStyle={{ padding: 12 }}>
            <div className="flex items-center justify-between mb-3">
              <Space>
                <Button type="primary" disabled={selectedRoleIds.length === 0} onClick={() => generateImages('role')}>
                  Tạo hàng loạt ảnh (Mock)
                </Button>
                <span className="text-xs text-gray-500">Đã chọn {selectedRoleIds.length} mục</span>
              </Space>
              <Space>
                <Button onClick={() => openAddEntity('role')}>Thêm thủ công</Button>
                <Button onClick={() => openPickFromAssets('role')}>Thêm từ thư viện tài nguyên</Button>
              </Space>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roleDrafts.map((r) => (
                <Card
                  key={r.id}
                  size="small"
                  title={
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRoleIds.includes(r.id)}
                        onChange={(e) =>
                          setSelectedRoleIds((prev) =>
                            e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                          )
                        }
                      />
                      <span className="truncate">{r.name}</span>
                    </div>
                  }
                  extra={
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditEntity('role', r.id)}>
                      Chỉnh sửa
                    </Button>
                  }
                >
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2">{r.description || 'Chưa có mô tả'}</div>
                  <div className="h-32 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
                    {r.imageUrl ? 'Đã tạo (Mock)' : 'Chưa tạo'}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {activeStep === 4 && (
          <Card title="Xem trước phân cảnh" style={{ flex: 1, minHeight: 0, overflow: 'auto' }} bodyStyle={{ padding: 12 }}>
            <Table<StoryboardDraft>
              rowKey="id"
              dataSource={storyboardDrafts}
              pagination={{ pageSize: 10 }}
              size="small"
              columns={[
                { title: 'Số thứ tự', dataIndex: 'index', key: 'index', width: 80 },
                { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
                { title: 'Xem trước', dataIndex: 'preview', key: 'preview', ellipsis: true },
                { title: 'Đoạn', dataIndex: 'paragraphRange', key: 'paragraphRange', width: 120 },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 90,
                  render: (_, record) => (
                    <Button type="link" size="small" onClick={() => openEditStoryboard(record)}>
                      Chỉnh sửa
                    </Button>
                  ),
                },
              ] as TableColumnsType<StoryboardDraft>}
            />
          </Card>
        )}
      </Content>

      <Modal
        title="Chỉnh sửa thông tin"
        open={editEntityOpen}
        onCancel={() => {
          setEditEntityOpen(false)
          setEditEntityId(null)
        }}
        onOk={saveEditEntity}
        okText="Lưu"
        width={560}
      >
        <div className="space-y-3">
          <div>
            <span className="text-gray-600 text-sm">Tên</span>
            <Input value={editEntityName} onChange={(e) => setEditEntityName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <span className="text-gray-600 text-sm">Mô tả</span>
            <Input.TextArea
              value={editEntityDesc}
              onChange={(e) => setEditEntityDesc(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Thêm thủ công"
        open={addEntityOpen}
        onCancel={() => setAddEntityOpen(false)}
        onOk={addEntity}
        okText="Thêm"
        width={560}
      >
        <div className="space-y-3">
          <div>
            <span className="text-gray-600 text-sm">Tên</span>
            <Input value={addEntityName} onChange={(e) => setAddEntityName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <span className="text-gray-600 text-sm">Mô tả</span>
            <Input.TextArea
              value={addEntityDesc}
              onChange={(e) => setAddEntityDesc(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Thêm từ thư viện tài nguyên (Mock)"
        open={pickFromAssetsOpen}
        onCancel={() => setPickFromAssetsOpen(false)}
        onOk={confirmPickFromAssets}
        okText="Thêm mục đã chọn"
        width={560}
      >
        <div className="text-xs text-gray-500 mb-2">Dữ liệu hiện tại đến từ Mock "bộ đã tồn tại" cục bộ.</div>
        <Checkbox.Group
          value={pickFromAssetsSelected}
          onChange={(vals) => setPickFromAssetsSelected(vals as string[])}
          className="w-full"
        >
          <div className="space-y-2">
            {(pickFromAssetsKind === 'scene'
              ? existingEntities.scenes
              : pickFromAssetsKind === 'prop'
                ? existingEntities.props
                : existingEntities.roles
            ).map((name) => (
              <div key={name} className="flex items-center justify-between">
                <Checkbox value={name}>{name}</Checkbox>
              </div>
            ))}
          </div>
        </Checkbox.Group>
        {((pickFromAssetsKind === 'scene'
          ? existingEntities.scenes
          : pickFromAssetsKind === 'prop'
            ? existingEntities.props
            : existingEntities.roles
        ).length === 0) && <Empty description="Thư viện tài nguyên trống (Mock)" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Modal>

      <Modal
        title={editingStoryboard ? `Chỉnh sửa phân cảnh: ${editingStoryboard.title}` : 'Chỉnh sửa phân cảnh'}
        open={editStoryboardOpen}
        onCancel={() => {
          setEditStoryboardOpen(false)
          setEditingStoryboard(null)
        }}
        onOk={saveStoryboard}
        okText="Lưu"
        width={640}
      >
        <div className="space-y-3">
          <div>
            <span className="text-gray-600 text-sm">tiêu đề</span>
            <Input
              value={editingStoryboard?.title ?? ''}
              onChange={(e) =>
                setEditingStoryboard((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
              className="mt-1"
            />
          </div>
          <div>
            <span className="text-gray-600 text-sm">xem trước</span>
            <Input.TextArea
              value={editingStoryboard?.preview ?? ''}
              onChange={(e) =>
                setEditingStoryboard((prev) => (prev ? { ...prev, preview: e.target.value } : prev))
              }
              rows={5}
              className="mt-1"
            />
          </div>
          <div>
            <span className="text-gray-600 text-sm">Phạm vi đoạn</span>
            <Input
              value={editingStoryboard?.paragraphRange ?? ''}
              onChange={(e) =>
                setEditingStoryboard((prev) => (prev ? { ...prev, paragraphRange: e.target.value } : prev))
              }
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      <ChapterRawTextEditorModal
        open={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        chapterId={chapterId}
        onSaved={(next) => {
          if (typeof next.rawText === 'string') setRawText(next.rawText)
          if (typeof next.condensedText === 'string') setCondensedText(next.condensedText)
        }}
      />

      {/* Cửa sổ nổi hồi diễn kết quả trích xuất */}
      <Modal
        title="Kết quả trích xuất"
        open={extractReviewOpen}
        onCancel={() => setExtractReviewOpen(false)}
        width={860}
        footer={
          <Space>
            <Button onClick={() => setExtractReviewOpen(false)}>Đóng</Button>
          </Space>
        }
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        <Tabs
          activeKey={extractReviewTab}
          onChange={(k) => setExtractReviewTab(k as EntityKind)}
          items={[
            {
              key: 'roles',
              label: `Nhân vật (${results.roles.length})`,
              children: (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Sau khi tích chọn có thể thêm vào nhóm “Đã tồn tại” (Mock cục bộ).</div>
                    <Space size="small">
                      <Button size="small" onClick={() => toggleSelectAllNew('roles')}>
                        Chọn hết mục mới
                      </Button>
                      <Button size="small" type="primary" onClick={() => addSelectedEntities('roles')}>
                        Thêm mục đã chọn
                      </Button>
                    </Space>
                  </div>
                  <Checkbox.Group
                    value={selectedEntityKeys.roles}
                    onChange={(vals) => setSelectedEntityKeys((prev) => ({ ...prev, roles: vals as string[] }))}
                    className="w-full"
                  >
                    <List
                      dataSource={results.roles}
                      locale={{ emptyText: <Empty description="Chưa có nhân vật" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      renderItem={(it) => {
                        const existed = existingSet.roles.has(it.name)
                        return (
                          <List.Item>
                            <div className="flex items-center justify-between w-full">
                              <Checkbox value={it.name}>
                                <span className="font-medium">{it.name}</span>
                                {it.aliases?.length ? (
                                  <span className="text-xs text-gray-500 ml-2">Tên khác: {it.aliases.join('、')}</span>
                                ) : null}
                              </Checkbox>
                              {existed ? <Tag color="default">Đã tồn tại</Tag> : <Tag color="green">Mới</Tag>}
                            </div>
                          </List.Item>
                        )
                      }}
                    />
                  </Checkbox.Group>
                </div>
              ),
            },
            {
              key: 'scenes',
              label: `Bối cảnh (${results.scenes.length})`,
              children: (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Sau khi tích chọn có thể thêm vào nhóm “Đã tồn tại” (Mock cục bộ).</div>
                    <Space size="small">
                      <Button size="small" onClick={() => toggleSelectAllNew('scenes')}>
                        Chọn hết mục mới
                      </Button>
                      <Button size="small" type="primary" onClick={() => addSelectedEntities('scenes')}>
                        Thêm mục đã chọn
                      </Button>
                    </Space>
                  </div>
                  <Checkbox.Group
                    value={selectedEntityKeys.scenes}
                    onChange={(vals) => setSelectedEntityKeys((prev) => ({ ...prev, scenes: vals as string[] }))}
                    className="w-full"
                  >
                    <List
                      dataSource={results.scenes}
                      locale={{ emptyText: <Empty description="Chưa có bối cảnh" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      renderItem={(it) => {
                        const existed = existingSet.scenes.has(it.name)
                        return (
                          <List.Item>
                            <div className="flex items-center justify-between w-full">
                              <Checkbox value={it.name}>
                                <span className="font-medium">{it.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {it.indoorOutdoor} · {it.time}
                                </span>
                              </Checkbox>
                              {existed ? <Tag color="default">Đã tồn tại</Tag> : <Tag color="green">Mới</Tag>}
                            </div>
                          </List.Item>
                        )
                      }}
                    />
                  </Checkbox.Group>
                </div>
              ),
            },
            {
              key: 'props',
              label: `Đạo cụ (${results.props.length})`,
              children: (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Sau khi tích chọn có thể thêm vào nhóm “Đã tồn tại” (Mock cục bộ).</div>
                    <Space size="small">
                      <Button size="small" onClick={() => toggleSelectAllNew('props')}>
                        Chọn hết mục mới
                      </Button>
                      <Button size="small" type="primary" onClick={() => addSelectedEntities('props')}>
                        Thêm mục đã chọn
                      </Button>
                    </Space>
                  </div>
                  <Checkbox.Group
                    value={selectedEntityKeys.props}
                    onChange={(vals) => setSelectedEntityKeys((prev) => ({ ...prev, props: vals as string[] }))}
                    className="w-full"
                  >
                    <List
                      dataSource={results.props}
                      locale={{ emptyText: <Empty description="Chưa có đạo cụ" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      renderItem={(it) => {
                        const existed = existingSet.props.has(it.name)
                        return (
                          <List.Item>
                            <div className="flex items-center justify-between w-full">
                              <Checkbox value={it.name}>
                                <span className="font-medium">{it.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  Xuất hiện {it.count} lần{it.key ? ' · Đạo cụ chính' : ''}
                                </span>
                              </Checkbox>
                              {existed ? <Tag color="default">Đã tồn tại</Tag> : <Tag color="green">Mới</Tag>}
                            </div>
                          </List.Item>
                        )
                      }}
                    />
                  </Checkbox.Group>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </Layout>
  )
}

export default ChapterPrep

