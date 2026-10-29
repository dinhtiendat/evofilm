import { Spin, Tag, Tooltip } from 'antd'
import { VideoCameraAddOutlined } from '@ant-design/icons'
import type { ShotRead, ShotVideoReadinessRead } from '../../../../services/generated'

type ChapterStudioVideoReadinessPanelProps = {
  selectedShot: ShotRead | null
  videoReadinessLoading: boolean
  videoReadiness: ShotVideoReadinessRead | null
  videoReferenceMode: string
}

export function ChapterStudioVideoReadinessPanel({
  selectedShot,
  videoReadinessLoading,
  videoReadiness,
  videoReferenceMode,
}: ChapterStudioVideoReadinessPanelProps) {
  return (
    <div className="cs-group">
      <div className="cs-group-title">
        <VideoCameraAddOutlined /> Độ sẵn sàng tạo video
      </div>
      <div className="cs-hint">Ở đây trước hết trả lời phân cảnh hiện tại có thể tạo video không, và còn thiếu những điều kiện trước nào.</div>
      {videoReadinessLoading ? (
        <div className="py-6 text-center">
          <Spin />
        </div>
      ) : !selectedShot ? (
        <div className="text-xs text-gray-400">Vui lòng chọn một phân cảnh trước.</div>
      ) : !videoReadiness ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Tạm thời không thể lấy độ sẵn sàng tạo video của phân cảnh hiện tại, vui lòng thử lại sau.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-900">
                {videoReadiness.ready ? 'Phân cảnh hiện tại đã đáp ứng điều kiện tạo video' : 'Phân cảnh hiện tại chưa thể tạo video trực tiếp'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Hiện đang kiểm tra điều kiện tạo video theo chế độ tham chiếu <Tag className="!mx-1">{videoReferenceMode}</Tag>.
              </div>
            </div>
            <Tag color={videoReadiness.ready ? 'green' : 'gold'}>
              {videoReadiness.ready ? 'Có thể tạo' : 'Còn thiếu'}
            </Tag>
          </div>

          <div className="flex flex-wrap gap-2">
            {(videoReadiness.checks ?? []).map((check) => (
              <Tooltip key={check.key} title={check.message}>
                <Tag color={check.ok ? 'green' : 'default'}>
                  {check.ok ? 'Đạt' : 'Chưa đạt'} · {check.key}
                </Tag>
              </Tooltip>
            ))}
          </div>

          {(videoReadiness.checks ?? []).some((check) => !check.ok) ? (
            <div className="space-y-1">
              {(videoReadiness.checks ?? []).filter((check) => !check.ok).map((check) => (
                <div key={check.key} className="text-xs text-gray-600">
                  • {check.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
