from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class EntityNameExistenceCheckRequest(BaseModel):
    """Kiểm tra hàng loạt tên tài nguyên trong dự án/toàn cục có tồn tại không (khớp mờ)."""

    model_config = ConfigDict(extra="forbid")

    project_id: str = Field(..., description="ID dự án (bắt buộc)", min_length=1)
    shot_id: str | None = Field(None, description="ID phân cảnh (tùy chọn; không truyền thì linked_to_shot luôn là false)")
    character_names: list[str] = Field(default_factory=list, description="Danh sách tên nhân vật")
    prop_names: list[str] = Field(default_factory=list, description="Danh sách tên đạo cụ")
    scene_names: list[str] = Field(default_factory=list, description="Danh sách tên bối cảnh")
    costume_names: list[str] = Field(default_factory=list, description="Danh sách tên trang phục")


class EntityNameExistenceItem(BaseModel):
    """Kết quả tồn tại của một tên."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="tên đầu vào (trả nguyên như vậy)")
    exists: bool = Field(..., description="Có tồn tại trong cơ sở dữ liệu không (trùng khớp mơ hồ)")
    linked_to_project: bool = Field(..., description="Đã liên kết tới dự án này chưa (đối với nhân vật tương đương với exists)")
    linked_to_shot: bool = Field(False, description="Có liên kết với shot trong yêu cầu không (false nếu chưa truyền shot_id)")
    asset_id: str | None = Field(None, description="ID tài nguyên khớp (ví dụ prop_id/scene_id/costume_id/character_id)")
    link_id: int | None = Field(None, description="Nếu đã liên kết tới dự án, là id tương ứng của Project*Link; nếu không thì để trống")


class EntityNameExistenceCheckResponse(BaseModel):
    """Kết quả kiểm tra tồn tại hàng loạt (nhóm theo loại tài nguyên)."""

    model_config = ConfigDict(extra="forbid")

    characters: list[EntityNameExistenceItem] = Field(default_factory=list)
    props: list[EntityNameExistenceItem] = Field(default_factory=list)
    scenes: list[EntityNameExistenceItem] = Field(default_factory=list)
    costumes: list[EntityNameExistenceItem] = Field(default_factory=list)

