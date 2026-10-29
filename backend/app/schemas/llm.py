"""Pydantic Schema liên quan LLM (Provider/Model/ModelSettings)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.llm import LogLevel, ModelCategoryKey, ProviderStatus


class ProviderBase(BaseModel):
    """Các trường dùng chung của nhà cung cấp (không chứa trường nhạy cảm)."""

    name: str = Field(..., description="name: str = Field(..., description=tên nhà cung cấp)")
    base_url: str = Field(..., description="Base URL API văn bản/thông dụng")
    image_base_url: str | None = Field(None, description="Khả năng hình ảnh API Base URL(chép lên tùy chọn)")
    video_base_url: str | None = Field(None, description="Khả năng video API Base URL(chép lên tùy chọn)")
    description: str = Field("", description="description: str = Field(, description=Mô tả)")
    status: ProviderStatus = Field(
        ProviderStatus.testing,
        description="description=Trạng thái:active/testing/disabled,：active/testing/disabled",
    )
    created_by: str = Field("", description="created_by: str = Field(, description=Người tạo)")


class ProviderCreate(ProviderBase):
    """Body yêu cầu khi tạo nhà cung cấp, cho phép điền trường nhạy cảm."""

    id: str = Field(..., description="id: str = Field(..., description=nhà cung cấp ID) ID")
    api_key: str = Field("", description="API Key (nhạy cảm, không trả lại trong phản hồi)")
    api_secret: str = Field("", description="API Secret (nhạy cảm, không hiển thị lại trong phản hồi)")


class ProviderUpdate(BaseModel):
    """Trường tùy chọn khi cập nhật nhà cung cấp.。"""

    name: str | None = Field(None, description="name: str | None = Field(None, description=Tên nhà cung cấp)")
    base_url: str | None = Field(None, description="API Base URL cho văn bản / dùng chung")
    image_base_url: str | None = Field(None, description="Khả năng hình ảnh API Base URL(chép lên tùy chọn)")
    video_base_url: str | None = Field(None, description="Khả năng video API Base URL(chép lên tùy chọn)")
    description: str | None = Field(None, description="description: str | None = Field(None, description=Mô tả)")
    status: ProviderStatus | None = Field(
        None,
        description="description=Trạng thái:active/testing/disabled,：active/testing/disabled",
    )
    api_key: str | None = Field(None, description="API Key (nhạy cảm, không hiển thị ngược trong response)")
    api_secret: str | None = Field(None, description="API Secret (nhạy cảm, không hiển thị ngược trong response)")


class ProviderRead(ProviderBase):
    """thông tin nhà cung cấp trả ra đối ngoại (không chứa api_key/api_secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="id: str = Field(..., description=nhà cung cấp ID) ID")


class ProviderSupportedRead(BaseModel):
    """Danh sách khả năng nhà cung cấp do hệ thống hỗ trợ.。"""

    key: str = Field(..., description="key: str = Field(..., description=khóa ổn định của nhà cung cấp)")
    display_name: str = Field(..., description="display_name: str = Field(..., description=Tên hiển thị của nhà cung cấp)")
    aliases: list[str] = Field(default_factory=list, description="aliases: list[str] = Field(default_factory=list, description=Biệt danh có thể nhận diện)")
    supported_categories: list[ModelCategoryKey] = Field(
        default_factory=list,
        description="description=Hạng mục mô hình được hỗ trợ,",
    )
    default_base_url: str | None = Field(None, description="default_base_url: str | None = Field(None, description=API Base URL mặc định) API Base URL")
    requires_api_key: bool = Field(True, description="requires_api_key: bool = Field(True, description=liệu yêu cầu api_key hay không) api_key")
    requires_api_secret: bool = Field(False, description="requires_api_secret: bool = Field(False, description=Có yêu cầu api_secret không) api_secret")
    is_experimental: bool = Field(False, description="is_experimental: bool = Field(False, description=liệu là nhà cung cấp thử nghiệm hay không)")


class VideoGenerationOptionsRead(BaseModel):
    """Tuỳ chọn tham số tạo tương ứng với mô hình video mặc định hiện tại.。"""

    provider: str = Field(..., description="provider: str = Field(..., description=khóa ổn định của nhà cung cấp)")
    model_id: str = Field(..., description="model_id: str = Field(..., description=ID mô hình video mặc định) ID")
    model_name: str = Field(..., description="model_name: str = Field(..., description=Tên mô hình video mặc định)")
    allowed_ratios: list[str] = Field(default_factory=list, description="allowed_ratios: list[str] = Field(default_factory=list, description=Các lựa chọn tỷ lệ được phép của mô hình hiện tại)")
    default_ratio: str = Field(..., description="default_ratio: str = Field(..., description=Tỷ lệ mặc định của mô hình hiện tại)")


