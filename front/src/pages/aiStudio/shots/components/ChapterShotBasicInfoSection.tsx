import { Button, Input, InputNumber, Select, Tag } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import type { ActionBeatPhaseRead, CameraAngle, CameraMovement, CameraShotType } from '../../../../services/generated'

const CAMERA_SHOT_OPTIONS: Array<{ value: CameraShotType; label: string }> = [
  { value: 'ECU', label: 'Cận cảnh lớn' },
  { value: 'CU', label: 'Cận cảnh' },
  { value: 'MCU', label: 'Cảnh trung gần' },
  { value: 'MS', label: 'Cảnh trung' },
  { value: 'MLS', label: 'Cảnh trung xa' },
  { value: 'LS', label: 'Cảnh xa' },
  { value: 'ELS', label: 'Cận cảnh xa lớn' },
]

const CAMERA_ANGLE_OPTIONS: Array<{ value: CameraAngle; label: string }> = [
  { value: 'EYE_LEVEL', label: 'Ngang tầm mắt' },
  { value: 'HIGH_ANGLE', label: 'Góc cao' },
  { value: 'LOW_ANGLE', label: 'Góc thấp' },
  { value: 'BIRD_EYE', label: 'Góc nhìn từ trên cao' },
  { value: 'DUTCH', label: 'nghiêng kiểu Hà Lan' },
  { value: 'OVER_SHOULDER', label: 'Qua vai' },
]

const CAMERA_MOVEMENT_OPTIONS: Array<{ value: CameraMovement; label: string }> = [
  { value: 'STATIC', label: 'Góc máy cố định' },
  { value: 'PAN', label: 'trượt ngang' },
  { value: 'TILT', label: 'Xoay trục dọc' },
  { value: 'DOLLY_IN', label: 'Đẩy gần' },
  { value: 'DOLLY_OUT', label: 'Kéo xa' },
  { value: 'TRACK', label: 'Quay theo' },
  { value: 'CRANE', label: 'cần cẩu quay' },
  { value: 'HANDHELD', label: 'Tay cầm' },
  { value: 'STEADICAM', label: 'Máy steadicam' },
  { value: 'ZOOM_IN', label: 'Zoom đẩy gần' },
  { value: 'ZOOM_OUT', label: 'Zoom kéo xa' },
]

type ShotSemanticDraft = {
  camera_shot?: CameraShotType
  angle?: CameraAngle
  movement?: CameraMovement
  duration?: number
  action_beats?: Array<string>
}

type ChapterShotBasicInfoSectionProps = {
  title: string
  scriptExcerpt: string
  saving: boolean
  semanticSaving: boolean
  semantic: ShotSemanticDraft
  actionBeatPhases?: Array<ActionBeatPhaseRead>
  onTitleChange: (value: string) => void
  onScriptExcerptChange: (value: string) => void
  onSemanticChange: (patch: ShotSemanticDraft) => void
  onSave: () => void
}

