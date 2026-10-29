import { Form, Select } from 'antd'

export type ProjectVisualStyleChoice = 'live_action' | 'anime'

export type OptionItem = { value: string; label: string }
export type ProjectStyleOptionsByVisual = Record<string, OptionItem[]>
export type ProjectStyleFieldOptions = {
  visualStyles: OptionItem[]
  stylesByVisual: ProjectStyleOptionsByVisual
  defaultStyleByVisual?: Record<string, string>
}

export const PROJECT_STYLE_OPTIONS_BY_VISUAL: ProjectStyleOptionsByVisual = {
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
}
const DEFAULT_VISUAL_STYLE_OPTIONS: OptionItem[] = [
  { value: 'live_action', label: 'Thực tế' },
  { value: 'anime', label: 'Hoạt hình' },
]
const DEFAULT_STYLE_BY_VISUAL: Record<string, string> = {
  live_action: PROJECT_STYLE_OPTIONS_BY_VISUAL['live_action']?.[0]?.value ?? '',
  anime: PROJECT_STYLE_OPTIONS_BY_VISUAL['anime']?.[0]?.value ?? '',
}

type FormModeProps = {
  form: any
  disabled?: boolean
  options?: ProjectStyleFieldOptions
}

type ControlledModeProps = {
  visual_style: ProjectVisualStyleChoice
  style: string
  onChange: (next: { visual_style: ProjectVisualStyleChoice; style: string }) => void
  disabled?: boolean
  visualStyleLabel?: string
  styleLabel?: string
  options?: ProjectStyleFieldOptions
}

function resolveOptions(options?: ProjectStyleFieldOptions): ProjectStyleFieldOptions {
  return {
    visualStyles: options?.visualStyles?.length ? options.visualStyles : DEFAULT_VISUAL_STYLE_OPTIONS,
    stylesByVisual:
      options?.stylesByVisual && Object.keys(options.stylesByVisual).length
        ? options.stylesByVisual
        : PROJECT_STYLE_OPTIONS_BY_VISUAL,
    defaultStyleByVisual:
      options?.defaultStyleByVisual && Object.keys(options.defaultStyleByVisual).length
        ? options.defaultStyleByVisual
        : DEFAULT_STYLE_BY_VISUAL,
  }
}

function getDefaultStyle(visual: string, options: ProjectStyleFieldOptions): string {
  return (
    options.defaultStyleByVisual?.[visual] ??
    options.stylesByVisual[visual]?.[0]?.value ??
    ''
  )
}

export function ProjectVisualStyleAndStyleFields(props: FormModeProps | ControlledModeProps) {
  const disabled = props.disabled
  const resolvedOptions = resolveOptions(props.options)

  if ('form' in props) {
    const { form } = props

    return (
      <>
        <Form.Item name="visual_style" label="Phong cách hình ảnh" rules={[{ required: true }]}>
          <Select
            disabled={disabled}
            onChange={(v: string) => {
              const nextStyle = getDefaultStyle(v, resolvedOptions)
              form.setFieldValue('style', nextStyle)
            }}
            options={resolvedOptions.visualStyles}
          />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, next) => prev.visual_style !== next.visual_style}>
          {({ getFieldValue }) => {
            const visual = (getFieldValue('visual_style') as string | undefined) ?? resolvedOptions.visualStyles[0]?.value ?? 'live_action'
            return (
              <Form.Item name="style" label="Phong cách video" rules={[{ required: true }]}>
                <Select disabled={disabled} options={resolvedOptions.stylesByVisual[visual] ?? []} />
              </Form.Item>
            )
          }}
        </Form.Item>
      </>
    )
  }

  const { visual_style, style, onChange, visualStyleLabel, styleLabel } = props

  return (
    <div className="space-y-3">
      <div>
        <span className="text-gray-600 text-sm">{visualStyleLabel ?? 'Phong cách thị giác'}</span>
        <Select
          className="mt-1 w-full"
          disabled={disabled}
          value={visual_style}
          onChange={(v) => {
            const nextVisual = v as ProjectVisualStyleChoice
            onChange({ visual_style: nextVisual, style: getDefaultStyle(nextVisual, resolvedOptions) })
          }}
          options={resolvedOptions.visualStyles}
        />
      </div>
      <div>
        <span className="text-gray-600 text-sm">{styleLabel ?? 'Phong cách video'}</span>
        <Select
          className="mt-1 w-full"
          disabled={disabled}
          value={style}
          onChange={(v) => onChange({ visual_style, style: String(v) })}
          options={resolvedOptions.stylesByVisual[visual_style] ?? []}
        />
      </div>
    </div>
  )
}

