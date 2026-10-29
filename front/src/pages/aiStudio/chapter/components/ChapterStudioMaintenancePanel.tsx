import { AppstoreOutlined, DeleteOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Input, Space, Switch } from 'antd'

type ChapterStudioMaintenancePanelProps = {
  opsTitleDraft: string
  opsNoteDraft: string
  hideShot: boolean
  onChangeTitle: (value: string) => void
  onBlurTitle: () => void
  onChangeNote: (value: string) => void
  onBlurNote: () => void
  onToggleHidden: (value: boolean) => void
  onRequestDelete: () => void
}

export function ChapterStudioMaintenancePanel({
  opsTitleDraft,
  opsNoteDraft,
  hideShot,
  onChangeTitle,
  onBlurTitle,
  onChangeNote,
  onBlurNote,
  onToggleHidden,
  onRequestDelete,
}: ChapterStudioMaintenancePanelProps) {
  return (
    <div>
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
        Ở đây đặt các thao tác bảo trì cấp phụ, ví dụ sửa tiêu đề, bổ sung ghi chú, ẩn hoặc xóa phân cảnh. Luồng tạo chính vẫn khuyến khích ưu tiên dùng các module “Tạo video”, “Khung hình chính và ảnh tham chiếu”, “Tham số tạo”.
      </div>

      <div className="cs-group">
        <div className="cs-group-title">
          <EditOutlined /> Bảo trì cơ bản
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-gray-500 text-xs mb-1">Tiêu đề phân cảnh</div>
            <Input
              value={opsTitleDraft}
              placeholder="Tiêu đề phân cảnh…"
              onChange={(e) => onChangeTitle(e.target.value)}
              onBlur={onBlurTitle}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">ẩn phân cảnh này</div>
              <div className="text-xs text-gray-500">Sau khi ẩn sẽ không tham gia xem trước cả chương và xuất</div>
            </div>
            <Switch checked={hideShot} onChange={onToggleHidden} />
          </div>
        </div>
      </div>

      <div className="cs-group">
        <div className="cs-group-title">
          <FileTextOutlined /> Duy trì ghi chú
        </div>
        <Input.TextArea
          rows={3}
          value={opsNoteDraft}
          placeholder="Ghi chú…"
          onChange={(e) => onChangeNote(e.target.value)}
          onBlur={onBlurNote}
        />
      </div>

      <div className="cs-group">
        <div className="cs-group-title">
          <AppstoreOutlined /> Thao tác rủi ro cao
        </div>
        <div className="text-xs text-gray-500 mb-3">Xóa là thao tác bảo trì, không ảnh hưởng đến luồng tạo dựng hiện tại; nếu không thật sự cần, nên giữ phân cảnh và tiếp tục chuẩn bị tạo dựng.</div>
        <Space wrap>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onRequestDelete}
          >
            Xóa
          </Button>
        </Space>
      </div>
    </div>
  )
}
