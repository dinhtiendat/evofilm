import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Button, Empty, Modal, Input, message, Space, Select, Pagination } from 'antd'
import { EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  StudioProjectsService,
  StudioShotLinksService,
} from '../../../../../services/generated'
import type { ProjectActorLinkRead, ProjectCostumeLinkRead } from '../../../../../services/generated'
import { useProjectCharacters, newId } from '../hooks/useProjectData'
import { resolveAssetUrl } from '../../../assets/utils'
import { DisplayImageCard } from '../../../assets/components/DisplayImageCard'
import { StudioEntitiesApi } from '../../../../../services/studioEntities'
import {
  ProjectVisualStyleAndStyleFields,
  type ProjectVisualStyleChoice,
} from '../../../project/ProjectVisualStyleAndStyleFields'
import { useProjectStyleOptions } from '../../../project/useProjectStyleOptions'

type ActorLike = {
  id: string
  name: string
  description?: string | null
  thumbnail?: string
}

type CostumeLike = {
  id: string
  name: string
  description?: string | null
  thumbnail?: string
}

function notifyShotAssetCreatedAndLinked(payload: {
  projectId?: string
  chapterId?: string | null
  shotId?: string | null
  assetId?: string
  assetName: string
}) {
  if (!payload.projectId || !payload.chapterId || !payload.shotId) return
  try {
    window.opener?.postMessage(
      {
        type: 'studio-shot-asset-created-and-linked',
        projectId: payload.projectId,
        chapterId: payload.chapterId,
        shotId: payload.shotId,
        assetId: payload.assetId ?? null,
        assetName: payload.assetName,
      },
      window.location.origin,
    )
  } catch {
    // Thông báo liên cửa sổ thất bại không chặn việc tạo nhân vật thành công.
  }
}

