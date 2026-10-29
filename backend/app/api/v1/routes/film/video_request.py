from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field
from app.core.contracts.video_generation import VideoRatio

class VideoGenerationTaskRequest(BaseModel):
    """Yêu cầu tác vụ tạo video."""

    shot_id: str = Field(..., description="ID phân cảnh")
    reference_mode: Literal["first", "last", "key", "first_last", "first_last_key", "text_only"] = Field(
        ...,
        description="Chế độ tham chiếu: first | last | key | first_last | first_last_key | text_only",
    )
    # Bắt buộc trong chế độ văn bản; tùy chọn trong chế độ không phải văn bản, dùng làm mô tả bổ sung
    prompt: str | None = Field(None, description="Prompt video (bắt buộc khi text_only)")
    images: list[str] = Field(
        default_factory=list,
        description="Danh sách file_id của ảnh tham chiếu, số lượng phải khớp nghiêm ngặt với reference_mode",
    )

    ratio: VideoRatio = Field(..., description="tỷ lệ khung hình video, như 16:9 / 9:16")
    # seconds tự xác định từ ShotDetail.duration；thân request không nhận giá trị ghi đè.
