"""Xuất hợp đồng dùng chung của tác vụ tạo."""

from app.core.contracts.image_generation import (
    ImageGenerationInput,
    ImageGenerationResult,
    ImageItem,
    InputImageRef,
    ResponseFormat,
)
from app.core.contracts.provider import ProviderConfig, ProviderKey
from app.core.contracts.video_generation import VideoGenerationInput, VideoGenerationResult

__all__ = [
    "ProviderConfig",
    "ProviderKey",
    "VideoGenerationInput",
    "VideoGenerationResult",
    "ImageGenerationInput",
    "ImageGenerationResult",
    "ImageItem",
    "InputImageRef",
    "ResponseFormat",
]
