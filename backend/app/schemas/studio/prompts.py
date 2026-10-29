"""Schemas Pydantic liên quan đến mẫu prompt."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.studio import PromptCategory


class PromptCategoryOptionRead(BaseModel):
    """Tùy chọn hạng mục prompt (giá trị enum + nhãn tiếng Trung + mô tả ngắn)."""

    value: PromptCategory = Field(..., description="Giá trị mã hạng mục")
    label: str = Field(..., description="tên tiếng Việt")
    description: str = Field("", description="giới thiệu hạng mục")


class PromptTemplateCreate(BaseModel):
    """tạo mẫu prompt. id do phía sau tự động sinh；is_system không do client đặt."""

    category: PromptCategory = Field(..., description="Danh mục mẫu")
    name: str = Field(..., description="Tên mẫu")
    content: str = Field(..., description="Nội dung mẫu")
    preview: str = Field("", description="câu chữ preview")
    variables: list[str] = Field(default_factory=list, description="Danh sách tên biến")
    is_default: bool = Field(False, description="Có phải là prompt mặc định")


class PromptTemplateUpdate(BaseModel):
    """Cập nhật cục bộ mẫu prompt. Không gồm id / is_system."""

    name: str | None = Field(None, description="Tên mẫu")
    content: str | None = Field(None, description="Nội dung mẫu")
    preview: str | None = Field(None, description="Mô tả xem trước")
    variables: list[str] | None = Field(None, description="Danh sách tên biến (thay thế toàn bộ)")
    is_default: bool | None = Field(None, description="liệu là prompt mặc định hay không")


class PromptTemplateRead(BaseModel):
    """Đọc mẫu prompt (đủ mọi trường)."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="ID mẫu")
    category: PromptCategory = Field(..., description="Danh mục mẫu")
    name: str = Field(..., description="Tên mẫu")
    preview: str = Field(..., description="câu chữ preview")
    content: str = Field(..., description="Nội dung mẫu")
    variables: list[str] = Field(..., description="Danh sách tên biến")
    is_default: bool = Field(..., description="Có phải là prompt mặc định")
    is_system: bool = Field(..., description="Có phải do hệ thống cài đặt sẵn không")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật cuối")

