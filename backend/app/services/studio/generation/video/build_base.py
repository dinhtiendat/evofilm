from __future__ import annotations

from app.services.studio.generation.shared.types import GenerationBaseDraft


class VideoBaseDraft(GenerationBaseDraft):
    """Giá trị thật cơ bản cho tạo video."""

    kind: str = "video"
    shot_id: str
    prompt: str


def build_video_base_draft(
    *,
    shot_id: str,
    prompt: str | None,
) -> VideoBaseDraft:
    return VideoBaseDraft(
        shot_id=shot_id,
        prompt=(prompt or "").strip(),
    )
