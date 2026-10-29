"""Hợp đồng đầu vào/đầu ra dùng chung cho tạo ảnh.。"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.contracts.provider import ProviderKey

ResponseFormat = Literal["url", "b64_json"]
ImageTargetRatio = Literal["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "3:2", "2:3"]
ImageResolutionProfile = Literal["standard", "high"]
ImagePurpose = Literal["generic", "video_reference", "asset_image"]


class InputImageRef(BaseModel):
    """Tham chiếu ảnh tham chiếu: ánh xạ thống nhất vào OpenAI images[*] và Volcano image[]."""

    model_config = ConfigDict(extra="forbid")

    file_id: Optional[str] = Field(
        None,
        description="ID tệp(dùng cho OpenAI File API; Volcano có thể bỏ qua)",
    )
    image_url: Optional[str] = Field(
        None,
        description="URL đầy đủ hoặc base64 data URL; mảng image[] của Volcengine nên dùng trường này",
    )

    @model_validator(mode="after")
    def _require_one(self) -> "InputImageRef":
        if not self.file_id and not self.image_url:
            raise ValueError("InputImageRef cần cung cấp file_id hoặc image_url, ít nhất một trong hai")
        return self


class ImageGenerationInput(BaseModel):
    """Đầu vào tạo ảnh: prompt văn bản bắt buộc, các tham số khác truyền thẳng cho nhà cung cấp."""

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(..., description="prompt: str = Field(..., description=prompt văn bản)")
    images: list[InputImageRef] = Field(
        default_factory=list,
        description="danh sách ảnh tham chiếu: khi có thì OpenAI đi /images/edits, Volcengine ánh xạ thành image[]",
    )
    model: Optional[str] = Field(None, description="Tên mô hình (ví dụ gpt-image-1.5 / doubao-seedream-*)")
    target_ratio: ImageTargetRatio | None = Field(
        None,
        description="tỷ lệ khung hình đích, dùng cho các cảnh cần đối chiếu bố cục video như khung tham chiếu video",
    )
    resolution_profile: ImageResolutionProfile | None = Field(
        None,
        description="Cấp độ độ phân giải đầu ra, ví dụ standard / high; lớp thích ứng của nhà cung cấp sẽ ánh xạ thành size cuối cùng",
    )
    purpose: ImagePurpose = Field(
        "generic",
        description="mục đích tạo, như generic / video_reference / asset_image",
    )
    size: Optional[str] = Field(
        None,
        description="Độ phân giải, ví dụ 1024x1024 / 1024x1536; tùy chọn khác nhau giữa các nhà cung cấp",
    )
    n: int = Field(
        1,
        ge=1,
        le=10,
        description="số lượng ảnh sinh; một số mô hình chỉ hỗ trợ n=1 (phía gọi cần đối chiếu ràng buộc trong tài liệu)",
    )
    seed: Optional[int] = Field(
        None,
        description="Seed ngẫu nhiên; Volcengine ImageGenerations hỗ trợ tham số này, OpenAI hiện bỏ qua",
    )
    watermark: Optional[bool] = Field(
        None,
        description="Có bao gồm watermark không, nhà cung cấp/mô hình có thể khác nhau",
    )
    response_format: ResponseFormat = Field(
        "url",
        description="định dạng trả về: url hoặc b64_json (ngữ nghĩa OpenAI); Volcengine có thể bỏ qua hoặc chỉ hỗ trợ url",
    )

    @model_validator(mode="after")
    def _strip_and_validate_prompt(self) -> "ImageGenerationInput":
        self.prompt = self.prompt.strip()
        if not self.prompt:
            raise ValueError("prompt raise ValueError(prompt không được để trống)")
        return self


class ImageItem(BaseModel):
    """Kết quả một ảnh đơn.。"""

    url: Optional[str] = Field(None, description="url: Optional[str] = Field(None, description=URL của ảnh) URL")
    b64_json: Optional[str] = Field(None, description="Nội dung mã hóa base64 (không gồm tiền tố data URI)")

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def _require_one_field(self) -> "ImageItem":
        if not self.url and not self.b64_json:
            raise ValueError("Either url or b64_json must be set")
        return self


class ImageGenerationResult(BaseModel):
    """Kết quả thống nhất tạo hình ảnh.。"""

    model_config = ConfigDict(extra="ignore")

    images: list[ImageItem] = Field(..., description="images: list[ImageItem] = Field(..., description=Danh sách ảnh)")
    provider: ProviderKey = Field(..., description="provider: ProviderKey = Field(..., description=Nhận diện nhà cung cấp: openai | volcengine)：openai | volcengine")
    provider_task_id: Optional[str] = Field(
        None,
        description="ID tác vụ nội bộ của nhà cung cấp (nếu có), dùng để gỡ lỗi/truy vết",
    )
    status: Optional[str] = Field(
        None,
        description="Trạng thái tác vụ của nhà cung cấp (giao diện đồng bộ thường là succeeded/created, v.v.)",
    )

    @model_validator(mode="after")
    def _require_images(self) -> "ImageGenerationResult":
        if not self.images:
            raise ValueError("images raise ValueError(images không được để trống)")
        return self
