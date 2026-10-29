"""Schemas Pydantic liên quan đến vật liệu tệp."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class FileTypeEnum(str, Enum):
    image = "image"
    video = "video"


class FileBase(BaseModel):
    id: str = Field(..., description="ID tệp")
    type: FileTypeEnum = Field(..., description="Loại tệp")
    name: str = Field(..., description="tên tệp/tiêu đề")
    thumbnail: str = Field("", description="Ảnh thu nhỏ URL/Đường")
    tags: list[str] = Field(default_factory=list, description="Nhãn")


class FileCreate(BaseModel):
    type: FileTypeEnum
    name: str
    thumbnail: str = ""
    tags: list[str] = Field(default_factory=list)


class FileUsageWrite(BaseModel):
    """thông tin liên kết ghi vào file_usages (submit cùng với FileItem)."""

    project_id: str = Field(..., description="ID dự án")
    chapter_id: str | None = Field(None, description="ID chương")
    shot_id: str | None = Field(None, description="ID phân cảnh")
    usage_kind: str = Field(
        ...,
        description="Mục đích: shot_frame / generated_video / character_image / asset_image / upload / api v.v.",
    )
    source_ref: str | None = Field(None, description="Chìa idempotent (tùy chọn)")


class FileUsageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: str
    project_id: str
    chapter_id: str | None
    shot_id: str | None
    usage_kind: str
    source_ref: str

class FileUpdate(BaseModel):
    name: str | None = None
    thumbnail: str | None = None
    tags: list[str] | None = None
    usage: FileUsageWrite | None = Field(None, description="Nếu được cung cấp thì upsert một dòng file_usages")


class FileRead(FileBase):
    model_config = ConfigDict(from_attributes=True)


class FileDetailRead(FileRead):
    """Chứa danh sách file_usages (giao diện chi tiết)."""

    model_config = ConfigDict(from_attributes=True)

    usages: list[FileUsageRead] = Field(default_factory=list)
