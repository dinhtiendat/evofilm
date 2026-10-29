"""Dịch vụ phụ trợ mốc hành động phân cảnh.。

Module này chịu trách nhiệm suy luận giai đoạn nhẹ cho `ShotDetail.action_beats`, hỗ trợ khung hình chính và đường link video
Không đưa vào mô hình cấu trúc phức tạp, vẫn phân biệt ổn định hơn:

- trigger: Kích hoạt / phản ứng ban đầu
- peak: Đỉnh hành động / giai đoạn kịch tính cao nhất
- aftermath: Trạng thái kết quả / giai đoạn khép lại
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


ActionBeatPhase = Literal["trigger", "peak", "aftermath"]

_TRIGGER_KEYWORDS = (
    "nghe thấy",
    "nhìn thấy",
    "thấy",
    "phát hiện",
    "nhận ra",
    "đột ngột",
    "đột nhiên",
    "vừa",
    "bắt đầu",
    "lần đầu",
    "tiếng lạ",
    "tách",
    "vang lên",
    "đẩy cửa",
    "quay đầu",
    "quay lại",
)

_AFTERMATH_KEYWORDS = (
    "thở gấp",
    "thở dốc",
    "dư âm",
    "dừng lại",
    "dừng",
    "đứng yên",
    "cúi",
    "ngã",
    "giữ",
    "khôi phục",
    "nhìn về",
    "sóng sau",
    "khép lại",
)

_PEAK_KEYWORDS = (
    "rơi khỏi tay",
    "rơi",
    "áp dụng",
    "che",
    "che tai",
    "quỳ xuống",
    "vồ tới",
    "xông",
    "giơ lên",
    "vung",
    "đối đầu",
    "bùng nổ",
    "đơ cứng",
    "chìm xuống",
    "hạ xuống",
)


@dataclass(frozen=True, slots=True)
class ActionBeatPhaseItem:
    """Kết quả suy luận giai đoạn của một mốc hành động.。"""

    text: str
    phase: ActionBeatPhase


def _count_hits(text: str, keywords: tuple[str, ...]) -> int:
    """Đếm số từ khóa giai đoạn khớp trong một đoạn văn bản (không phân biệt hoa thường)."""
    lowered = str(text or "").lower()
    return sum(1 for keyword in keywords if keyword.lower() in lowered)


def infer_action_beat_phase(*, text: str, index: int, total: int) -> ActionBeatPhase:
    """Suy luận giai đoạn cho một mốc hành động đơn lẻ.。

    Thứ tự ưu tiên quy tắc:：
    1. Từ khóa aftermath rõ ràng
    2. Từ khóa trigger rõ ràng
    3. Từ khóa peak rõ ràng
    4. 4. Dự phòng theo vị trí:：
       - - Mặc định: điều đầu tiên là trigger trigger
       - Mốc cuối mặc định aftermath (tổng số >= 3)
       - - Phần còn lại mặc định peak peak
    """

    normalized = str(text or "").strip()
    if not normalized:
        return "peak"

    aftermath_hits = _count_hits(normalized, _AFTERMATH_KEYWORDS)
    trigger_hits = _count_hits(normalized, _TRIGGER_KEYWORDS)
    peak_hits = _count_hits(normalized, _PEAK_KEYWORDS)

    if aftermath_hits > 0 and aftermath_hits >= max(trigger_hits, peak_hits):
        return "aftermath"
    if trigger_hits > 0 and trigger_hits >= peak_hits:
        return "trigger"
    if peak_hits > 0:
        return "peak"

    if index == 0:
        return "trigger"
    if total >= 3 and index == total - 1:
        return "aftermath"
    return "peak"


def infer_action_beat_sequence(action_beats: list[str] | None) -> list[ActionBeatPhaseItem]:
    """Chuyển danh sách mốc hành động thành chuỗi có thông tin giai đoạn.。"""
    beats = [str(item).strip() for item in list(action_beats or []) if str(item).strip()]
    total = len(beats)
    return [
        ActionBeatPhaseItem(
            text=text,
            phase=infer_action_beat_phase(text=text, index=index, total=total),
        )
        for index, text in enumerate(beats)
    ]


def pick_action_beat_for_frame(frame_type: str, action_beats: list[str] | None) -> ActionBeatPhaseItem | None:
    """Chọn theo loại khung hình hành động phù hợp nhất làm mốc hành động chính của khung hình hiện tại.。"""
    sequence = infer_action_beat_sequence(action_beats)
    if not sequence:
        return None

    if frame_type == "first":
        return next((item for item in sequence if item.phase == "trigger"), sequence[0])
    if frame_type == "last":
        return next((item for item in sequence if item.phase == "aftermath"), sequence[-1])

    peak_items = [item for item in sequence if item.phase == "peak"]
    if peak_items:
        return peak_items[-1]
    return sequence[min(len(sequence) // 2, len(sequence) - 1)]
