"""Project/Chapter Mô hình yêu cầu/phản hồi của Project/Chapter.。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.studio import ChapterStatus, ProjectStyle, ProjectVisualStyle


PROJECT_STYLE_EXAMPLES = [x.value for x in ProjectStyle]


class ProjectBase(BaseModel):
    name: str = Field(..., description="name: str = Field(..., description=tên dự án)")
    description: str = Field("", description="description: str = Field(, description=giới thiệu dự án)")
    style: ProjectStyle = Field(..., description="Thể loại/phong cách", examples=PROJECT_STYLE_EXAMPLES)
    visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description="visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description=Hình thức biểu diễn của hình ảnh)")
    seed: int = Field(0, description="seed: int = Field(0, description=Hạt giống ngẫu nhiên)")
    unify_style: bool = Field(True, description="unify_style: bool = Field(True, description=Có thống nhất phong cách không)")
    progress: int = Field(0, description="progress: int = Field(0, description=Tỷ lệ tiến độ (0-100))（0-100）")
    default_video_ratio: str | None = Field(None, description="Tỷ lệ video mặc định cấp dự án; áp dụng khi phân cảnh không ghi đè")
    stats: dict[str, Any] = Field(default_factory=dict, description="stats: dict[str, Any] = Field(default_factory=dict, description=Thống kê tổng hợp (JSON))（JSON）")


class ProjectCreate(ProjectBase):
    id: str = Field(..., description="id: str = Field(..., description=ID dự án) ID")


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    style: ProjectStyle | None = Field(None, description="Thể loại / phong cách", examples=PROJECT_STYLE_EXAMPLES)
    visual_style: ProjectVisualStyle | None = None
    seed: int | None = None
    unify_style: bool | None = None
    progress: int | None = None
    default_video_ratio: str | None = None
    stats: dict[str, Any] | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class ChapterBase(BaseModel):
    project_id: str = Field(..., description="project_id: str = Field(..., description=dự án thuộc ID) ID")
    index: int = Field(..., description="Thứ tự của chương (duy nhất trong dự án)")
    title: str = Field(..., description="title: str = Field(..., description=tiêu đề chương)")
    summary: str = Field("", description="summary: str = Field(, description=tóm tắt chương)")
    raw_text: str = Field("", description="raw_text: str = Field(, description=nguyên văn chương)")
    condensed_text: str = Field("", description="condensed_text: str = Field(, description=Bản nguyên văn rút gọn)")
    storyboard_count: int = Field(0, description="storyboard_count: int = Field(0, description=Số phân cảnh)")
    status: ChapterStatus = Field(ChapterStatus.draft, description="status: ChapterStatus = Field(ChapterStatus.draft, description=Trạng thái chương)")


class ChapterCreate(ChapterBase):
    id: str = Field(..., description="id: str = Field(..., description=ID chương) ID")


class ChapterUpdate(BaseModel):
    project_id: str | None = None
    index: int | None = None
    title: str | None = None
    summary: str | None = None
    raw_text: str | None = None
    condensed_text: str | None = None
    storyboard_count: int | None = None
    status: ChapterStatus | None = None


class ChapterRead(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shot_count: int = Field(0, description="Số phân cảnh (tổng hợp số dòng shots)")


class StyleOption(BaseModel):
    """Lựa chọn danh sách thả dùng chung.。"""

    value: str = Field(..., description="value: str = Field(..., description=giá trị lựa chọn)")
    label: str = Field(..., description="label: str = Field(..., description=câu chữ hiển thị lựa chọn)")


class ProjectStyleOptionsRead(BaseModel):
    """Ứng viên phong cách dự án.。"""

    visual_styles: list[StyleOption] = Field(default_factory=list, description="visual_styles: list[StyleOption] = Field(default_factory=list, description=Các lựa chọn phong cách thị giác)")
    styles_by_visual_style: dict[str, list[StyleOption]] = Field(
        default_factory=dict,
        description="description=Tùy chọn phong cách video được nhóm theo phong cách trực quan,",
    )
    default_style_by_visual_style: dict[str, str] = Field(
        default_factory=dict,
        description="description=Phong cách video mặc định cho từng phong cách trực quan,",
    )
