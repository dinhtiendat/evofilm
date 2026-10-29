from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GenerationBaseDraft(BaseModel):
    """Giá trị thật cơ bản trong chuẩn bị tạo."""

    kind: str = Field(..., description="Loại tạo, ví dụ frame / video / asset_image")


class GenerationContext(BaseModel):
    """Bối cảnh động (dynamic context) dùng cho lần tạo này."""

    kind: str = Field(..., description="Loại tạo, ví dụ frame / video / asset_image")


class GenerationDerivedPreview(BaseModel):
    """Kết quả xem trước suy ra từ trị nền và ngữ cảnh."""

    kind: str = Field(..., description="Loại tạo, ví dụ frame / video / asset_image")
    warnings: list[str] = Field(default_factory=list, description="Cảnh báo nhẹ phát sinh ở giai đoạn suy luận")
    quality_checks: dict[str, Any] | None = Field(default=None, description="Kết quả kiểm tra chất lượng")
    debug_context: dict[str, Any] | None = Field(default=None, description="Ngữ cảnh gỡ lỗi")


class GenerationSubmissionPayload(BaseModel):
    """Tải (payload) cuối cùng thực sự gửi tới mô hình."""

    kind: str = Field(..., description="Loại tạo, ví dụ frame / video / asset_image")
    prompt: str = Field(..., description="Prompt cuối cùng gửi cho mô hình")
    images: list[str] = Field(default_factory=list, description="file_id ảnh tham chiếu gửi theo trình tự")
    extra: dict[str, Any] = Field(default_factory=dict, description="Bối cảnh gửi kèm bổ sung")

