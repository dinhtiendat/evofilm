export type WorkbenchAssetTabParam = 'actors' | 'scenes' | 'props' | 'costumes'

export function encodeWorkbenchAssetEditReturnTo(projectId: string, tab: WorkbenchAssetTabParam): string {
  return encodeURIComponent(`/projects/${projectId}?tab=${tab}`)
}

/** Chỉ cho phép đường dẫn trong trang `/projects/...`, tránh open redirect */
export function decodeAssetEditReturnTo(searchReturnTo: string | null, fallback: string): string {
  if (!searchReturnTo?.trim()) return fallback
  try {
    const decoded = decodeURIComponent(searchReturnTo.trim())
    if (decoded.startsWith('/projects/')) return decoded
  } catch {
    // ignore malformed encoding
  }
  return fallback
}
