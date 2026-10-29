import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import viLayout from './locales/vi-VN/layout.json'
import viCommon from './locales/vi-VN/common.json'
import viSettings from './locales/vi-VN/settings.json'
import viNotFound from './locales/vi-VN/notFound.json'
import enLayout from './locales/en-US/layout.json'
import enCommon from './locales/en-US/common.json'
import enSettings from './locales/en-US/settings.json'
import enNotFound from './locales/en-US/notFound.json'

export type SupportedLanguage = 'vi-VN' | 'en-US'

const resources = {
  'vi-VN': {
    common: viCommon,
    layout: viLayout,
    settings: viSettings,
    notFound: viNotFound,
  },
  'en-US': {
    common: enCommon,
    layout: enLayout,
    settings: enSettings,
    notFound: enNotFound,
  },
}

const LANGUAGE_STORAGE_KEY = 'jellyfish_language'
const SUPPORTED_LANGUAGES: readonly string[] = ['vi-VN', 'en-US']

/**
 * Chạy trước i18n.init để dịch giá trị ngôn ngữ lưu localStorage cũ (kỷ nguyên 'zh-CN')
 * sang mã locale mới 'vi-VN'. Bỏ qua các giá trị còn hỗ trợ ('vi-VN', 'en-US')
 * và nuốt lỗi đọc/ghi localStorage (private mode, storage bị chặn).
 */
function migrateLegacyLanguageValue() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && !SUPPORTED_LANGUAGES.includes(stored)) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'vi-VN')
    }
  } catch {
    // localStorage có thể bị chặn; không ảnh hưởng luồng khởi động
  }
}

// Migrate trước init để LanguageDetector đọc localStorage luôn thấy giá trị hợp lệ
migrateLegacyLanguageValue()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi-VN',
    supportedLngs: ['vi-VN', 'en-US'],
    ns: ['common', 'layout', 'settings', 'notFound'],
    defaultNS: 'layout',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: (detected) =>
        // Giá trị detect được không còn hỗ trợ (vd: localStorage 'zh-CN' chưa kịp migrate,
        // hay navigator 'zh') → đổi về 'vi-VN' để khớp supportedLngs
        SUPPORTED_LANGUAGES.includes(detected) ? detected : 'vi-VN',
    },
  })

export default i18n
