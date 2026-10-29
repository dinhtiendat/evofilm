import { useMemo, useState } from 'react'
import { Button, Tag, Tooltip } from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'

type ChecklistItem = {
  key: string
  label: string
  tone: 'success' | 'warning' | 'default'
  text: string
}

type ChapterShotPreparationGuideProps = {
  statusReady: boolean
  checklistItems: readonly ChecklistItem[]
  nextStepTitle: string
  nextStepDescription: string
  onGoToStudio: () => void
}

export function ChapterShotPreparationGuide({
  statusReady,
  checklistItems,
  nextStepTitle,
  nextStepDescription,
  onGoToStudio,
}: ChapterShotPreparationGuideProps) {
  const [expanded, setExpanded] = useState(false)

  const warningCount = useMemo(
    () => checklistItems.filter((item) => item.tone !== 'success').length,
    [checklistItems],
  )

  const summaryText = statusReady
    ? 'Đã hoàn tất chuẩn bị, có thể vào studio tiếp tục tạo.'
    : `Còn ${warningCount} mục chờ xử lý, nên tiếp tục hoàn thành chuẩn bị trước.`

  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: statusReady ? '#86efac' : '#cbd5e1',
        background: statusReady ? '#f0fdf4' : '#f8fafc',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={statusReady ? 'green' : 'gold'} className="m-0">
              {statusReady ? 'Chuẩn bị hoàn tất' : 'Chờ chuẩn bị tiếp'}
            </Tag>
            <span className="text-sm font-medium text-slate-900">{nextStepTitle}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{summaryText}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            type="text"
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Thu gọn' : 'Chi tiết'}
          </Button>
          <Tooltip title={statusReady ? 'Vào studio phân cảnh để tiếp tục khung hình chính, ảnh và tạo video.' : 'Có thể vào studio xem độ sẵn sàng tạo video trước; nếu muốn tiếp tục tạo dựng thật, nên hoàn tất mục chuẩn bị hiện tại trước.'}>
            <Button
              type={statusReady ? 'primary' : 'default'}
              size="small"
              onClick={onGoToStudio}
            >
              Vào studio
            </Button>
          </Tooltip>
        </div>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 border-t border-slate-200/70 pt-2">
          <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
            Ở đây chịu trách nhiệm chuẩn bị cho phân cảnh hiện tại: trích xuất và xác nhận tài nguyên, thoại và thông tin cơ bản. Sau khi chuẩn bị xong, vào studio phân cảnh để tiếp tục khung hình chính, ảnh và tạo video.
          </div>

          <div className="flex flex-wrap gap-2">
            {checklistItems.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border px-3 py-2 bg-white/70 min-w-[160px] flex-1"
                style={{
                  borderColor:
                    item.tone === 'success'
                      ? '#86efac'
                      : item.tone === 'warning'
                        ? '#fcd34d'
                        : '#dbeafe',
                  background:
                    item.tone === 'success'
                      ? '#f0fdf4'
                      : item.tone === 'warning'
                        ? '#fffbeb'
                        : '#f8fafc',
                }}
              >
                <div className="text-[11px] text-gray-500 mb-1">{item.label}</div>
                <div className="text-xs font-medium text-gray-900">{item.text}</div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500">{nextStepDescription}</div>
        </div>
      ) : null}
    </div>
  )
}
