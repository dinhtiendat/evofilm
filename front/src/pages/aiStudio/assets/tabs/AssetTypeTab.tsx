import { useEffect, useMemo, useState } from 'react'
import { Card, Input, Row, Col, Tag, Button, message, Modal, Space, Pagination } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { resolveAssetUrl } from '../utils'
import { DisplayImageCard } from '../components/DisplayImageCard'
import {
  StudioAssetTypeFormModal,
  normalizeStudioAsset,
  type StudioAssetLike,
} from '../components/StudioAssetTypeFormModal'

export type { StudioAssetLike }

function normalizeAsset(asset: StudioAssetLike): StudioAssetLike {
  return normalizeStudioAsset(asset)
}

type AssetMutationPayload = Record<string, unknown> & {
  name: string
  description?: string
  tags?: string[]
  view_count?: number | null
  thumbnail?: string
}

type AssetCreatePayload = Record<string, unknown> & {
  name: string
  thumbnail?: string
}

export function AssetTypeTab({
  label,
  tabKey,
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  onEditAsset,
}: {
  label: string
  tabKey: 'scene' | 'prop' | 'costume'
  listAssets: (params: { q?: string; page: number; pageSize: number }) => Promise<{ items: StudioAssetLike[]; total: number }>
  createAsset: (payload: AssetCreatePayload) => Promise<StudioAssetLike>
  updateAsset: (id: string, payload: AssetMutationPayload) => Promise<StudioAssetLike>
  deleteAsset: (id: string) => Promise<void>
  onEditAsset?: (asset: StudioAssetLike) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [assets, setAssets] = useState<StudioAssetLike[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [total, setTotal] = useState(0)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<StudioAssetLike | null>(null)
  const [createSeed, setCreateSeed] = useState<{
    name: string
    desc: string
    visualStyle?: 'live_action' | 'anime'
    style?: string
  } | null>(null)
  const [fromShotCreateContext, setFromShotCreateContext] = useState<{
    projectId: string
    chapterId: string
    shotId: string
  } | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  const load = async (opts?: { page?: number; pageSize?: number; q?: string }) => {
    setLoading(true)
    try {
      const nextPage = opts?.page ?? page
      const nextPageSize = opts?.pageSize ?? pageSize
      const nextQ = typeof opts?.q === 'string' ? opts.q : search.trim() || undefined
      const res = await listAssets({ q: nextQ, page: nextPage, pageSize: nextPageSize })
      const items = Array.isArray(res.items) ? res.items.map(normalizeAsset) : []
      setAssets(items)
      setTotal(res.total)
    } catch {
      message.error('Nạp tài nguyên thất bại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const filtered = useMemo(() => {
    return Array.isArray(assets) ? assets : []
  }, [assets])

  const openCreate = () => {
    setEditing(null)
    setCreateSeed(null)
    setFromShotCreateContext(null)
    setEditOpen(true)
  }

  useEffect(() => {
    const create = searchParams.get('create')
    const name = searchParams.get('name') ?? ''
    const desc = searchParams.get('desc') ?? ''
    const tab = searchParams.get('tab')
    const projectId = searchParams.get('projectId')?.trim() ?? ''
    const chapterId = searchParams.get('chapterId')?.trim() ?? ''
    const shotId = searchParams.get('shotId')?.trim() ?? ''
    const visualStyle = (searchParams.get('visualStyle')?.trim() || '') as 'live_action' | 'anime' | ''
    const style = searchParams.get('style')?.trim() ?? ''
    if (create === '1' && tab === tabKey) {
      setEditing(null)
      setCreateSeed({
        name,
        desc,
        visualStyle: visualStyle || undefined,
        style: style || undefined,
      })
      if (projectId && chapterId && shotId) {
        setFromShotCreateContext({ projectId, chapterId, shotId })
      } else {
        setFromShotCreateContext(null)
      }
      setEditOpen(true)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('create')
          next.delete('name')
          next.delete('desc')
          next.delete('projectId')
          next.delete('chapterId')
          next.delete('shotId')
          next.delete('visualStyle')
          next.delete('style')
          return next
        },
        { replace: true },
      )
    }
  }, [searchParams, setSearchParams, tabKey])

  const openEdit = (asset: StudioAssetLike) => {
    setEditing(asset)
    setCreateSeed(null)
    setFromShotCreateContext(null)
    setEditOpen(true)
  }

  const handleEdit = (asset: StudioAssetLike) => {
    if (onEditAsset) {
      onEditAsset(asset)
      return
    }
    openEdit(asset)
  }

  const handleModalCancel = () => {
    setEditOpen(false)
    setEditing(null)
    setCreateSeed(null)
    setFromShotCreateContext(null)
  }

  const handleDelete = (asset: StudioAssetLike) => {
    Modal.confirm({
      title: `Xóa tài nguyên ${label}?`,
      content: `Sẽ xóa "${asset.name}".`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAsset(asset.id)
          message.success('Đã xóa')
          await load()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const openPreview = (asset: StudioAssetLike) => {
    const thumbnailUrl = resolveAssetUrl(asset.thumbnail)
    if (!thumbnailUrl) {
      message.info('Chưa tạo ảnh')
      return
    }
    setPreviewTitle(asset.name)
    setPreviewUrl(thumbnailUrl)
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input.Search
          placeholder={`Tìm kiếm tên, mô tả hoặc nhãn của ${label}`}
          allowClear
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => {
            setPage(1)
            void load()
          }}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo mới {label}
          </Button>
        </Space>
      </div>

      <Card loading={loading}>
        <Row gutter={[16, 16]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <div className="text-center text-gray-500 py-8">{search ? 'Không có tài nguyên khớp' : 'Chưa có tài nguyên loại này'}</div>
            </Col>
          ) : (
            filtered.map((a) => {
              const thumbnailUrl = resolveAssetUrl(a.thumbnail)
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={a.id}>
                  <DisplayImageCard
                    title={<span className="truncate">{a.name}</span>}
                    imageUrl={thumbnailUrl}
                    imageAlt={a.name}
                    placeholder="Chưa tạo"
                    onImageClick={() => openPreview(a)}
                    extra={
                      <Space size="small">
                        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(a)}>
                          Chỉnh sửa
                        </Button>
                      </Space>
                    }
                    actions={[
                      <Button
                        type="text"
                        key="del"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDelete(a)}
                      />,
                    ]}
                    meta={
                      <>
                        <div className="text-xs text-gray-500 mb-2 line-clamp-2">{a.description || 'Chưa có mô tả'}</div>
                        <div className="flex flex-wrap gap-1">
                          {typeof a.view_count === 'number' && <Tag color="blue">Phân cảnh {a.view_count}</Tag>}
                          {(a.tags ?? []).slice(0, 3).map((t) => (
                            <Tag key={t}>{t}</Tag>
                          ))}
                        </div>
                      </>
                    }
                  />
                </Col>
              )
            })
          )}
        </Row>

        <div className="flex justify-end pt-4">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            showTotal={(t) => `Tổng ${t} mục`}
            onChange={(p, ps) => {
              setPage(p)
              setPageSize(ps)
            }}
          />
        </div>
      </Card>

      <StudioAssetTypeFormModal
        open={editOpen}
        label={label}
        entityType={tabKey}
        editing={editing}
        linkProjectId={fromShotCreateContext?.projectId}
        linkChapterId={fromShotCreateContext?.chapterId}
        linkShotId={fromShotCreateContext?.shotId}
        createAsset={createAsset}
        updateAsset={updateAsset}
        onCancel={handleModalCancel}
        seedCreateForm={
          createSeed
            ? {
                name: createSeed.name,
                description: createSeed.desc,
                visual_style: createSeed.visualStyle,
                style: createSeed.style,
              }
            : null
        }
        onSeedConsumed={() => setCreateSeed(null)}
        onSaved={async (ctx) => {
          if (ctx.type === 'update') {
            setAssets((prev) => prev.map((a) => (a.id === ctx.id ? ctx.asset : a)))
            await load()
          } else {
            setPage(1)
            await load({ page: 1 })
          }
        }}
      />

      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={880}
      >
        <div className="w-full flex justify-center bg-gray-50 rounded-md overflow-hidden">
          <img src={previewUrl} alt={previewTitle} className="max-h-[70vh] object-contain" />
        </div>
      </Modal>
    </div>
  )
}
