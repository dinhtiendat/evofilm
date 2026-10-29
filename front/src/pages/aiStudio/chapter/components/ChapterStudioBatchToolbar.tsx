import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'

type ChapterStudioBatchToolbarProps = {
  selectedCount: number
  batchVideoReadinessLoading: boolean
  generating: boolean
  maintenanceMenuItems: MenuProps['items']
  onBatchInspectVideoReadiness: () => void
  onBatchGenerate: () => void
}

export function ChapterStudioBatchToolbar({
  selectedCount,
  batchVideoReadinessLoading,
  generating,
  maintenanceMenuItems,
  onBatchInspectVideoReadiness,
  onBatchGenerate,
}: ChapterStudioBatchToolbarProps) {
  return (
    <div className="cs-group m-3 mt-0 mb-2">
      <div className="cs-group-title mb-1 flex items-center gap-2">
        <AppstoreOutlined /> Thao tác hàng loạt
      </div>
      <div className="mb-2 text-xs text-gray-500">
        Đang xử lý hàng loạt {selectedCount} phân cảnh, có thể tiếp tục theo{' '}
        <span className="font-medium text-gray-700">Command/Ctrl + nhấp chuột</span>{' '}
        Điều chỉnh lựa chọn
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600">Đã chọn {selectedCount} mục</span>
        <Button
          size="small"
          icon={<VideoCameraOutlined />}
          loading={batchVideoReadinessLoading}
          disabled={batchVideoReadinessLoading}
          onClick={onBatchInspectVideoReadiness}
        >
          Độ sẵn sàng tạo video hàng loạt
        </Button>
        <Button
          size="small"
          icon={<ThunderboltOutlined />}
          loading={generating}
          onClick={onBatchGenerate}
        >
          Tạo hàng loạt
        </Button>
        <Dropdown menu={{ items: maintenanceMenuItems }} trigger={['click']}>
          <Button size="small" icon={<SettingOutlined />}>
            Bảo trì khác
          </Button>
        </Dropdown>
      </div>
    </div>
  )
}
