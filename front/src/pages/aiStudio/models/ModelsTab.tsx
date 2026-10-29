import { useEffect, useState, useMemo } from 'react'
import {
  Alert,
  Layout,
  Input,
  Button,
  Table,
  Tag,
  Space,
  Tree,
  Card,
  Dropdown,
  Drawer,
  Modal,
  Form,
  Select,
  message,
  Tooltip,
  Empty,
  Grid,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MenuOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DownOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { LlmService } from '../../../services/generated/services/LlmService'
import type {
  ModelRead,
  ModelCategoryKey,
  ProviderRead,
  ProviderSupportedRead,
} from '../../../services/generated'
import {
  MODEL_CATEGORIES,
  TABLE_ACTION_BTN_EDIT_CLASS,
  TABLE_ACTION_BTN_MORE_CLASS,
  TABLE_ACTION_BTN_TEST_CLASS,
  categoryLabelMap,
  categoryColorMap,
  SORT_OPTIONS,
} from './constants'

export default function ModelsTab() {
  const [providers, setProviders] = useState<ProviderRead[]>([])
  const [supportedProviders, setSupportedProviders] = useState<ProviderSupportedRead[]>([])
  const [models, setModels] = useState<ModelRead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'category'>('updated')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [selectedModel, setSelectedModel] = useState<ModelRead | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ModelCategoryKey | null>(null)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [modelEditing, setModelEditing] = useState<ModelRead | null>(null)
  const [providerOptionsLoading, setProviderOptionsLoading] = useState(true)
  const [form] = Form.useForm()
  const selectedFormCategory = Form.useWatch<ModelCategoryKey | undefined>('category', form)
  const { lg } = Grid.useBreakpoint()
  const isLargeScreen = lg ?? false

  const load = async () => {
    setLoading(true)
    try {
      const [provRes, modelsRes, supportedRes] = await Promise.all([
        LlmService.listProvidersApiV1LlmProvidersGet({ page: 1, pageSize: 100 }),
        LlmService.listModelsApiV1LlmModelsGet({
          q: search.trim() || undefined,
          order: sortBy === 'name' ? 'name' : sortBy === 'category' ? 'category' : 'updated_at',
          isDesc: true,
          page: 1,
          pageSize: 100,
        }),
        LlmService.listSupportedProvidersApiV1LlmProvidersSupportedGet({}),
      ])
      setProviders(provRes.data?.items ?? [])
      setModels(modelsRes.data?.items ?? [])
      setSupportedProviders(supportedRes.data ?? [])
    } catch {
      message.error('Tải thất bại')
    } finally {
      setLoading(false)
      setProviderOptionsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [search, sortBy])

  const modelList = useMemo(() => {
    let list = models
    if (categoryFilter) list = list.filter((m) => m.category === categoryFilter)
    return list
  }, [models, categoryFilter])

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {}
    MODEL_CATEGORIES.forEach((cat) => {
      c[cat.key] = models.filter((m) => m.category === cat.key).length
    })
    return c
  }, [models])

  const treeData = useMemo(
    () =>
      MODEL_CATEGORIES.map((c) => ({
        key: c.key,
        title: `${c.label} (${categoryCounts[c.key] ?? 0})`,
        isLeaf: true,
      })),
    [categoryCounts]
  )

  const getProviderName = (id: string) => providers.find((p) => p.id === id)?.name ?? id

  const resolveProviderSpec = (providerName: string) =>
    supportedProviders.find(
      (spec) => spec.display_name === providerName || (spec.aliases?.length && spec.aliases.includes(providerName)),
    )

  const filteredProviderOptions = useMemo(() => {
    if (!selectedFormCategory) return providers.map((p) => ({ label: p.name, value: p.id }))
    return providers
      .filter((provider) => {
        const spec = resolveProviderSpec(provider.name)
        return !!spec?.supported_categories?.includes(selectedFormCategory)
      })
      .map((p) => ({ label: p.name, value: p.id }))
  }, [providers, selectedFormCategory, supportedProviders])

  const editingUnsupportedProviderOption = useMemo(() => {
    if (!modelEditing) return null
    const provider = providers.find((p) => p.id === modelEditing.provider_id)
    if (!provider) return null
    const alreadyInOptions = filteredProviderOptions.some((opt) => opt.value === provider.id)
    if (alreadyInOptions) return null
    return {
      label: `${provider.name} (lịch sử/hiện không hỗ trợ hạng mục đã chọn)`,
      value: provider.id,
    }
  }, [filteredProviderOptions, modelEditing, providers])

  const providerSelectOptions = useMemo(
    () =>
      editingUnsupportedProviderOption
        ? [editingUnsupportedProviderOption, ...filteredProviderOptions]
        : filteredProviderOptions,
    [editingUnsupportedProviderOption, filteredProviderOptions],
  )
  const unsupportedProviderWarning = useMemo(() => {
    if (!editingUnsupportedProviderOption || !selectedFormCategory) return null
    const provider = providers.find((p) => p.id === editingUnsupportedProviderOption.value)
    if (!provider) return null
    const categoryLabel = categoryLabelMap[selectedFormCategory]
    return `Mô hình hiện tại liên kết với nhà cung cấp 「${provider.name}」 không hỗ trợ hạng mục 「${categoryLabel}」, đề xuất chuyển sang nhà cung cấp hỗ trợ hạng mục này trước khi lưu.`
  }, [editingUnsupportedProviderOption, providers, selectedFormCategory])

  useEffect(() => {
    if (!selectedFormCategory) return
    const providerId = form.getFieldValue('provider_id') as string | undefined
    if (!providerId) return
    const stillSupported = filteredProviderOptions.some((opt) => opt.value === providerId)
    const keepHistoricalEditingProvider = modelEditing?.provider_id === providerId
    if (!stillSupported && !keepHistoricalEditingProvider) {
      form.setFieldsValue({ provider_id: undefined })
      message.warning('Nhà cung cấp hiện tại không hỗ trợ hạng mục mô hình đã chọn, vui lòng chọn lại')
    }
  }, [filteredProviderOptions, form, modelEditing, selectedFormCategory])

  const handleSaveModel = async () => {
    try {
      const values = await form.validateFields()
      let params: Record<string, unknown> = {}
      try {
        if (values.params && String(values.params).trim())
          params = JSON.parse(String(values.params))
      } catch {
        message.error('Định dạng tham số phải là JSON hợp lệ')
        return
      }
      if (modelEditing) {
        await LlmService.updateModelApiV1LlmModelsModelIdPatch({
          modelId: modelEditing.id,
          requestBody: {
            name: values.name,
            category: values.category,
            provider_id: values.provider_id,
            description: values.description ?? null,
            params,
          },
        })
        message.success('Đã cập nhật mô hình')
      } else {
        if (!values.provider_id) {
          message.warning('Vui lòng thêm nhà cung cấp trước rồi mới thêm mô hình')
          return
        }
        const modelId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `model_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        await LlmService.createModelApiV1LlmModelsPost({
          requestBody: {
            id: modelId,
            name: values.name,
            category: values.category,
            provider_id: values.provider_id,
            description: values.description,
            params,
          },
        })
        message.success('Đã thêm mô hình')
      }
      setModelModalOpen(false)
      setModelEditing(null)
      form.resetFields()
      void load()
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('Lưu thất bại')
    }
  }

  const handleDeleteModel = (m: ModelRead) => {
    Modal.confirm({
      title: 'Xóa mô hình',
      content: `Xác nhận xóa "${m.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        await LlmService.deleteModelApiV1LlmModelsModelIdDelete({ modelId: m.id })
        message.success('Đã xóa')
        if (selectedModel?.id === m.id) setSelectedModel(null)
        void load()
      },
    })
  }

  const openModelModal = (m?: ModelRead) => {
    setModelEditing(m ?? null)
    if (m) {
      form.setFieldsValue({
        name: m.name,
        category: m.category,
        provider_id: m.provider_id,
        description: m.description,
        params: JSON.stringify(m.params ?? {}, null, 2),
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ category: 'text' })
    }
    setModelModalOpen(true)
  }

  /** Mở popup "Thêm mô hình" dựa trên mô hình có sẵn, điền trước trường, tên thêm "-bản sao". */
  const openCopyModelModal = (source: ModelRead) => {
    setModelEditing(null)
    form.resetFields()
    form.setFieldsValue({
      name: `${source.name}-bản sao`,
      category: source.category,
      provider_id: source.provider_id,
      description: source.description ?? '',
      params: JSON.stringify(source.params ?? {}, null, 2),
    })
    setModelModalOpen(true)
  }

  const modelColumns: TableColumnsType<ModelRead> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (n) => <Space>{n}</Space>,
    },
    {
      title: 'Hạng mục',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (c: ModelCategoryKey) => (
        <Tag color={categoryColorMap[c]}>{categoryLabelMap[c]}</Tag>
      ),
    },
    {
      title: 'Liên kết nhà cung cấp',
      dataIndex: 'provider_id',
      key: 'provider_id',
      width: 120,
      render: (id: string) => getProviderName(id),
    },
    {
      title: 'Tham số',
      dataIndex: 'params',
      key: 'params',
      ellipsis: true,
      render: (p: Record<string, unknown>) => (
        <Tooltip title={JSON.stringify(p)}>
          <span>
            {p && Object.keys(p).length ? JSON.stringify(p).slice(0, 30) + '…' : '—'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string) => <Tooltip title={d}>{d || '—'}</Tooltip>,
    },
    {
      title: 'Người tạo',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 100,
      render: (c: string) => c || '—',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 112,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size={4} className="flex-nowrap justify-center">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              className={TABLE_ACTION_BTN_EDIT_CLASS}
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openModelModal(record)
              }}
            />
          </Tooltip>
          <Tooltip title="Tạo thử">
            <Button
              type="text"
              size="small"
              className={TABLE_ACTION_BTN_TEST_CLASS}
              icon={<ThunderboltOutlined />}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy',
                  label: 'Sao chép',
                  icon: <CopyOutlined />,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation()
                    openCopyModelModal(record)
                  },
                },
                {
                  key: 'delete',
                  label: 'Xóa',
                  danger: true,
                  icon: <DeleteOutlined />,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation()
                    handleDeleteModel(record)
                  },
                },
              ],
            }}
            trigger={['click']}
          >
            <Tooltip title="Thêm">
              <Button
                type="text"
                size="small"
                className={TABLE_ACTION_BTN_MORE_CLASS}
                icon={<MenuOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Dropdown>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Tổng cộng {models.length} mô hình</span>
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModelModal()}>
            Thêm mô hình
          </Button>
          <Input
            placeholder="Tìm theo tên/loại"
            allowClear
            className="w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Dropdown
            menu={{
              items: SORT_OPTIONS.map((o) => ({
                key: o.value,
                label: o.label,
                onClick: () => setSortBy(o.value as 'updated' | 'name' | 'category'),
              })),
            }}
          >
            <Button icon={<DownOutlined />}>
              Sắp xếp:{SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
            </Button>
          </Dropdown>
        </Space>
      </div>

      <Layout className="flex-1 min-h-0 flex-row overflow-hidden">
        <div
          className="flex-shrink-0 border-r border-gray-200 bg-white overflow-auto"
          style={{ width: treeCollapsed ? 48 : 200 }}
        >
          {treeCollapsed ? (
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => setTreeCollapsed(false)}
              className="w-full rounded-none"
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">Lọc</span>
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined rotate={180} />}
                  onClick={() => setTreeCollapsed(true)}
                />
              </div>
              <Tree
                selectedKeys={categoryFilter ? [categoryFilter] : []}
                treeData={treeData}
                showLine
                blockNode
                onSelect={([key]) => setCategoryFilter(key ? (key as ModelCategoryKey) : null)}
                className="py-2"
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-auto p-4 bg-gray-50">
          <div className="flex justify-end gap-1 mb-2">
            <Button
              type={viewMode === 'table' ? 'primary' : 'default'}
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode('table')}
            />
            <Button
              type={viewMode === 'card' ? 'primary' : 'default'}
              size="small"
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('card')}
            />
          </div>

          {modelList.length === 0 ? (
            <Card>
              <Empty
                description={
                  models.length === 0 ? 'Chưa có mô hình, vui lòng thêm nhà cung cấp trước rồi thêm mô hình' : 'Không có kết quả khớp'
                }
              >
                {providers.length > 0 && models.length === 0 && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openModelModal()}>
                    Thêm mô hình đầu tiên
                  </Button>
                )}
              </Empty>
            </Card>
          ) : viewMode === 'table' ? (
            <Card>
              <Table<ModelRead>
                rowKey="id"
                loading={loading}
                columns={modelColumns}
                dataSource={modelList}
                scroll={{ x: 1024 }}
                pagination={{ pageSize: 20 }}
                onRow={(record) => ({
                  onClick: () => {
                    setSelectedModel(record)
                    setDetailPanelOpen(true)
                  },
                  style: { cursor: 'pointer' },
                })}
                size="small"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modelList.map((m) => (
                <Card
                  key={m.id}
                  hoverable
                  className="cursor-pointer"
                  style={{ minHeight: 220 }}
                  onClick={() => {
                    setSelectedModel(m)
                    setDetailPanelOpen(true)
                  }}
                  actions={[
                    <Button
                      key="edit"
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openModelModal(m)
                      }}
                    >
                      Chỉnh sửa
                    </Button>,
                    <Button key="test" type="text" size="small" icon={<ThunderboltOutlined />}>
                      Tạo thử nghiệm
                    </Button>,
                    <Dropdown
                      key="more"
                      menu={{
                        items: [
                          {
                            key: 'copy',
                            label: 'Sao chép',
                            icon: <CopyOutlined />,
                            onClick: ({ domEvent }) => {
                              domEvent.stopPropagation()
                              openCopyModelModal(m)
                            },
                          },
                          {
                            key: 'delete',
                            label: 'Xóa',
                            danger: true,
                            icon: <DeleteOutlined />,
                            onClick: ({ domEvent }) => {
                              domEvent.stopPropagation()
                              handleDeleteModel(m)
                            },
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <Button type="text" size="small" onClick={(e) => e.stopPropagation()}>
                        Thêm
                      </Button>
                    </Dropdown>,
                  ]}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Tag color={categoryColorMap[m.category]}>{categoryLabelMap[m.category]}</Tag>
                  </div>
                  <div className="font-medium mb-1">{m.name}</div>
                  <div className="text-gray-500 text-sm mb-1">
                    Nhà cung cấp: {getProviderName(m.provider_id)}
                  </div>
                  <div className="text-gray-500 text-sm line-clamp-2 mb-2">{m.description || '—'}</div>
                  {m.created_by && (
                    <span className="text-xs text-gray-400">Người tạo: {m.created_by}</span>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedModel && isLargeScreen && (
          <div
            className="flex-shrink-0 overflow-auto border-l border-gray-200 bg-white"
            style={{ width: '36%', minWidth: 320 }}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium">Chi tiết</span>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setDetailPanelOpen(false)
                  setSelectedModel(null)
                }}
              >
                Thu gọn
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Tên</div>
                <div className="font-medium">{selectedModel.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Danh mục</div>
                <Tag color={categoryColorMap[selectedModel.category]}>
                  {categoryLabelMap[selectedModel.category]}
                </Tag>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Nhà cung cấp liên kết</div>
                <div>{getProviderName(selectedModel.provider_id)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Mô tả</div>
                <div className="text-gray-700 text-sm">{selectedModel.description || '—'}</div>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => openModelModal(selectedModel)}
                >
                  Chỉnh sửa
                </Button>
                <Button icon={<ThunderboltOutlined />}>Kiểm tra nhanh</Button>
              </Space>
            </div>
          </div>
        )}

        {selectedModel && !isLargeScreen && (
          <Drawer
            title="Chi tiết"
            placement="right"
            open={detailPanelOpen}
            onClose={() => setDetailPanelOpen(false)}
            width="min(100%, 400px)"
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Tên</div>
                <div className="font-medium">{selectedModel.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Danh mục</div>
                <Tag color={categoryColorMap[selectedModel.category]}>
                  {categoryLabelMap[selectedModel.category]}
                </Tag>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => openModelModal(selectedModel)}
                >
                  Chỉnh sửa
                </Button>
                <Button icon={<ThunderboltOutlined />}>Kiểm tra nhanh</Button>
              </Space>
            </div>
          </Drawer>
        )}
      </Layout>

      <Modal
        title={modelEditing ? 'Chỉnh sửa mô hình' : 'Thêm mô hình'}
        open={modelModalOpen}
        onCancel={() => {
          setModelModalOpen(false)
          setModelEditing(null)
          form.resetFields()
        }}
        onOk={() => void handleSaveModel()}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="pt-2">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]} >
            <Input placeholder="Ví dụ: GPT-4" />
          </Form.Item>
          <Form.Item name="category" label="Hạng mục" rules={[{ required: true }]}>
            <Select options={MODEL_CATEGORIES.map((c) => ({ label: c.label, value: c.key }))} />
          </Form.Item>
          <Form.Item
            name="provider_id"
            label="Nhà cung cấp liên kết"
            rules={[{ required: true, message: 'vui lòng chọn nhà cung cấp' }]}
          >
            <Select
              loading={providerOptionsLoading}
              placeholder={
                selectedFormCategory
                  ? `Chọn nhà cung cấp hỗ trợ ${categoryLabelMap[selectedFormCategory]}`
                  : 'Chọn nhà cung cấp (vui lòng thêm nhà cung cấp trước)'
              }
              options={providerSelectOptions}
              notFoundContent={
                providerOptionsLoading
                  ? 'Đang tải…'
                  : selectedFormCategory
                    ? 'Chưa có nhà cung cấp hỗ trợ hạng mục này'
                    : 'Chưa có nhà cung cấp'
              }
            />
          </Form.Item>
          {unsupportedProviderWarning && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              message={unsupportedProviderWarning}
            />
          )}
          <Form.Item name="params" label="tham số(JSON)">
            <Input.TextArea rows={3} placeholder='{"max_tokens": 4096, "temperature": 0.7}' />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
