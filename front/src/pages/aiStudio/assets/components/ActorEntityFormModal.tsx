import { useEffect, useState } from 'react'
import { Input, InputNumber, Modal, message } from 'antd'
import { StudioEntitiesApi } from '../../../../services/studioEntities'
import { ProjectVisualStyleAndStyleFields } from '../../project/ProjectVisualStyleAndStyleFields'
import { useProjectStyleOptions } from '../../project/useProjectStyleOptions'

export type ActorEntityLike = {
  id: string
  name: string
  description?: string | null
  tags?: string[]
  view_count?: number | null
  visual_style?: string
  style?: string
}

function normalizeTags(input: string): string[] {
  return input
    .split(/[,，\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function ActorEntityFormModal({
  open,
  editing,
  linkProjectId,
  linkChapterId,
  linkShotId,
  onCancel,
  onSuccess,
}: {
  open: boolean
  editing: ActorEntityLike | null
  linkProjectId?: string
  linkChapterId?: string
  linkShotId?: string
  onCancel: () => void
  onSuccess: (detail?: { created?: unknown }) => void | Promise<void>
}) {
  const { options: projectStyleOptions, defaultVisualStyle, getDefaultStyle } = useProjectStyleOptions()
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formViewCount, setFormViewCount] = useState<number | null>(null)
  const [formVisualStyle, setFormVisualStyle] = useState<'现实' | '动漫'>(defaultVisualStyle as '现实' | '动漫')
  const [formStyle, setFormStyle] = useState<string>(getDefaultStyle(defaultVisualStyle))

  useEffect(() => {
    if (!open) return
    if (editing) {
      setFormName(editing.name)
      setFormDesc(editing.description ?? '')
      setFormTags((editing.tags ?? []).join(', '))
      setFormViewCount(editing.view_count ?? null)
      const nextVisual = ((editing.visual_style as '现实' | '动漫' | undefined) ?? defaultVisualStyle) as '现实' | '动漫'
      setFormVisualStyle(nextVisual)
      setFormStyle(
        (editing.style as string | undefined) ?? getDefaultStyle(nextVisual),
      )
    } else {
      setFormName('')
      setFormDesc('')
      setFormTags('')
      setFormViewCount(null)
      setFormVisualStyle(defaultVisualStyle as '现实' | '动漫')
      setFormStyle(getDefaultStyle(defaultVisualStyle))
    }
  }, [open, editing, defaultVisualStyle, getDefaultStyle])

  const handleOk = async () => {
    const name = formName.trim()
    if (!name) {
      message.warning('Vui lòng nhập tên')
      return Promise.reject(new Error('validation'))
    }
    try {
      if (!editing) {
        const created = await StudioEntitiesApi.create('actor', {
          id: crypto?.randomUUID?.() ?? `actor_${Date.now()}`,
          name,
          description: formDesc.trim() || undefined,
          tags: normalizeTags(formTags),
          view_count: formViewCount ?? undefined,
          visual_style: formVisualStyle,
          style: formStyle,
          prompt_template_id: null,
          ...(linkProjectId ? { project_id: linkProjectId } : {}),
          ...(linkProjectId && linkChapterId ? { chapter_id: linkChapterId } : {}),
          ...(linkProjectId && linkShotId ? { shot_id: linkShotId } : {}),
        })
        message.success('Đã tạo thành công')
        onCancel()
        await onSuccess({ created: created.data })
      } else {
        await StudioEntitiesApi.update('actor', editing.id, {
          name,
          description: formDesc.trim() || null,
          tags: normalizeTags(formTags),
          view_count: formViewCount ?? null,
          visual_style: formVisualStyle,
          style: formStyle,
        })
        message.success('Cập nhật thành công')
        onCancel()
        await onSuccess()
      }
    } catch {
      message.error(editing ? 'Cập nhật thất bại' : 'Tạo mới thất bại')
      return Promise.reject(new Error('api'))
    }
  }

  return (
    <Modal
      title={editing ? 'Chỉnh sửa diễn viên' : 'Tạo mới diễn viên'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editing ? 'Lưu' : 'Tạo'}
    >
      <div className="space-y-3">
        <div>
          <div className="text-sm text-gray-600 mb-1">Tên</div>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Mô tả</div>
          <Input.TextArea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Nhãn (phân cách bằng dấu phẩy)</div>
          <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Số góc nhìn (tùy chọn)</div>
          <InputNumber className="w-full" min={1} max={4} value={formViewCount} onChange={(v) => setFormViewCount(v ?? null)} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Phong cách thị giác</div>
          <ProjectVisualStyleAndStyleFields
            visual_style={formVisualStyle}
            style={formStyle}
            options={projectStyleOptions}
            onChange={(next) => {
              setFormVisualStyle(next.visual_style)
              setFormStyle(next.style)
            }}
          />
        </div>
      </div>
    </Modal>
  )
}
