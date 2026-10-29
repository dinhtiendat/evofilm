import { create } from 'zustand'
import type { SupportedLanguage } from '../i18n'

interface UserInfo {
  name: string
  role: string
}

interface AppState {
  siderCollapsed: boolean
  user: UserInfo
  language: SupportedLanguage
  setUser: (user: Partial<UserInfo>) => void
  setLanguage: (lang: SupportedLanguage) => void
  toggleSider: () => void
}

export const useAppStore = create<AppState>((set) => ({
  siderCollapsed: false,
  user: {
    name: 'Admin',
    role: 'Quản trị viên hệ thống',
  },
  language: 'vi-VN',
  setUser: (user) =>
    set((state) => ({
      user: {
        ...state.user,
        ...user,
      },
    })),
  setLanguage: (lang) => set(() => ({ language: lang })),
  toggleSider: () =>
    set((state) => ({
      siderCollapsed: !state.siderCollapsed,
    })),
}))


