import { OpenAPI } from '../../../services/generated'

function tryExtractFileIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const m = url.pathname.match(/\/api\/v1\/studio\/files\/([^/]+)\/download\/?$/)
    if (m?.[1]) return decodeURIComponent(m[1])
  } catch {
    // ignore parse error
  }
  return null
}

export function resolveAssetUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    const fileId = tryExtractFileIdFromUrl(trimmed)
    if (fileId) return buildFileDownloadUrl(fileId)
    return trimmed
  }

  // Một số trường thumbnail phía backend có thể trả thẳng file_id (không chứa / hoặc :).
  // Trường hợp này cần nối đường dẫn tải xuống, nếu không new URL sẽ sinh đường dẫn sai.
  if (!trimmed.includes('/') && !trimmed.includes(':')) {
    return buildFileDownloadUrl(trimmed)
  }

  try {
    const fallbackBase =
      window.__ENV?.BACKEND_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:8000'
    return new URL(trimmed, OpenAPI.BASE || fallbackBase).toString()
  } catch {
    return trimmed
  }
}

export function buildFileDownloadUrl(fileId?: string | null): string | undefined {
  if (!fileId) return undefined
  return resolveAssetUrl(`/api/v1/studio/files/${encodeURIComponent(fileId)}/download`)
}
