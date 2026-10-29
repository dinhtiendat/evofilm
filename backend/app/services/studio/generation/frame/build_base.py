from __future__ import annotations

from app.models.studio import ShotFrameType
from app.services.studio.generation.shared.types import GenerationBaseDraft


class FrameBaseDraft(GenerationBaseDraft):
    """Giá trị gốc của prompt cơ bản cho tạo ảnh khung hình phân cảnh."""

    kind: str = "frame"
    shot_id: str
    frame_type: ShotFrameType
    prompt: str
    director_command_summary: str = ""
    continuity_guidance: str = ""
    frame_specific_guidance: str = ""
    composition_anchor: str = ""
    screen_direction_guidance: str = ""


def build_frame_base_draft(
    *,
    shot_id: str,
    frame_type: ShotFrameType,
    prompt: str,
    director_command_summary: str = "",
    continuity_guidance: str = "",
    frame_specific_guidance: str = "",
    composition_anchor: str = "",
    screen_direction_guidance: str = "",
) -> FrameBaseDraft:
    """Xây dựng bản nháp cơ bản khung hình phân cảnh, kèm ràng buộc ưu tiên cao vẫn phải giữ ở giai đoạn render cuối."""
    return FrameBaseDraft(
        shot_id=shot_id,
        frame_type=frame_type,
        prompt=(prompt or "").strip(),
        director_command_summary=(director_command_summary or "").strip(),
        continuity_guidance=(continuity_guidance or "").strip(),
        frame_specific_guidance=(frame_specific_guidance or "").strip(),
        composition_anchor=(composition_anchor or "").strip(),
        screen_direction_guidance=(screen_direction_guidance or "").strip(),
    )