export function RolesTab() {
  const { options: projectStyleOptions, defaultVisualStyle, getDefaultStyle } = useProjectStyleOptions()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { characters, loading, refresh } = useProjectCharacters(projectId)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pendingShotLinkShotId, setPendingShotLinkShotId] = useState<string | null>(null)
  const [pendingShotLinkChapterId, setPendingShotLinkChapterId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formActorId, setFormActorId] = useState<string | undefined>(undefined)
  const [formCostumeId, setFormCostumeId] = useState<string | undefined>(undefined)

  const [projectActorLinks, setProjectActorLinks] = useState<ProjectActorLinkRead[]>([])
  const [projectCostumeLinks, setProjectCostumeLinks] = useState<ProjectCostumeLinkRead[]>([])
  const [actorsById, setActorsById] = useState<Record<string, ActorLike>>({})
  const [costumesById, setCostumesById] = useState<Record<string, CostumeLike>>({})
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [projectVisualStyle, setProjectVisualStyle] = useState<ProjectVisualStyleChoice>(defaultVisualStyle as ProjectVisualStyleChoice)
  const [projectStyle, setProjectStyle] = useState<string>(getDefaultStyle(defaultVisualStyle))
  const [formVisualStyle, setFormVisualStyle] = useState<ProjectVisualStyleChoice>(defaultVisualStyle as ProjectVisualStyleChoice)
  const [formStyle, setFormStyle] = useState<string>(getDefaultStyle(defaultVisualStyle))

  useEffect(() => {
    const create = searchParams.get('create')
    const name = searchParams.get('name') ?? ''
    const desc = searchParams.get('desc') ?? ''
    const tab = searchParams.get('tab')
    const visualStyle = (searchParams.get('visualStyle')?.trim() || '') as ProjectVisualStyleChoice | ''
    const style = searchParams.get('style')?.trim() ?? ''
    if (create === '1' && tab === 'roles') {
      setFormName(name)
      setFormDesc(desc)
      setFormActorId(undefined)
      setFormCostumeId(undefined)
      const nextVisual = visualStyle || projectVisualStyle
      setFormVisualStyle(nextVisual)
      setFormStyle(style || projectStyle || getDefaultStyle(nextVisual))
      const shotIdFromUrl = searchParams.get('shotId')?.trim() ?? ''
      const chapterIdFromUrl = searchParams.get('chapterId')?.trim() ?? ''
      setPendingShotLinkShotId(shotIdFromUrl || null)
      setPendingShotLinkChapterId(chapterIdFromUrl || null)
      setCreateOpen(true)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('create')
          next.delete('name')
          next.delete('desc')
          next.delete('chapterId')
          next.delete('shotId')
          next.delete('visualStyle')
          next.delete('style')
          return next
        },
        { replace: true },
      )
    }
  }, [getDefaultStyle, projectStyle, projectVisualStyle, searchParams, setSearchParams])

  const openNormalRoleCreate = useCallback(() => {
    setPendingShotLinkShotId(null)
    setPendingShotLinkChapterId(null)
    setFormName('')
    setFormDesc('')
    setFormActorId(undefined)
    setFormCostumeId(undefined)
    setFormVisualStyle(projectVisualStyle)
    setFormStyle(projectStyle)
    setCreateOpen(true)
  }, [projectStyle, projectVisualStyle])

  const loadProjectLinks = async () => {
    if (!projectId) return
    setLoadingLinks(true)
    try {
      const [actorRes, costumeRes] = await Promise.all([
        StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
          entityType: 'actor',
          projectId,
          chapterId: null,
          shotId: null,
          assetId: null,
          order: null,
          isDesc: false,
          page: 1,
          pageSize: 100,
        }),
        StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
          entityType: 'costume',
          projectId,
          chapterId: null,
          shotId: null,
          assetId: null,
          order: null,
          isDesc: false,
          page: 1,
          pageSize: 100,
        }),
      ])
      const actorLinks = (actorRes.data?.items ?? []) as ProjectActorLinkRead[]
      const costumeLinks = (costumeRes.data?.items ?? []) as ProjectCostumeLinkRead[]
      setProjectActorLinks(actorLinks)
      setProjectCostumeLinks(costumeLinks)

      const actorIds = Array.from(new Set(actorLinks.map((l) => l.actor_id)))
      const costumeIds = Array.from(new Set(costumeLinks.map((l) => l.costume_id)))

      const [actors, costumes] = await Promise.all([
        Promise.all(
          actorIds.map((id) =>
            StudioEntitiesApi.get('actor', id)
              .then((r) => (r.data ?? null) as ActorLike | null)
              .catch(() => null),
          ),
        ),
        Promise.all(
          costumeIds.map((id) =>
            StudioEntitiesApi.get('costume', id)
              .then((r) => (r.data ?? null) as CostumeLike | null)
              .catch(() => null),
          ),
        ),
      ])

      const nextActors: Record<string, ActorLike> = {}
      actors.filter(Boolean).forEach((a) => {
        nextActors[(a as ActorLike).id] = a as ActorLike
      })
      const nextCostumes: Record<string, CostumeLike> = {}
      costumes.filter(Boolean).forEach((c) => {
        nextCostumes[(c as CostumeLike).id] = c as CostumeLike
      })
      setActorsById(nextActors)
      setCostumesById(nextCostumes)
    } catch {
      message.error('Tải diễn viên/trang phục liên kết với dự án thất bại')
      setProjectActorLinks([])
      setProjectCostumeLinks([])
      setActorsById({})
      setCostumesById({})
    } finally {
      setLoadingLinks(false)
    }
  }

  useEffect(() => {
    void loadProjectLinks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    void (async () => {
      try {
        const res = await StudioProjectsService.getProjectApiV1StudioProjectsProjectIdGet({ projectId })
        const nextVisual = (res.data?.visual_style as ProjectVisualStyleChoice | undefined) ?? (defaultVisualStyle as ProjectVisualStyleChoice)
        const nextStyle = (res.data?.style as string | undefined) ?? getDefaultStyle(nextVisual)
        setProjectVisualStyle(nextVisual)
        setProjectStyle(nextStyle)
      } catch {
        // ignore: fallback to default
      }
    })()
  }, [defaultVisualStyle, getDefaultStyle, projectId])

  const handleCreateRole = async () => {
    if (!projectId) return
    const name = formName.trim()
    if (!name) {
      message.warning('Vui lòng nhập tên nhân vật')
      return
    }
    if (!formActorId) {
      message.warning('Vui lòng chọn diễn viên liên kết')
      return
    }
    setCreating(true)
    try {
      const createRes = await StudioEntitiesApi.create('character', {
        id: newId('char'),
        project_id: projectId,
        chapter_id: pendingShotLinkChapterId,
        shot_id: pendingShotLinkShotId,
        name,
        description: formDesc.trim() || undefined,
        visual_style: formVisualStyle || 'Hiện thực',
        style: formStyle,
        actor_id: formActorId,
        costume_id: formCostumeId ?? null,
      })
      const charId = (createRes.data as { id?: string } | undefined)?.id
      if (charId && pendingShotLinkShotId) {
        notifyShotAssetCreatedAndLinked({
          projectId,
          chapterId: pendingShotLinkChapterId,
          shotId: pendingShotLinkShotId,
          assetId: charId,
          assetName: name,
        })
      }
      message.success('Tạo nhân vật thành công')
      setCreateOpen(false)
      setFormName('')
      setFormDesc('')
      setFormActorId(undefined)
      setFormCostumeId(undefined)
      setFormVisualStyle(projectVisualStyle)
      setFormStyle(projectStyle)
      setPendingShotLinkShotId(null)
      setPendingShotLinkChapterId(null)
      await refresh()
    } catch {
      message.error('Tạo thất bại')
      setPendingShotLinkShotId(null)
      setPendingShotLinkChapterId(null)
    } finally {
      setCreating(false)
    }
  }

  const roleCards = useMemo(() => {
    return characters.map((c) => {
      const actor = actorsById[c.actor_id]
      const costume = c.costume_id ? costumesById[c.costume_id] : undefined
      return { c, actor, costume }
    })
  }, [actorsById, characters, costumesById])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const pagedRoleCards = useMemo(() => {
    const start = (page - 1) * pageSize
    return roleCards.slice(start, start + pageSize)
  }, [page, pageSize, roleCards])

  useEffect(() => {
    setPage(1)
  }, [roleCards.length])

  const actorOptions = useMemo(() => {
    return projectActorLinks.map((l) => {
      const a = actorsById[l.actor_id]
      const url = resolveAssetUrl(a?.thumbnail)
      return {
        value: l.actor_id,
        searchLabel: a?.name ?? l.actor_id,
        label: (
          <div className="flex items-center gap-2 min-w-0">
            {url ? (
              <img src={url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                <UserOutlined />
              </div>
            )}
            <div className="min-w-0 truncate">{a?.name ?? l.actor_id}</div>
          </div>
        ),
      }
    })
  }, [actorsById, projectActorLinks])

  const costumeOptions = useMemo(() => {
    return projectCostumeLinks.map((l) => {
      const c = costumesById[l.costume_id]
      return { value: l.costume_id, label: c?.name ?? l.costume_id, searchLabel: c?.name ?? l.costume_id }
    })
  }, [costumesById, projectCostumeLinks])

  if (!projectId) {
    return null
  }

  return (
    <div className="h-full overflow-auto">
      <Card
        title="Nhân vật dự án"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNormalRoleCreate}>
              Tạo mới nhân vật
            </Button>
          </Space>
        }
      >
        {characters.length === 0 && !loading ? (
          <Empty
            description="Chưa có nhân vật trong dự án"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={openNormalRoleCreate}>
                Tạo mới nhân vật
              </Button>
            </Space>
          </Empty>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pagedRoleCards.map(({ c, actor, costume }) => (
              <DisplayImageCard
                key={c.id}
                title={<div className="truncate">{c.name}</div>}
                imageUrl={resolveAssetUrl(c.thumbnail)}
                imageAlt={c.name}
                enablePreview
                extra={
                  <Space size="small">
                    <Button
                      type="default"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        if (!projectId) return
                        navigate(`/projects/${projectId}/roles/${c.id}/edit`)
                      }}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: `Xóa nhân vật "${c.name}"?`,
                          okText: 'Xóa',
                          cancelText: 'Hủy',
                          okButtonProps: { danger: true },
                          onOk: async () => {
                            try {
                              await StudioEntitiesApi.remove('character', c.id)
                              message.success('Đã xóa')
                              await refresh()
                            } catch {
                              message.error('Xóa thất bại')
                            }
                          },
                        })
                      }}
                    >
                      Xóa
                    </Button>
                  </Space>
                }
                meta={
                  <div className="space-y-1">
                    {c.description ? <div className="text-xs text-gray-600 line-clamp-2">{c.description}</div> : null}
                    <div className="text-xs text-gray-500 truncate">
                      Điễn viên: {actor?.name ?? c.actor_id}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      trang phục:{costume?.name ?? (c.costume_id ?? '—')}
                    </div>
                  </div>
                }
              />
            ))}
            </div>
            <div className="flex justify-end">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={roleCards.length}
                showSizeChanger={false}
                showTotal={(t) => `Tổng ${t} mục`}
                onChange={(p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                }}
              />
            </div>
          </div>
        )}
      </Card>

      <Modal
        title="Tạo nhân vật mới"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          setPendingShotLinkShotId(null)
        }}
        onOk={handleCreateRole}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={creating}
        width={560}
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600 mb-1">Tên nhân vật</div>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ví dụ: Tiểu Vũ" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Mô tả (tùy chọn)</div>
            <Input.TextArea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </div>
          <div>
            <ProjectVisualStyleAndStyleFields
              visual_style={formVisualStyle}
              style={formStyle}
              options={projectStyleOptions}
              onChange={(next) => {
                setFormVisualStyle(next.visual_style)
                setFormStyle(next.style)
              }}
            />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Diễn viên liên kết (bắt buộc)</div>
            <Select
              className="w-full"
              placeholder="Chọn diễn viên đã liên kết trong dự án hiện tại"
              loading={loadingLinks}
              value={formActorId}
              onChange={(v) => setFormActorId(v)}
              options={actorOptions}
              showSearch
              optionFilterProp="searchLabel"
              filterOption={(input, option) => String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Trang phục liên kết (tùy chọn)</div>
            <Select
              className="w-full"
              allowClear
              placeholder="Chọn trang phục đã liên kết trong dự án hiện tại"
              loading={loadingLinks}
              value={formCostumeId}
              onChange={(v) => setFormCostumeId(v)}
              options={costumeOptions}
              showSearch
              optionFilterProp="searchLabel"
              filterOption={(input, option) => String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
