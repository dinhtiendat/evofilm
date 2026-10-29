"""Khai báo và đăng ký ghi đè năng lực video OpenAI."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.integrations.video_capabilities import ALLOWED_RATIOS, VideoModelCapability

if TYPE_CHECKING:
    from app.core.contracts.video_generation import VideoGenerationInput

_OPENAI_DEFAULT = VideoModelCapability(
    supports_seed=True,
    supports_watermark=True,
    allowed_ratios=set(ALLOWED_RATIOS),
    default_ratio="16:9",
)

# key: tiền tố mô hình (chữ thường)
_OPENAI_MODEL_OVERRIDES: dict[str, VideoModelCapability] = {}


def register_openai_video_capability(*, model_prefix: str, capability: VideoModelCapability) -> None:
    prefix = model_prefix.strip().lower()
    if not prefix:
        raise ValueError("model_prefix must not be empty")
    _OPENAI_MODEL_OVERRIDES[prefix] = capability


def clear_openai_video_capability_overrides() -> None:
    _OPENAI_MODEL_OVERRIDES.clear()


def _pick_override(model: str | None) -> VideoModelCapability | None:
    if not model:
        return None
    value = model.strip().lower()
    if not value:
        return None
    # Ưu tiên tiền tố dài nhất, tránh tiền tố chung che tiền tố cụ thể.
    for prefix, cap in sorted(_OPENAI_MODEL_OVERRIDES.items(), key=lambda item: len(item[0]), reverse=True):
        if value.startswith(prefix):
            return cap
    return None


def resolve_openai_video_capability(model: str | None) -> VideoModelCapability:
    return _pick_override(model) or _OPENAI_DEFAULT


def validate_openai_video_options(input_: VideoGenerationInput) -> None:
    """OpenAI Điểm vào xác thực khả năng (tránh để phía gọi truyền provider chuỗi cứng)."""
    from app.core.contracts.video_generation import VideoGenerationInput
    from app.core.integrations.video_capabilities import validate_video_options

    assert isinstance(input_, VideoGenerationInput)
    validate_video_options(provider="openai", model=input_.model, input_=input_)
