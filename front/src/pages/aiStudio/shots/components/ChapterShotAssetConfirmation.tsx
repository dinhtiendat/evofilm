import { Button, Tag, Tooltip } from 'antd'
import { DisplayImageCard } from '../../assets/components/DisplayImageCard'
import { resolveAssetUrl } from '../../assets/utils'
import type {
  EntityNameExistenceItem,
  ShotAssetOverviewItem,
  ShotExtractionSummaryRead,
} from '../../../../services/generated'

type AssetKind = 'scene' | 'actor' | 'prop' | 'costume'
type AssetVM = {
  name: string
  thumbnail?: string | null
  id?: string | null
  file_id?: string | null
  description?: string | null
  kind: AssetKind
  status: 'linked' | 'new'
  candidateId?: number
  candidateStatus?: ShotAssetOverviewItem['candidate_status']
}

type ChapterShotAssetConfirmationProps = {
  projectId: string
  extraction: ShotExtractionSummaryRead
  unionAssets: Record<AssetKind, AssetVM[]>
  expandedKinds: Record<AssetKind, boolean>
  candidateActionIds: Record<number, boolean>
  existenceByKindName: Record<AssetKind, Record<string, EntityNameExistenceItem>>
  onToggleExpanded: (kind: AssetKind) => void
  onIgnoreCandidate: (asset: AssetVM) => void
  onHandleNewAsset: (asset: AssetVM) => void
}

function assetDetailUrl(kind: AssetKind, id: string, projectId: string) {
  if (kind === 'scene') return `/assets/scenes/${encodeURIComponent(id)}/edit`
  if (kind === 'prop') return `/assets/props/${encodeURIComponent(id)}/edit`
  if (kind === 'costume') return `/assets/costumes/${encodeURIComponent(id)}/edit`
  return `/projects/${encodeURIComponent(projectId)}/roles/${encodeURIComponent(id)}/edit`
}