export function ChapterShotBasicInfoSection({
  title,
  scriptExcerpt,
  saving,
  semanticSaving,
  semantic,
  actionBeatPhases,
  onTitleChange,
  onScriptExcerptChange,
  onSemanticChange,
  onSave,
}: ChapterShotBasicInfoSectionProps) {
  const phaseByText = new Map((actionBeatPhases ?? []).map((item) => [item.text.trim(), item.phase]))
  const phaseMeta = (phase?: ActionBeatPhaseRead['phase']) => {
    if (phase === 'trigger') return { label: 'Kích hoạt', color: 'gold' as const }
    if (phase === 'peak') return { label: 'Đỉnh', color: 'blue' as const }
    if (phase === 'aftermath') return { label: 'Khép lại', color: 'green' as const }
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">Thông tin cơ bản phân cảnh</div>
        <div className="text-[11px] text-slate-500 mt-1">Xác nhận tiêu đề, trích dẫn và giá trị mặc định của ngôn ngữ điện ảnh trước, rồi tiếp tục xử lý kết quả trích xuất của hệ thống.</div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">Tiêu đề</div>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Tiêu đề"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-xs text-gray-600">Nội dung / Trích đoạn kịch bản</div>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
            >
              Lưu
            </Button>
          </div>
          <Input.TextArea
            value={scriptExcerpt}
            onChange={(e) => onScriptExcerptChange(e.target.value)}
            autoSize={{ minRows: 4, maxRows: 14 }}
            placeholder="Trích đoạn kịch bản"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-slate-800">Giá trị mặc định ngôn ngữ điện ảnh</div>
              <div className="mt-1 text-[11px] text-slate-500">Ở đây xác nhận trị thật về mặt ngữ nghĩa của phân cảnh; studio phía sau có thể tinh chỉnh, nhưng vẫn ghi ngược vào cùng một hồ sơ chi tiết phân cảnh.</div>
            </div>
            <Button type="primary" size="small" loading={semanticSaving} onClick={onSave}>
              Lưu
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-gray-600">Cận (độ rộng shot)</div>
              <Select
                value={semantic.camera_shot ?? undefined}
                onChange={(value) => onSemanticChange({ camera_shot: value })}
                options={CAMERA_SHOT_OPTIONS}
                placeholder="Chọn cận"
                className="w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-gray-600">Góc máy</div>
              <Select
                value={semantic.angle ?? undefined}
                onChange={(value) => onSemanticChange({ angle: value })}
                options={CAMERA_ANGLE_OPTIONS}
                placeholder="Chọn góc máy"
                className="w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-gray-600">Chuyển động máy</div>
              <Select
                value={semantic.movement ?? undefined}
                onChange={(value) => onSemanticChange({ movement: value })}
                options={CAMERA_MOVEMENT_OPTIONS}
                placeholder="Chọn chuyển động máy"
                className="w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-gray-600">Thời lượng（giây）</div>
              <InputNumber
                min={1}
                max={30}
                value={semantic.duration ?? 4}
                onChange={(value) => onSemanticChange({ duration: Math.max(1, Math.round(Number(value) || 1)) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-slate-800">Mốc hành động</div>
                <div className="mt-1 text-[11px] text-slate-500">Chỉ cần giữ lại 2-4 mục theo thứ tự thời gian bên trong phân cảnh, khung hình chính và video phía sau sẽ ưu tiên dùng phiên bản đã xác nhận ở đây.</div>
              </div>
              <Button
                size="small"
                onClick={() => onSemanticChange({ action_beats: [...(semantic.action_beats ?? []), ''] })}
              >
                Thêm một mục
              </Button>
            </div>
            <div className="space-y-2">
              {(semantic.action_beats ?? []).length > 0 ? (semantic.action_beats ?? []).map((item, index) => (
                <div key={`action-beat-${index}`} className="flex items-start gap-2">
                  <div className="mt-2 w-5 shrink-0 text-xs text-slate-500">{index + 1}.</div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {phaseMeta(phaseByText.get(item.trim())) ? (
                        <Tag color={phaseMeta(phaseByText.get(item.trim()))?.color} className="m-0">
                          {phaseMeta(phaseByText.get(item.trim()))?.label}
                        </Tag>
                      ) : null}
                    </div>
                    <Input.TextArea
                      value={item}
                      onChange={(e) => {
                        const next = [...(semantic.action_beats ?? [])]
                        next[index] = e.target.value
                        onSemanticChange({ action_beats: next })
                      }}
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      placeholder="Ví dụ: Bỗng khựng lại sau khi nghe tiếng động lạ"
                    />
                  </div>
                  <Button
                    danger
                    size="small"
                    onClick={() => {
                      const next = [...(semantic.action_beats ?? [])]
                      next.splice(index, 1)
                      onSemanticChange({ action_beats: next })
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-[12px] text-slate-500">
                  hiện chưa có mốc hành động. Có thể dùng kết quả trích xuất AI trước, rồi bổ sung 2-4 thay đổi hành động chính theo cần.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
