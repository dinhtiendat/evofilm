import React, { useEffect, useState } from 'react'
import {
  Layout,
  Button,
  Input,
  Select,
  Space,
  Tabs,
  InputNumber,
  Slider,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/aiStudioApi'
import type { Agent, AgentTypeKey } from '../../../mocks/data'

const AGENT_TYPES: { value: AgentTypeKey; label: string }[] = [
  { value: 'plot', label: 'Trích xuất cốt truyện' },
  { value: 'character', label: 'Trích xuất nhân vật' },
  { value: 'scene', label: 'Trích xuất bối cảnh' },
  { value: 'prop', label: 'Trích xuất đạo cụ' },
  { value: 'other', label: 'Loại khác' },
]

export default function AgentEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<AgentTypeKey>('plot')
  const [editDesc, setEditDesc] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [testLogs, setTestLogs] = useState<string[]>([])
  const [testPanelCollapsed, setTestPanelCollapsed] = useState(false)
  const [promptDraft, setPromptDraft] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const [testTab, setTestTab] = useState<'output' | 'history'>('output')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const a = await api.agents.get(id)
      setAgent(a)
      setEditName(a.name)
      setEditType(a.type)
      setEditDesc(a.description)
      setPromptDraft('từ kịch bản dưới đây, trích xuất cốt truyện chính, xuất JSON có cấu trúc.')
    } catch {
      message.error('Tải Agent thất bại')
      navigate('/agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await api.agents.update(id, {
        name: editName.trim(),
        type: editType,
        description: editDesc.trim(),
      })
      message.success('Lưu thành công')
      setAgent((prev) => (prev ? { ...prev, name: editName, type: editType, description: editDesc } : null))
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleRunTest = async () => {
    setTesting(true)
    setTestLogs([])
    setTestOutput('')
    try {
      setTestLogs((l) => [...l, '[INFO] Bắt đầu thực thi...', '[INFO] Gọi node LLM...'])
      await new Promise((r) => setTimeout(r, 1200))
      setTestLogs((l) => [...l, '[OK] Trích xuất hoàn tất'])
      setTestOutput(
        JSON.stringify(
          {
            plot_points: ['Mở đầu: cãi nhau trong phòng trọ', 'Phát triển: mất CMND', 'Cao trào: tìm kiếm trong đêm mưa'],
            summary: 'Tóm tắt cốt truyện chính trích từ kịch bản.'
          },
          null,
          2
        )
      )
    } catch {
      setTestLogs((l) => [...l, '[ERROR] thực thi thất bại'])
      message.error('Chạy thử thất bại')
    } finally {
      setTesting(false)
    }
  }

  // Nút giữ chỗ quy trình đơn giản (có thể thay bằng React Flow sau)
  const workflowNodes = [
    { id: 'start', label: 'bắt đầu', type: 'start' },
    { id: 'llm1', label: 'LLM trích xuất', type: 'llm' },
    { id: 'end', label: 'Kết thúc', type: 'end' },
  ]

  if (loading || !agent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {loading ? 'Đang nạp...' : null}
      </div>
    )
  }

  return (
    <Layout className="h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Thanh công cụ trên */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')}>
          Quay lại danh sách
        </Button>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="font-medium w-48"
          placeholder="Tên Agent"
        />
        <Select
          value={editType}
          onChange={setEditType}
          options={AGENT_TYPES}
          style={{ width: 140 }}
        />
        <Space className="ml-auto">
          <Button icon={<HistoryOutlined />}>quản lý phiên bản</Button>
          <Button icon={<ThunderboltOutlined />} loading={testing} onClick={() => void handleRunTest()}>
            Kiểm thử
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void handleSave()}>
            Lưu
          </Button>
        </Space>
      </div>

      {/* Hai cột: luồng công việc + thuộc tính */}
      <Layout className="flex-1 min-h-0 flex-row overflow-hidden">
        {/* Bên trái: vị trí giữ của trình chỉnh sửa luồng công việc */}
        <div className="flex-1 min-w-0 overflow-auto p-4 bg-gray-50 border-r border-gray-200">
          <div className="text-sm text-gray-500 mb-2">Điều phối workflow (có thể tích hợp React Flow)</div>
          <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 min-h-[320px]">
            <div className="flex flex-col items-center gap-4">
              {workflowNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div
                    className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedNodeId === node.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                  >
                    <span className="font-medium">{node.label}</span>
                    <span className="ml-2 text-xs text-gray-400">({node.type})</span>
                  </div>
                  {i < workflowNodes.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-300" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="small" icon={<PlusOutlined />}>
                Thêm nút
              </Button>
            </div>
          </div>
        </div>

        {/* Phải: cấu hình thuộc tính nút */}
        <div className="w-96 flex-shrink-0 overflow-auto border-l border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-100 font-medium flex items-center gap-2">
            <SettingOutlined />
            Thuộc tính nút
          </div>
          <div className="p-4 space-y-4">
            {selectedNodeId ? (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Prompt</label>
                  <Input.TextArea
                    rows={6}
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    placeholder="Nhập prompt hệ thống..."
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nhiệt độ (Temperature)</label>
                  <Slider min={0} max={2} step={0.1} value={temperature} onChange={setTemperature} />
                  <span className="text-xs text-gray-400">{temperature}</span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Top-P</label>
                  <Slider min={0} max={1} step={0.05} value={topP} onChange={setTopP} />
                  <span className="text-xs text-gray-400">{topP}</span>
                </div>
                {agent.type === 'plot' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Ngưỡng giữ tuyến chính</label>
                    <InputNumber min={0} max={1} step={0.1} defaultValue={0.5} className="w-full" />
                  </div>
                )}
                {agent.type === 'character' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Giới hạn số nhân vật</label>
                    <InputNumber min={1} max={100} defaultValue={20} className="w-full" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-sm">Bấm nút bên trái để chỉnh sửa thuộc tính</div>
            )}
          </div>
        </div>
      </Layout>

      {/* Vùng kiểm thử dưới */}
      <div
        className="flex-shrink-0 border-t border-gray-200 bg-white flex flex-col"
        style={{ height: testPanelCollapsed ? 48 : 280 }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-gray-100 cursor-pointer"
          onClick={() => setTestPanelCollapsed(!testPanelCollapsed)}
        >
          <Space>
            <PlayCircleOutlined />
            <span className="font-medium">Vùng test</span>
          </Space>
          <Button type="text" size="small">
            {testPanelCollapsed ? 'Mở' : 'Thu gọn'}
          </Button>
        </div>
        {!testPanelCollapsed && (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="w-1/2 flex flex-col border-r border-gray-100 p-3">
              <div className="text-sm text-gray-500 mb-1">Đầu vào (đoạn kịch bản / JSON)</div>
              <Input.TextArea
                placeholder="Dán kịch bản hoặc dữ liệu thử..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="flex-1 font-mono text-sm resize-none"
                rows={6}
              />
              <Button type="primary" icon={<ThunderboltOutlined />} loading={testing} className="mt-2" onClick={() => void handleRunTest()}>
                Chạy
              </Button>
            </div>
            <div className="w-1/2 flex flex-col overflow-hidden p-3">
              <Tabs
                activeKey={testTab}
                onChange={(k) => setTestTab(k as 'output' | 'history')}
                size="small"
                items={[
                  { key: 'output', label: 'Đầu ra' },
                  { key: 'history', label: 'Lịch sử' },
                ]}
              />
              {testTab === 'output' && (
                <>
                  <div className="text-xs text-gray-500 mb-1 overflow-auto flex-1 font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded">
                    {testLogs.length > 0 && (
                      <div className="mb-2 text-gray-600">
                        {testLogs.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}
                    {testOutput || 'Chạy xong sẽ hiện kết quả ở đây'}
                  </div>
                </>
              )}
              {testTab === 'history' && (
                <div className="text-gray-500 text-sm flex-1 overflow-auto">Tạm chưa có bản ghi test lịch sử</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