export function ChapterShotAssetConfirmation({
  projectId,
  extraction,
  unionAssets,
  expandedKinds,
  candidateActionIds,
  existenceByKindName,
  onToggleExpanded,
  onIgnoreCandidate,
  onHandleNewAsset,
}: ChapterShotAssetConfirmationProps) {
  const pendingCount = Object.values(unionAssets).reduce(
    (sum, items) => sum + items.filter((item) => item.status === 'new').length,
    0,
  )
  const assetStatus = (() => {
    if (extraction.state === 'skipped') {
      return { text: 'đã bỏ qua', color: 'blue' as const }
    }
    if (extraction.state === 'not_extracted') {
      return { text: 'chưa trích xuất', color: 'gold' as const }
    }
    if ((extraction.asset_candidate_total ?? 0) === 0 && extraction.state === 'extracted_empty') {
      return { text: 'Đã trích xuất, không có ứng viên', color: 'default' as const }
    }
    if (pendingCount > 0) {
      return { text: `Chờ xử lý ${pendingCount}`, color: 'gold' as const }
    }
    return { text: 'hoàn tất', color: 'green' as const }
  })()

  const emptyStateText =
    extraction.state === 'skipped'
      ? 'Phân cảnh hiện tại đã được đánh dấu không cần trích xuất, ứng viên tài nguyên đã được xử lý như hoàn tất'
      : extraction.state === 'not_extracted'
        ? 'Trích xuất chưa được thực hiện, trước tiên nhấn “Trích xuất và làm mới ứng viên” ở phía trên'
        : extraction.state === 'extracted_empty'
          ? 'Đã chạy trích xuất, nhưng hiện chưa nhận diện được ứng viên tài nguyên'
          : 'Hiện không có ứng viên tài nguyên chờ xác nhận'

  const renderAssetCard = (asset: AssetVM) => {
    const existence = existenceByKindName[asset.kind][asset.name]
    const actionLabel = existence ? (existence.exists ? 'Liên kết' : 'Tạo mới') : '…'
    const candidateBusy = asset.candidateId ? !!candidateActionIds[asset.candidateId] : false
    const footer =
      asset.status === 'new' ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-gray-500 truncate">
            {existence
              ? existence.linked_to_project
                ? 'Có thể liên kết trong dự án'
                : existence.exists
                  ? 'Thư viện tài nguyên đã có'
                  : 'Cần tạo mới'
              : 'Đang kiểm tra…'}
          </div>
          <div className="flex items-center gap-1">
            {asset.candidateId ? (
              <Button
                size="small"
                type="text"
                danger
                loading={candidateBusy}
                onClick={() => onIgnoreCandidate(asset)}
              >
                Bỏ qua
              </Button>
            ) : null}
            <Button size="small" disabled={!existence || candidateBusy} onClick={() => onHandleNewAsset(asset)}>
              {actionLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-gray-500">Đã liên kết cho phân cảnh hiện tại</div>
      )
    return (
      <div key={`${asset.kind}:${asset.name}`} className="col-span-12 md:col-span-6 xl:col-span-3 2xl:col-span-2">
        <DisplayImageCard
          title={
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                {asset.id ? (
                  <Button
                    type="link"
                    size="small"
                    className="!p-0 !h-auto"
                    onClick={() =>
                      window.open(assetDetailUrl(asset.kind, asset.id!, projectId), '_blank', 'noopener,noreferrer')
                    }
                  >
                    <span className="truncate inline-block max-w-[140px] align-bottom">{asset.name}</span>
                  </Button>
                ) : (
                  <Tooltip title="Tài nguyên này chỉ là kết quả trích xuất, chưa lưu vào CSDL">
                    <span className="truncate inline-block max-w-[140px] text-gray-400 cursor-not-allowed align-bottom">{asset.name}</span>
                  </Tooltip>
                )}
              </div>
              {asset.status === 'linked' ? <Tag color="blue">Đã liên kết</Tag> : <Tag color="magenta">Vừa trích xuất</Tag>}
            </div>
          }
          imageUrl={resolveAssetUrl(asset.thumbnail)}
          imageAlt={asset.name}
          enablePreview
          hoverable={false}
          size="small"
          imageHeightClassName="h-24"
          footer={footer}
        />
      </div>
    )
  }

  const renderAssetGrid = (kind: AssetKind, titleLabel: string, items: AssetVM[]) => {
    const linkedItems = items.filter((item) => item.status === 'linked')
    const candidateItems = items.filter((item) => item.status === 'new')
    const expanded = expandedKinds[kind]
    const linkedVisible = expanded ? linkedItems : linkedItems.slice(0, 6)
    const candidateVisible = expanded ? candidateItems : candidateItems.slice(0, 6)
    const hiddenCount = Math.max(0, linkedItems.length + candidateItems.length - linkedVisible.length - candidateVisible.length)
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-600 font-medium">
            {titleLabel}（{items.length}）
          </div>
          {items.length > 12 ? (
            <Button type="link" size="small" onClick={() => onToggleExpanded(kind)}>
              {expanded ? 'thu gọn' : `nữa(+${hiddenCount})`}
            </Button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-xs text-slate-500">
            {emptyStateText}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium text-slate-600">Đã liên kết ({linkedItems.length})</div>
                {linkedItems.length > 0 ? <Tag color="blue">Trạng thái hiện tại</Tag> : null}
              </div>
              {linkedItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                  Phân cảnh hiện tại chưa liên kết {titleLabel}
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-2">
                  {linkedVisible.map((asset) => renderAssetCard(asset))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium text-slate-600">Ứng viên chờ xác nhận ({candidateItems.length})</div>
                {candidateItems.length > 0 ? <Tag color="magenta">Chờ xác nhận</Tag> : null}
              </div>
              {candidateItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                  Hiện không có ứng viên {titleLabel} chờ xác nhận
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-2">
                  {candidateVisible.map((asset) => renderAssetCard(asset))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white">
              2.1
            </span>
            <div className="text-sm font-medium text-slate-900">Xác nhận ứng viên tài nguyên</div>
            <Tag color={assetStatus.color} className="m-0">
              {assetStatus.text}
            </Tag>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Xử lý tại đây các ứng viên bối cảnh, nhân vật, đạo cụ và trang phục do hệ thống trích xuất.</div>
        </div>
      </div>
      <div className="space-y-4">
        {renderAssetGrid('scene', 'Bối cảnh', unionAssets.scene)}
        {renderAssetGrid('actor', 'Nhân vật', unionAssets.actor)}
        {renderAssetGrid('prop', 'Đạo cụ', unionAssets.prop)}
        {renderAssetGrid('costume', 'Trang phục', unionAssets.costume)}
      </div>
    </div>
  )
}