class ImageGenerationOptionsRead(BaseModel):
    """Tuỳ chọn spec khung hình chính tương ứng với mô hình ảnh mặc định hiện tại.。"""

    provider: str = Field(..., description="provider: str = Field(..., description=khóa ổn định của nhà cung cấp)")
    model_id: str = Field(..., description="model_id: str = Field(..., description=ID mô hình ảnh mặc định) ID")
    model_name: str = Field(..., description="model_name: str = Field(..., description=Tên mô hình ảnh mặc định)")
    supported_ratios: list[str] = Field(default_factory=list, description="supported_ratios: list[str] = Field(default_factory=list, description=Tỷ lệ đích được hỗ trợ bởi mô hình hiện tại)")
    default_resolution_profile: str = Field(..., description="default_resolution_profile: str = Field(..., description=Hạng phân giải mặc định của mô hình hiện tại)")
    ratio_size_profiles: dict[str, dict[str, str]] = Field(
        default_factory=dict,
        description="description=Kích thước pixel thu được từ ánh xạ theo tỉ lệ và bậc độ phân giải,",
    )


class ModelBase(BaseModel):
    """Trường dùng chung của mô hình.。"""

    name: str = Field(..., description="name: str = Field(..., description=tên mô hình)")
    category: ModelCategoryKey = Field(..., description="category: ModelCategoryKey = Field(..., description=Hạng mục mô hình: text/image/video)：text/image/video")
    provider_id: str = Field(..., description="provider_id: str = Field(..., description=ID nhà cung cấp sở thuộc) ID")
    params: dict[str, Any] = Field(default_factory=dict, description="params: dict[str, Any] = Field(default_factory=dict, description=Tham số mô hình (JSON))（JSON）")
    description: str = Field("", description="description: str = Field(, description=Mô tả)")
    created_by: str = Field("", description="created_by: str = Field(, description=Người tạo)")


class ModelCreate(ModelBase):
    """Thân yêu cầu tạo mô hình.。"""

    id: str = Field(..., description="id: str = Field(..., description=mô hình ID) ID")


class ModelUpdate(BaseModel):
    """Body yêu cầu cập nhật mô hình (tất cả tùy chọn)."""

    name: str | None = Field(None, description="name: str | None = Field(None, description=Tên mô hình)")
    category: ModelCategoryKey | None = Field(None, description="category: ModelCategoryKey | None = Field(None, description=Hạng mục mô hình)")
    provider_id: str | None = Field(None, description="provider_id: str | None = Field(None, description=ID nhà cung cấp sở hữu) ID")
    params: dict[str, Any] | None = Field(None, description="params: dict[str, Any] | None = Field(None, description=Tham số mô hình (JSON))（JSON）")
    description: str | None = Field(None, description="description: str | None = Field(None, description=Mô tả)")


class ModelRead(ModelBase):
    """Thông tin mô hình trả về phía ngoài.。"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="id: str = Field(..., description=mô hình ID) ID")


class ModelSettingsBase(BaseModel):
    """Trường dùng chung cài đặt toàn cục mô hình.。"""

    default_text_model_id: str | None = Field(None, description="default_text_model_id: str | None = Field(None, description=ID mô hình văn bản mặc định) ID")
    default_image_model_id: str | None = Field(None, description="default_image_model_id: str | None = Field(None, description=ID mô hình ảnh mặc định) ID")
    default_video_model_id: str | None = Field(None, description="default_video_model_id: str | None = Field(None, description=ID mô hình video mặc định) ID")
    api_timeout: int = Field(30, description="API timeout (giây)")
    log_level: LogLevel = Field(LogLevel.info, description="log_level: LogLevel = Field(LogLevel.info, description=cấp nhật ký)")


class ModelSettingsUpdate(ModelSettingsBase):
    """Body yêu cầu cập nhật hoặc lưu cấu hình toàn cục của mô hình.。"""

    pass


class ModelSettingsRead(ModelSettingsBase):
    """Cài đặt toàn cục mô hình trả về phía ngoài.。"""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="ID dòng cấu hình (thường là 1)")
