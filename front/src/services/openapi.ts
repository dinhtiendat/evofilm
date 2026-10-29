import { OpenAPI } from './generated'

declare global {
  interface Window {
    __ENV?: {
      BACKEND_URL?: string
    }
  }
}

/**
 * Khởi tạo client yêu cầu được tạo từ OpenAPI.
 *
 * Giải thích:
 * - Đường dẫn của giao diện tạo đã chứa `/api/v1/...`, vì vậy BASE mặc định nên là chuỗi rỗng (cùng nguồn) hoặc địa chỉ backend đầy đủ.
 * - Phát triển cục bộ mặc định nối thẳng `http://localhost:8000`.
 */
export function initOpenAPI(base: string = '') {
  OpenAPI.BASE = base
}

const runtimeBackendUrl = window.__ENV?.BACKEND_URL
const buildtimeBackendUrl = import.meta.env.VITE_BACKEND_URL
const defaultBackendUrl = 'http://localhost:8000'

initOpenAPI(runtimeBackendUrl ?? buildtimeBackendUrl ?? defaultBackendUrl)
