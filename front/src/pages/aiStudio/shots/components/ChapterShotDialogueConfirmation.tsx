import { Button, Input, Spin, Tooltip } from 'antd'
import { DeleteOutlined, FireOutlined, PlusOutlined, SmileOutlined } from '@ant-design/icons'
import type {
  ShotDialogLineRead,
  ShotExtractionSummaryRead,
  ShotExtractedDialogueCandidateRead,
} from '../../../../services/generated'

function dialogTitle(speaker?: string | null, target?: string | null) {
  const s = (speaker ?? '').trim() || 'Không rõ'
  const t = (target ?? '').trim() || 'Không rõ'
  return `${s} → ${t}`
}

type ChapterShotDialogueConfirmationProps = {
  extraction: ShotExtractionSummaryRead
  savedDialogLines: ShotDialogLineRead[]
  extractedDialogLines: ShotExtractedDialogueCandidateRead[]
  batchDialogAdding: boolean
  dialogLoading: boolean
  dialogDeletingIds: Record<number, boolean>
  dialogAddingKeys: Record<string, boolean>
  onAcceptAll: () => void
  onIgnoreAll: () => void
  onDeleteSavedDialogLine: (lineId: number) => void
  onUpdateSavedDialogText: (lineId: number, text: string) => void
  onAddExtractedDialogLine: (line: ShotExtractedDialogueCandidateRead) => void
  onIgnoreExtractedDialogLine: (line: ShotExtractedDialogueCandidateRead) => void
  onUpdateExtractedDialogText: (candidateId: number, text: string) => void
}

export function ChapterShotDialogueConfirmation({
  extraction,
  savedDialogLines,
  extractedDialogLines,
  batchDialogAdding,
  dialogLoading,
  dialogDeletingIds,
  dialogAddingKeys,
  onAcceptAll,
  onIgnoreAll,
  onDeleteSavedDialogLine,
  onUpdateSavedDialogText,
  onAddExtractedDialogLine,
  onIgnoreExtractedDialogLine,
  onUpdateExtractedDialogText,
}: ChapterShotDialogueConfirmationProps) {
  const pendingCount = extractedDialogLines.length
  const dialogueStatus = (() => {
    if (extraction.state === 'skipped') {
      return { text: 'đã bỏ qua', tone: 'blue' as const }
    }
    if (extraction.state === 'not_extracted') {
      return { text: 'chưa trích xuất', tone: 'gold' as const }
    }
    if ((extraction.dialogue_candidate_total ?? 0) === 0 && extraction.state === 'extracted_empty') {
      return { text: 'Đã trích xuất, không có ứng viên', tone: 'default' as const }
    }
    if (pendingCount > 0) {
      return { text: `Chờ xử lý ${pendingCount}`, tone: 'gold' as const }
    }
    return { text: 'hoàn tất', tone: 'green' as const }
  })()
  const emptyStateText =
    extraction.state === 'skipped'
      ? 'Phân cảnh hiện tại đã được đánh dấu không cần trích xuất, ứng viên lời thoại đã được xử lý như hoàn tất'
      : extraction.state === 'not_extracted'
        ? 'Trích xuất chưa được thực hiện, trước tiên nhấn “Trích xuất và làm mới ứng viên” ở phía trên'
        : extraction.state === 'extracted_empty'
          ? 'Đã chạy trích xuất, nhưng hiện chưa nhận diện được ứng viên thoại'
          : 'Hiện không có thoại nào chờ xác nhận; nếu cần, có thể trực tiếp bổ sung thoại cuối cùng'

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white">
              2.2
            </span>
            <div className="text-sm font-medium text-slate-900">Xác nhận thoại</div>
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{
                background:
                  dialogueStatus.tone === 'green'
                    ? '#dcfce7'
                    : dialogueStatus.tone === 'blue'
                      ? '#dbeafe'
                      : dialogueStatus.tone === 'default'
                        ? '#f1f5f9'
                        : '#fef3c7',
                color:
                  dialogueStatus.tone === 'green'
                    ? '#166534'
                    : dialogueStatus.tone === 'blue'
                      ? '#1d4ed8'
                      : dialogueStatus.tone === 'default'
                        ? '#475569'
                        : '#92400e',
              }}
            >
              {dialogueStatus.text}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Xử lý tại đây các ứng viên lời thoại do hệ thống trích xuất và xác nhận nội dung lời thoại cuối cùng.</div>
        </div>
        <div className="flex items-center gap-2">
          {extractedDialogLines.length > 0 ? (
            <>
              <Button size="small" loading={batchDialogAdding} onClick={onAcceptAll}>
                Chấp nhận tất cả
              </Button>
              <Button size="small" disabled={batchDialogAdding} onClick={onIgnoreAll}>
                Bỏ qua tất cả
              </Button>
            </>
          ) : null}
          {dialogLoading ? <Spin size="small" /> : null}
        </div>
      </div>

      <div className="space-y-2">
        {savedDialogLines.length === 0 && extractedDialogLines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-xs text-slate-500">
            {emptyStateText}
          </div>
        ) : null}

        {savedDialogLines.length > 0 ? (
          <div className="space-y-2">
            {savedDialogLines
              .slice()
              .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
              .map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <Tooltip title="Đã lưu">
                    <span className="mt-1 text-gray-500">
                      <SmileOutlined />
                    </span>
                  </Tooltip>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={!!dialogDeletingIds[l.id]}
                    onClick={() => onDeleteSavedDialogLine(l.id)}
                  />
                  <div className="w-36 shrink-0 text-xs text-gray-700 mt-1 truncate">
                    {dialogTitle(l.speaker_name, l.target_name)}
                  </div>
                  <Input.TextArea
                    value={l.text ?? ''}
                    onChange={(e) => onUpdateSavedDialogText(l.id, e.target.value)}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    placeholder="Nội dung thoại"
                  />
                </div>
              ))}
          </div>
        ) : null}

        {extractedDialogLines.length > 0 ? (
          <div className="space-y-2">
            {extractedDialogLines.map((l) => (
              <div key={l.id} className="flex items-start gap-2">
                <Tooltip title="Trích xuất mới">
                  <span className="mt-1 text-red-600">
                    <FireOutlined />
                  </span>
                </Tooltip>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  loading={!!dialogAddingKeys[String(l.id)]}
                  onClick={() => onAddExtractedDialogLine(l)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={!!dialogAddingKeys[String(l.id)]}
                  onClick={() => onIgnoreExtractedDialogLine(l)}
                />
                <div className="w-36 shrink-0 text-xs text-gray-700 mt-1 truncate">
                  {dialogTitle(l.speaker_name, l.target_name)}
                </div>
                <Input.TextArea
                  value={l.text ?? ''}
                  onChange={(e) => onUpdateExtractedDialogText(l.id, e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder="Nội dung thoại"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
