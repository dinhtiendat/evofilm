import { useNavigate } from 'react-router-dom'
import { PlaceholderTab } from './PlaceholderTab'

export function SettingsTab() {
  const navigate = useNavigate()
  return (
    <PlaceholderTab
      title="Cài đặt dự án"
      description="Thông tin cơ bản dự án, style/hạt giống toàn cục, thành viên cộng tác, xóa dự án v.v."
      actionLabel="Đến cài đặt hệ thống"
      onAction={() => navigate('/settings')}
    />
  )
}
