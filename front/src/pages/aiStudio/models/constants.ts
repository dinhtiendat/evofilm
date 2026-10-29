import type { ModelCategoryKey } from '../../../services/generated/models/ModelCategoryKey'
import type { ProviderStatus } from '../../../services/generated/models/ProviderStatus'

export const MODEL_CATEGORIES: { key: ModelCategoryKey; label: string; color: string }[] = [
  { key: 'text', label: 'sinh văn bản', color: 'blue' },
  { key: 'image', label: 'Tạo ảnh', color: 'orange' },
  { key: 'video', label: 'Tạo video', color: 'purple' },
]

export const categoryLabelMap = Object.fromEntries(MODEL_CATEGORIES.map((c) => [c.key, c.label]))
export const categoryColorMap = Object.fromEntries(MODEL_CATEGORIES.map((c) => [c.key, c.color]))

export const PROVIDER_STATUS_MAP: Record<ProviderStatus, { text: string; color: string }> = {
  active: { text: 'Đang hoạt động', color: 'green' },
  testing: { text: 'đang test', color: 'orange' },
  disabled: { text: 'tắt', color: 'default' },
}

export const SORT_OPTIONS = [
  { value: 'updated', label: 'Gần đây nhất' },
  { value: 'name', label: 'Tên' },
  { value: 'category', label: 'Hạng mục' },
]

export function maskUrl(url: string): string {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return `${u.protocol}//***${u.host.slice(-6)}${u.pathname}`
  } catch {
    return url.slice(0, 20) + '***'
  }
}

/** Khung nút icon cột thao tác bảng dùng chung (ghi đè kích thước mặc định của Ant Design) */
const TABLE_ACTION_BTN_BASE =
  '!inline-flex !h-7 !w-7 !min-w-7 !cursor-pointer !items-center !justify-center !rounded-md !border !border-solid !p-0 shadow-sm transition-colors'

/** Chỉnh sửa: màu chính xanh dương, mặc định nhận ra được là có thể thao tác */
export const TABLE_ACTION_BTN_EDIT_CLASS = `${TABLE_ACTION_BTN_BASE} !border-blue-200 !bg-blue-50 !text-blue-600 hover:!border-blue-400 hover:!bg-blue-100 hover:!text-blue-700 active:!bg-blue-200/60`

/** Thử/chạy: màu hổ phách, phân biệt với chỉnh sửa */
export const TABLE_ACTION_BTN_TEST_CLASS = `${TABLE_ACTION_BTN_BASE} !border-amber-200 !bg-amber-50 !text-amber-600 hover:!border-amber-400 hover:!bg-amber-100 hover:!text-amber-700 active:!bg-amber-200/60`

/** Thêm: Xám trung tính */
export const TABLE_ACTION_BTN_MORE_CLASS = `${TABLE_ACTION_BTN_BASE} !border-slate-200 !bg-slate-50 !text-slate-600 hover:!border-slate-300 hover:!bg-slate-100 hover:!text-slate-800 active:!bg-slate-200/70`
