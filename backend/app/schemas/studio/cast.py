"""schemas của diễn viên/nhân vật và bảng liên kết."""

from __future__ import annotations

from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.studio import ProjectStyle, ProjectVisualStyle


class ActorBase(BaseModel):
    id: str = Field(..., description="ID diễn viên")
    name: str = Field(..., description="Tên")
    description: str = Field("", description="Mô tả")
    tags: list[str] = Field(default_factory=list, description="Nhãn")
    prompt_template_id: str | None = Field(None, description="Mẫu prompt ID(để trống được)")
    view_count: int = Field(1, ge=1, description="Số hình ảnh góc nhìn dự kiến tạo cho diễn viên này (không gồm khung phân cảnh)")
    style: ProjectStyle = Field(ProjectStyle.real_people_city, description="Thể loại/phong cách")
    visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description="Hình thức biểu diễn hình ảnh (thật / hoạt hình v.v.)")


class ActorCreate(ActorBase):
    project_id: str | None = Field(None, description="Tùy chọn: sau khi tạo thành công ghi vào project_actor_links (cùng giao dịch với việc tạo diễn viên)")
    chapter_id: str | None = Field(None, description="Tùy chọn: ID chương")
    shot_id: str | None = Field(None, description="Tùy chọn: phân cảnh ID")

    @field_validator("project_id", "chapter_id", "shot_id", mode="before")
    @classmethod
    def _blank_link_ids(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @model_validator(mode="after")
    def _link_scope(self) -> Self:
        if self.chapter_id and not self.project_id:
            raise ValueError("project_id is required when chapter_id is set")
        if self.shot_id and not self.project_id:
            raise ValueError("project_id is required when shot_id is set")
        return self


class ActorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    prompt_template_id: str | None = None
    view_count: int | None = Field(None, ge=1)
    style: ProjectStyle | None = None
    visual_style: ProjectVisualStyle | None = None


class ActorRead(ActorBase):
    model_config = ConfigDict(from_attributes=True)

    thumbnail: str = Field("", description="Đường dẫn tải ảnh thu nhỏ")


class CharacterBase(BaseModel):
    id: str = Field(..., description="ID nhân vật")
    project_id: str = Field(..., description="dự án thuộc ID")
    name: str = Field(..., description="tên nhân vật")
    description: str = Field("", description="Mô tả nhân vật")
    style: ProjectStyle = Field(ProjectStyle.real_people_city, description="Thể loại/phong cách")
    visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description="Hình thức thể hiện hình ảnh (thực tế/hoạt hình...)")
    actor_id: str | None = Field(None, description="ID diễn viên (để trống được; dùng khi chỉ nhập nội dung nhân vật mà không liên kết diễn viên)")
    costume_id: str | None = Field(None, description="ID trang phục (để trống được)")


class CharacterCreate(CharacterBase):
    chapter_id: str | None = Field(None, description="Tùy chọn: ID chương")
    shot_id: str | None = Field(None, description="Tùy chọn: ID phân cảnh tự động gắn khi tạo thành công")

    @field_validator("project_id", "chapter_id", "shot_id", mode="before")
    @classmethod
    def _blank_link_ids(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @model_validator(mode="after")
    def _link_scope(self) -> Self:
        if self.chapter_id and not self.project_id:
            raise ValueError("project_id is required when chapter_id is set")
        if self.shot_id and not self.project_id:
            raise ValueError("project_id is required when shot_id is set")
        return self


class CharacterUpdate(BaseModel):
    project_id: str | None = None
    name: str | None = None
    description: str | None = None
    style: ProjectStyle | None = None
    visual_style: ProjectVisualStyle | None = None
    actor_id: str | None = None
    costume_id: str | None = None


class CharacterRead(CharacterBase):
    model_config = ConfigDict(from_attributes=True)

    thumbnail: str = Field("", description="Đường dẫn tải ảnh thu nhỏ")


class CharacterPropLinkBase(BaseModel):
    id: int = Field(..., description="ID hàng liên kết")
    character_id: str = Field(..., description="Nhân vật ID")
    prop_id: str = Field(..., description="ID đạo cụ")
    index: int = Field(0, description="thứ tự đạo cụ của nhân vật")
    note: str = Field("", description="Ghi chú")


class CharacterPropLinkCreate(BaseModel):
    character_id: str
    prop_id: str
    index: int = 0
    note: str = ""


class CharacterPropLinkUpdate(BaseModel):
    index: int | None = None
    note: str | None = None


class CharacterPropLinkRead(CharacterPropLinkBase):
    model_config = ConfigDict(from_attributes=True)


class ShotCharacterLinkBase(BaseModel):
    id: int = Field(..., description="ID hàng liên kết")
    shot_id: str = Field(..., description="ID phân cảnh")
    character_id: str = Field(..., description="Nhân vật ID")
    index: int = Field(0, description="thứ tự nhân vật trong shot")
    note: str = Field("", description="Ghi chú")


class ShotCharacterLinkCreate(BaseModel):
    shot_id: str
    character_id: str
    index: int = 0
    note: str = ""


class ShotCharacterLinkUpdate(BaseModel):
    index: int | None = None
    note: str | None = None


class ShotCharacterLinkRead(ShotCharacterLinkBase):
    model_config = ConfigDict(from_attributes=True)
