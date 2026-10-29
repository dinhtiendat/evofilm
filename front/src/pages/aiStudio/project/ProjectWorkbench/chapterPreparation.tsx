import type { ReactNode } from 'react'
import {
  EditOutlined,
  FileSearchOutlined,
  ScissorOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { Chapter } from './hooks/useProjectData'

export type ChapterPreparationState = {
  key: 'edit_raw' | 'extract_shots' | 'prepare_shots' | 'shoot'
  text: string
  color: string
  hint: string
  primaryAction: string
  primaryIcon: ReactNode
}

export function getChapterPreparationState(chapter: Chapter): ChapterPreparationState {
  const hasRawText = !!chapter.rawText?.trim()
  const hasShots = (chapter.storyboardCount ?? 0) > 0
  if (!hasRawText) {
    return {
      key: 'edit_raw',
      text: 'Chờ nhập nguyên văn',
      color: 'default',
      hint: 'Hãy bổ sung nguyên văn chương trước, rồi vào quy trình phân cảnh',
      primaryAction: 'Chỉnh sửa nguyên văn',
      primaryIcon: <EditOutlined />,
    }
  }
  if (!hasShots) {
    return {
      key: 'extract_shots',
      text: 'Phân cảnh chờ trích xuất',
      color: 'gold',
      hint: 'Đã có nguyên văn chương, bước tiếp theo nên trích xuất phân cảnh trước',
      primaryAction: 'Trích xuất phân cảnh',
      primaryIcon: <ScissorOutlined />,
    }
  }
  if (chapter.status === 'shooting' || chapter.status === 'done') {
    return {
      key: 'shoot',
      text: 'Có thể vào quay',
      color: 'green',
      hint: 'Chương hiện tại đã có phân cảnh, có thể tiếp tục quay',
      primaryAction: 'Vào quay',
      primaryIcon: <VideoCameraOutlined />,
    }
  }
  return {
    key: 'prepare_shots',
    text: 'Phân cảnh chờ chuẩn bị',
    color: 'blue',
    hint: 'Đã có phân cảnh, nên vào studio phân cảnh trước để hoàn thiện sự sẵn sàng của phân cảnh',
    primaryAction: 'Vào studio phân cảnh',
    primaryIcon: <FileSearchOutlined />,
  }
}
