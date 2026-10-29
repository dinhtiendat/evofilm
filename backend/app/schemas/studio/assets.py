"""schemas của tài nguyên (Scene/Prop/Costume) và bảng ảnh của chúng."""

from __future__ import annotations

from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.studio import AssetQualityLevel, AssetViewAngle, ProjectStyle, ProjectVisualStyle


class AssetBase(BaseModel):
    id: str = Field(..., description="ID tài nguyên")
    name: str = Field(..., description="Tên")
    description: str = Field("", description="Mô tả")
    tags: list[str] = Field(default_factory=list, description="Nhãn")
    prompt_template_id: str | None = Field(None, description="Mẫu prompt ID(để trống được)")
    view_count: int = Field(1, ge=1, description="Số hình ảnh góc nhìn dự kiến tạo cho tài nguyên này (không gồm khung phân cảnh)")
    style: ProjectStyle = Field(ProjectStyle.real_people_city, description="Thể loại/phong cách")
    visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description="Hình thức thể hiện hình ảnh (thực tế/hoạt hình...)")


class AssetCreate(BaseModel):
    id: str
    name: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    prompt_template_id: str | None = None
    view_count: int = Field(1, ge=1)
    style: ProjectStyle = ProjectStyle.real_people_city
    visual_style: ProjectVisualStyle = ProjectVisualStyle.live_action
    project_id: str | None = Field(None, description="Tùy chọn: sau khi tạo thành công ghi vào project_*_link (cùng giao dịch với việc tạo tài nguyên)")
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


class AssetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    prompt_template_id: str | None = None
    view_count: int | None = Field(None, ge=1)
    style: ProjectStyle | None = None
    visual_style: ProjectVisualStyle | None = None


class AssetRead(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    thumbnail: str = Field("", description="Đường dẫn tải ảnh thu nhỏ")


class AssetImageBase(BaseModel):
    id: int = Field(..., description="dòng hình ảnh ID")
    quality_level: AssetQualityLevel = Field(AssetQualityLevel.low, description="Cấp độ chính xác")
    view_angle: AssetViewAngle = Field(AssetViewAngle.front, description="Góc nhìn")
    file_id: str | None = Field(None, description="ID FileItem liên kết (để trống được, hỗ trợ tạo vị trí giữ trước rồi điền sau)")
    width: int | None = Field(None, description="Rộng(px)")
    height: int | None = Field(None, description="Cao(px)")
    format: str = Field("png", description="Định dạng")


class AssetImageCreate(BaseModel):
    quality_level: AssetQualityLevel = AssetQualityLevel.low
    view_angle: AssetViewAngle = AssetViewAngle.front
    file_id: str | None = None
    width: int | None = None
    height: int | None = None
    format: str = "png"


class AssetImageUpdate(BaseModel):
    quality_level: AssetQualityLevel | None = None
    view_angle: AssetViewAngle | None = None
    file_id: str | None = None
    width: int | None = None
    height: int | None = None
    format: str | None = None


class SceneRead(AssetRead):
    pass


class PropRead(AssetRead):
    pass


class CostumeRead(AssetRead):
    pass


class SceneImageRead(AssetImageBase):
    model_config = ConfigDict(from_attributes=True)

    scene_id: str


class PropImageRead(AssetImageBase):
    model_config = ConfigDict(from_attributes=True)

    prop_id: str


class CostumeImageRead(AssetImageBase):
    model_config = ConfigDict(from_attributes=True)

    costume_id: str


class CharacterImageRead(AssetImageBase):
    model_config = ConfigDict(from_attributes=True)

    character_id: str
