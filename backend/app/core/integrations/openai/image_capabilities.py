""""Khai báo và đăng ký ghi đè năng lực ảnh OpenAI."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.integrations.image_capabilities import ImageModelCapability

if TYPE_CHECKING:
    from app.core.contracts.image_generation import ImageGenerationInput

_OPENAI_DEFAULT = ImageModelCapability(
    supports_seed=True,
    supports_watermark=True,
)

# key: tiền tố mô hình (chữ thường)
_OPENAI_MODEL_OVERRIDES: dict[str, ImageModelCapability] = {}


def register_openai_image_capability(*, model_prefix: str, capability: ImageModelCapability) -> None:
    prefix = model_prefix.strip().lower()
    if not prefix:
        raise ValueError("model_prefix must not be empty")
    _OPENAI_MODEL_OVERRIDES[prefix] = capability


def clear_openai_image_capability_overrides() -> None:
    _OPENAI_MODEL_OVERRIDES.clear()


def _pick_override(model: str | None) -> ImageModelCapability | None:
    if not model:
        return None
    value = model.strip().lower()
    if not value:
        return None
    for prefix, cap in sorted(_OPENAI_MODEL_OVERRIDES.items(), key=lambda item: len(item[0]), reverse=True):
        if value.startswith(prefix):
            return cap
    return None


def resolve_openai_image_capability(model: str | None) -> ImageModelCapability:
    return _pick_override(model) or _OPENAI_DEFAULT


def validate_openai_image_options(input_: ImageGenerationInput) -> None:
    """OpenAI Điểm vào xác thực khả năng (tránh để phía gọi truyền provider chuỗi cứng)."""
    from app.core.contracts.image_generation import ImageGenerationInput
    from app.core.integrations.image_capabilities import validate_image_options

    assert isinstance(input_, ImageGenerationInput)
    validate_image_options(provider="openai", model=input_.model, input_=input_)
