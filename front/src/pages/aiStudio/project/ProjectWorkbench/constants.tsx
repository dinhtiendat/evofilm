import React from 'react'
import {
  HomeOutlined,
  UnorderedListOutlined,
  UserOutlined,
  PictureOutlined,
  ScissorOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { Chapter } from '../../../../mocks/data'

export type TabKey =
  | 'dashboard'
  | 'chapters'
  | 'actors'
  | 'roles'
  | 'scenes'
  | 'props'
  | 'costumes'
  | 'files'
  | 'edit'
  | 'settings'

const TAB_KEYS: TabKey[] = [
  'dashboard',
  'chapters',
  'actors',
  'roles',
  'scenes',
  'props',
  'costumes',
  'files',
  'edit',
  'settings',
]

export function isTabKey(s: string): s is TabKey {
  return TAB_KEYS.includes(s as TabKey)
}

export const DEFAULT_TAB: TabKey = 'dashboard'

export const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Bảng điều khiển', icon: <HomeOutlined /> },
  { key: 'chapters', label: 'Chương', icon: <UnorderedListOutlined /> },
  { key: 'actors', label: 'Diễn viên', icon: <UserOutlined /> },
  { key: 'roles', label: 'Nhân vật', icon: <UserOutlined /> },
  { key: 'scenes', label: 'Bối cảnh', icon: <PictureOutlined /> },
  { key: 'props', label: 'Đạo cụ', icon: <ScissorOutlined /> },
  { key: 'costumes', label: 'Trang phục', icon: <ScissorOutlined /> },
  { key: 'files', label: 'Tệp', icon: <FileImageOutlined /> },
  { key: 'edit', label: 'Dàn dựng', icon: <VideoCameraOutlined /> },
  { key: 'settings', label: 'Cài đặt', icon: <SettingOutlined /> },
]

export const chapterStatusMap: Record<Chapter['status'], { color: string; text: string }> = {
  draft: { color: 'default', text: 'Bản nháp' },
  shooting: { color: 'processing', text: 'đang quay' },
  done: { color: 'success', text: 'Hoàn thành' },
}

