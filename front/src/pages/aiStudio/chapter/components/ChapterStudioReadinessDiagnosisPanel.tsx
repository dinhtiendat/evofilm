import { Button, Progress, Tag, Tooltip } from 'antd'
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons'
import type { ShotRead } from '../../../../services/generated'

type ReadinessCheckKey = 'characters' | 'scene' | 'props' | 'costumes'

type ReadinessEntry = {
  id: number
  name: string
  status: 'pending' | 'linked' | 'ignored'
}

type ReadinessCheck = {
  key: ReadinessCheckKey
  label: string
  importance: string
  entries: ReadinessEntry[]
  missing: string[]
  expectedCount: number
  actualCount: number
  ignoredCount: number
  resolvedCount: number
  ready: boolean
}

type PromptAssetReadiness = {
  checks: ReadinessCheck[]
  expectedChecks: ReadinessCheck[]
  readyCount: number
  totalCount: number
  percent: number
  hasMissing: boolean
}

type ChapterStudioReadinessDiagnosisPanelProps = {
  selectedShot: ShotRead | null
  shotAssetsOverview: unknown | null
  promptAssetReadiness: PromptAssetReadiness
  promptAssetReadinessNote: string
  shotExtractStatusSource: 'idle'
  shotExtractStatusText: string
  onGoToShotEdit: () => void
  onHandleMissingAction: (kind: ReadinessCheckKey, name: string) => void
  getReadinessExistenceLabel: (kind: ReadinessCheckKey, name: string) => string | null
}

export function ChapterStudioReadinessDiagnosisPanel({
  selectedShot,
  shotAssetsOverview,
  promptAssetReadiness,
  promptAssetReadinessNote,
  shotExtractStatusSource,
  shotExtractStatusText,
  onGoToShotEdit,
  onHandleMissingAction,
  getReadinessExistenceLabel,
}: ChapterStudioReadinessDiagnosisPanelProps) {
  return (
    <div className="cs-group cs-readiness-card">
      <div className="cs-group-title">
        <CheckCircleOutlined /> Chẩn đoán xác nhận thông tin
      </div>
      <div className="cs-readiness-note">{promptAssetReadinessNote}</div>
      {selectedShot ? (
        <div className="mt-3">
          <Button icon={<EditOutlined />} onClick={onGoToShotEdit}>
            Chỉnh sửa và xác nhận phân cảnh
          </Button>
        </div>
      ) : null}
      {shotExtractStatusText ? (
        <div className={`cs-readiness-status is-${shotExtractStatusSource}`}>
          <span>{shotExtractStatusText}</span>
          <Tooltip title="Sang trang chỉnh sửa phân cảnh để xử lý trích xuất và xác nhận">
            <Button
              type="text"
              size="small"
              className="cs-readiness-status__refresh"
              icon={<EditOutlined />}
              onClick={onGoToShotEdit}
            />
          </Tooltip>
        </div>
      ) : null}

      {!selectedShot ? (
        <div className="text-xs text-gray-400 mt-3">Vui lòng chọn một phân cảnh trước.</div>
      ) : selectedShot.skip_extraction ? (
        <div className="space-y-4 mt-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="text-sm font-medium text-emerald-800">Phân cảnh hiện tại đã được đánh dấu là không cần trích xuất</div>
            <div className="text-xs text-emerald-700 mt-1">
              hệ thống sẽ xử lý trực tiếp theo "xác nhận trích xuất đã hoàn thành"；nếu cần sửa quyết định này, nên xử lý ở trang chỉnh sửa phân cảnh.
            </div>
          </div>
        </div>
      ) : !shotAssetsOverview ? (
        <div className="text-xs text-gray-400 mt-3">Phân cảnh hiện tại chưa có dữ liệu tổng quan tài nguyên khả dụng, vui lòng đến trang chỉnh sửa phân cảnh để xử lý trích xuất và xác nhận.</div>
      ) : (
        <div className="space-y-4 mt-3">
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            Ở đây chủ dùng để chẩn đoán tại sao phân cảnh hiện tại vẫn là <span className="font-medium text-slate-700">pending</span>. Nếu cần sửa kết quả trích xuất, bỏ qua ứng viên hay điều chỉnh“không cần trích xuất”, vui lòng xử lý ở trang chỉnh sửa phân cảnh.
          </div>
          <div className="cs-readiness-summary">
            <div>
              <div className="cs-readiness-summary__title">
                {promptAssetReadiness.hasMissing ? 'Hiện vẫn còn mục trích xuất chưa xác nhận' : 'Xác nhận thông tin của phân cảnh này đã hoàn tất'}
              </div>
              <div className="cs-readiness-summary__desc">
                Đã hoàn thành {promptAssetReadiness.readyCount}/{promptAssetReadiness.totalCount || 0} mục xác nhận quan trọng; nếu cần chỉnh, vui lòng xử lý ở trang chỉnh sửa phân cảnh
              </div>
            </div>
            <div className="cs-readiness-summary__progress">
              <Progress
                type="circle"
                size={68}
                percent={promptAssetReadiness.percent}
                strokeColor={promptAssetReadiness.hasMissing ? '#f59e0b' : '#10b981'}
              />
            </div>
          </div>

          <div>
            <Button icon={<EditOutlined />} onClick={onGoToShotEdit}>
              Chỉnh sửa và xác nhận phân cảnh
            </Button>
          </div>

          <div className="cs-readiness-grid">
            {promptAssetReadiness.checks.map((item) => (
              <div key={item.key} className={`cs-readiness-item ${item.ready ? 'is-ready' : 'is-missing'}`}>
                <div className="cs-readiness-item__header">
                  <span className="cs-readiness-item__label">{item.label}</span>
                  <Tag color={item.ready ? 'success' : item.expectedCount === 0 ? 'default' : 'warning'}>
                    {item.expectedCount === 0 ? 'Không có ứng viên' : item.ready ? 'Đã sẵn sàng' : `Chờ xử lý ${item.missing.length}`}
                  </Tag>
                </div>
                <div className="cs-readiness-item__meta">
                  Trích xuất được {item.expectedCount} mục, đã liên kết {item.actualCount} mục, đã bỏ qua {item.ignoredCount} mục
                </div>
                <div className="cs-readiness-item__importance">{item.importance}</div>
                {item.expectedCount > 0 ? (
                  <div className="cs-readiness-item__chips">
                    {item.entries.map((entry) => {
                      const missing = entry.status === 'pending'
                      const ignored = entry.status === 'ignored'
                      const existenceLabel = missing ? getReadinessExistenceLabel(item.key, entry.name) : null
                      return (
                        <span key={entry.id} className="cs-readiness-chip-wrap">
                          <Tag
                            color={missing ? 'orange' : ignored ? 'default' : 'green'}
                            className={missing ? 'cs-readiness-tag-action' : undefined}
                            onClick={missing ? () => onHandleMissingAction(item.key, entry.name) : undefined}
                          >
                            {missing ? `Chờ xử lý: ${entry.name}` : ignored ? `Đã bỏ qua: ${entry.name}` : entry.name}
                          </Tag>
                          {missing && existenceLabel ? (
                            <span className="cs-readiness-chip-meta">{existenceLabel}</span>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <div className="cs-readiness-item__empty">Kết quả trích xuất kịch bản của phân cảnh hiện tại chưa có loại tài nguyên ứng viên này</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
