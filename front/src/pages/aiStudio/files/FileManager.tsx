import React, { useEffect, useState } from 'react'
import {
  Card,
  Input,
  Select,
  Row,
  Col,
  Tag,
  Button,
  message,
  Space,
} from 'antd'
import { DownloadOutlined, FileImageOutlined, VideoCameraOutlined } from '@ant-design/icons'
import api from '../../../services/aiStudioApi'
import type { FileItem } from '../../../mocks/data'

const PRESET_TAGS = ['Khung hình đầu', 'Khung hình cuối', 'Khung hình chính', 'Thành phẩm', 'Phiên bản 1', 'Hiện thực', 'Khoa học viễn tưởng', 'Chờ xuất']

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedFileIds, setSelectedFileIds] = useState<React.Key[]>([])
  const [quickTag, setQuickTag] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const list = await api.files.list()
      setFiles(Array.isArray(list) ? list : [])
    } catch {
      message.error('Nạp tệp thất bại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const list = Array.isArray(files) ? files : []
  const allTags = Array.from(
    new Set(list.flatMap((f) => (f && Array.isArray(f.tags) ? f.tags : [])))
  ).sort()

  const filtered = list.filter((f) => {
    const matchSearch =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchTag = !tagFilter || f.tags.includes(tagFilter)
    return matchSearch && matchTag
  })

  const effectiveTags = [...new Set([...PRESET_TAGS, ...allTags])]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input.Search
          placeholder="Tìm theo tên tệp hoặc nhãn"
          allowClear
          className="max-w-sm"
          onSearch={setSearch}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder="Lọc theo nhãn"
          allowClear
          style={{ width: 160 }}
          value={tagFilter}
          onChange={setTagFilter}
          options={allTags.map((t) => ({ label: t, value: t }))}
        />
        <Select
          placeholder="Đánh dấu nhanh (mẫu có sẵn/thêm)"
          allowClear
          style={{ width: 160 }}
          value={quickTag || undefined}
          onChange={(v) => setQuickTag(v ?? '')}
          options={effectiveTags.map((t) => ({ label: t, value: t }))}
          onSelect={(v) => {
            if (selectedFileIds.length) message.success(`Đã thêm thẻ「${v}」cho ${selectedFileIds.length} tệp (Mock)`)
          }}
        />
        <Button icon={<DownloadOutlined />} disabled={selectedFileIds.length === 0}>
          Xuất hàng loạt{selectedFileIds.length ? ` (${selectedFileIds.length})` : ''}
        </Button>
      </div>

      <Card title="Danh sách tệp" loading={loading}>
        <Row gutter={[16, 16]}>
          {filtered.map((f) => (
            <Col xs={24} sm={12} md={8} lg={6} key={f.id}>
              <Card
                size="small"
                hoverable
                className={selectedFileIds.includes(f.id) ? 'ring-2 ring-blue-500' : ''}
                onClick={() => setSelectedFileIds((prev) => prev.includes(f.id) ? prev.filter((k) => k !== f.id) : [...prev, f.id])}
                cover={
                  <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400">
                    {f.type === 'video' ? (
                      <VideoCameraOutlined className="text-2xl" />
                    ) : (
                      <FileImageOutlined className="text-2xl" />
                    )}
                  </div>
                }
              >
                <div className="font-medium text-sm truncate" title={f.name}>
                  {f.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">{f.createdAt}</div>
                <Space wrap className="mt-2">
                  {f.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </Space>
                <div className="mt-2">
                  <Button type="link" size="small" icon={<DownloadOutlined />} onClick={(e) => e.stopPropagation()}>
                    Xuất
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8">Chưa có tệp</div>
        )}
      </Card>
    </div>
  )
}

export default FileManager
