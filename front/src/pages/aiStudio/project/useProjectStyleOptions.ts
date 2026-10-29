import { useEffect, useMemo, useState } from 'react'
import { LlmService, StudioProjectsService } from '../../../services/generated'
import type { ProjectStyleOptionsRead } from '../../../services/generated'
import type { ProjectStyleFieldOptions } from './ProjectVisualStyleAndStyleFields'

const FALLBACK_OPTIONS: ProjectStyleFieldOptions = {
  visualStyles: [
    { value: 'live_action', label: 'Thực tế' },
    { value: 'anime', label: 'Hoạt hình' },
  ],
  stylesByVisual: {
    live_action: [
      { value: 'real_people_city', label: 'Người thật đô thị' },
      { value: 'real_people_scifi', label: 'Người thật khoa học viễn tưởng' },
      { value: 'real_people_ancient', label: 'Người thật cổ trang' },
    ],
    anime: [
      { value: 'anime_scifi', label: 'Hoạt hình khoa học viễn tưởng' },
      { value: 'anime_3d', label: 'Hoạt hình 3D' },
      { value: 'guoman', label: 'Hoạt hình Trung Quốc' },
      { value: 'ink_wash', label: 'Tranh thủy mặc' },
    ],
  },
  defaultStyleByVisual: {
    live_action: 'real_people_city',
    anime: 'anime_3d',
  },
}

type OptionItem = { value: string; label: string }
type ProjectStyleOptionsSnapshot = {
  options: ProjectStyleFieldOptions
  videoRatioOptions: OptionItem[]
  defaultVideoRatio: string
}

let cachedSnapshot: ProjectStyleOptionsSnapshot | null = null
let loadingSnapshotPromise: Promise<ProjectStyleOptionsSnapshot> | null = null
const FALLBACK_DEFAULT_VIDEO_RATIO = '16:9'

function normalizeOptionItems(items: OptionItem[] | null | undefined): OptionItem[] {
  if (!Array.isArray(items)) return []
  return items.filter((item) => item && typeof item.value === 'string' && typeof item.label === 'string')
}

function normalizeStyleOptions(raw: ProjectStyleOptionsRead | null | undefined): ProjectStyleFieldOptions {
  const visualStyles = normalizeOptionItems(raw?.visual_styles as OptionItem[] | undefined)
  const stylesByVisualRaw = (raw?.styles_by_visual_style ?? {}) as Record<string, OptionItem[]>
  const stylesByVisual: Record<string, OptionItem[]> = Object.fromEntries(
    Object.entries(stylesByVisualRaw).map(([key, list]) => [key, normalizeOptionItems(list)]),
  )
  const defaultStyleByVisual = ((raw?.default_style_by_visual_style ?? {}) as Record<string, string>) || {}
  if (!visualStyles.length || !Object.keys(stylesByVisual).length) {
    return FALLBACK_OPTIONS
  }
  return {
    visualStyles,
    stylesByVisual,
    defaultStyleByVisual,
  }
}

function resolveDefaultStyle(options: ProjectStyleFieldOptions, visual: string): string {
  return (
    options.defaultStyleByVisual?.[visual] ??
    options.stylesByVisual?.[visual]?.[0]?.value ??
    ''
  )
}

/**
 * Tải và cache cấu hình phong cách dự án, đảm bảo nhiều trang/hộp thoại dùng chung kết quả của cùng một yêu cầu.
 */
async function loadProjectStyleOptionsSnapshot(): Promise<ProjectStyleOptionsSnapshot> {
  if (cachedSnapshot) return cachedSnapshot
  if (loadingSnapshotPromise) return loadingSnapshotPromise
  loadingSnapshotPromise = (async () => {
    try {
      const [styleRes, videoRes] = await Promise.all([
        StudioProjectsService.getProjectStyleOptionsApiV1StudioProjectsStyleOptionsGet(),
        LlmService.getVideoGenerationOptionsApiV1LlmVideoGenerationOptionsGet(),
      ])
      const styleData = styleRes.data
      const videoData = videoRes.data
      const snapshot: ProjectStyleOptionsSnapshot = {
        options: normalizeStyleOptions(styleData ?? undefined),
        videoRatioOptions: normalizeOptionItems(
          (videoData?.allowed_ratios ?? []).map((value) => ({ value, label: value })),
        ),
        defaultVideoRatio: videoData?.default_ratio ?? FALLBACK_DEFAULT_VIDEO_RATIO,
      }
      cachedSnapshot = snapshot
      return snapshot
    } catch {
      const snapshot: ProjectStyleOptionsSnapshot = {
        options: FALLBACK_OPTIONS,
        videoRatioOptions: [],
        defaultVideoRatio: FALLBACK_DEFAULT_VIDEO_RATIO,
      }
      cachedSnapshot = snapshot
      return snapshot
    } finally {
      loadingSnapshotPromise = null
    }
  })()
  return loadingSnapshotPromise
}

export function useProjectStyleOptions() {
  const [options, setOptions] = useState<ProjectStyleFieldOptions>(cachedSnapshot?.options ?? FALLBACK_OPTIONS)
  const [videoRatioOptions, setVideoRatioOptions] = useState<OptionItem[]>(cachedSnapshot?.videoRatioOptions ?? [])
  const [defaultVideoRatio, setDefaultVideoRatio] = useState<string>(cachedSnapshot?.defaultVideoRatio ?? FALLBACK_DEFAULT_VIDEO_RATIO)

  useEffect(() => {
    let active = true
    void (async () => {
      const snapshot = await loadProjectStyleOptionsSnapshot()
      if (!active) return
      setOptions(snapshot.options)
      setVideoRatioOptions(snapshot.videoRatioOptions)
      setDefaultVideoRatio(snapshot.defaultVideoRatio)
    })()
    return () => {
      active = false
    }
  }, [])

  const defaultVisualStyle = useMemo(() => options.visualStyles[0]?.value ?? 'live_action', [options])
  const getDefaultStyle = useMemo(
    () => (visual: string) => resolveDefaultStyle(options, visual),
    [options],
  )

  return {
    options,
    videoRatioOptions,
    defaultVideoRatio,
    defaultVisualStyle,
    getDefaultStyle,
  }
}
