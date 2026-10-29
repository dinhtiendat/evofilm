import { useNavigate, useParams } from 'react-router-dom'
import { PlaceholderTab } from './PlaceholderTab'
import { getProjectEditorPath } from '../routes'

export function EditTab() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <PlaceholderTab
      title="Cắt ghép hậu kỳ"
      description="Trình biên tập trục thời gian, hoặc vào từ danh sách chương có thể cắt dựng."
      actionLabel="Vào biên tập hậu kỳ"
      onAction={() => projectId && navigate(getProjectEditorPath(projectId))}
    />
  )
}
