"""Hợp đồng đầu vào/đầu ra dùng chung cho tạo video."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.contracts.provider import ProviderKey


def _strip_optional_b64(value: str | None) -> str | None:
    if value is None:
        return None
    s = value.strip()
    return s if s else None


VideoRatio = Literal["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]


class VideoGenerationInput(BaseModel):
    """Đầu vào tạo video: hỗ trợ prompt văn bản + ba loại ảnh khung hình tham chiếu tùy chọn (base64 thuần hoặc data URL)."""

    model_config = ConfigDict(extra="forbid")

    prompt: Optional[str] = Field(None, description="Prompt văn bản; có thể chọn một trong hai với ảnh tham chiếu hoặc đồng thời tồn tại")

    first_frame_base64: Optional[str] = Field(None, description="Ảnh khung hình đầu: base64 thuần hoặc data:image/...;base64,...")
    last_frame_base64: Optional[str] = Field(None, description="Ảnh khung hình cuối: base64 thuần hoặc data URL")
    key_frame_base64: Optional[str] = Field(None, description="Ảnh khung hình chính: base64 thuần hoặc data URL")

    model: Optional[str] = Field(None, description="tên mô hình video (tùy chọn, truyền minh thị cho nhà cung cấp)")
    ratio: VideoRatio = Field(..., description="tỷ lệ khung hình video, tham số chính duy nhất ở tầng nghiệp vụ")
    seconds: Optional[int] = Field(None, description="Thời lượng (giây) (tùy chọn, nhà cung cấp truyền thẳng)")
    seed: Optional[int] = Field(
        None,
        ge=-1,
        le=4294967295,
        description="hạt giống ngẫu nhiên, -1 hoặc [0, 2^32-1], có thể khác nhau giữa provider/mô hình",
    )
    watermark: Optional[bool] = Field(None, description="Có chứa watermark không, nhà cung cấp / mô hình có thể khác nhau")

    @model_validator(mode="after")
    def require_prompt_or_any_reference(self) -> "VideoGenerationInput":
        has_prompt = bool((self.prompt or "").strip())
        has_ref = any(
            [
                _strip_optional_b64(self.first_frame_base64),
                _strip_optional_b64(self.last_frame_base64),
                _strip_optional_b64(self.key_frame_base64),
            ]
        )
        if not has_prompt and not has_ref:
            raise ValueError("Require prompt or at least one reference frame (base64)")
        return self


class VideoGenerationResult(BaseModel):
    """Kết quả tạo video: trả về URL video và/hoặc file_id."""

    model_config = ConfigDict(extra="forbid")

    url: Optional[str] = Field(None, description="URL tải video đã tạo")
    file_id: Optional[str] = Field(None, description="FileItem.id sau khi ghi vào CSDL (type=video)")
    provider_task_id: Optional[str] = Field(None, description="ID tác vụ/video phía nhà cung cấp (dùng để gỡ lỗi/truy vết)")
    provider: Optional[ProviderKey] = Field(None, description="danh định nhà cung cấp")
    status: Optional[str] = Field(None, description="Trạng thái tác vụ của nhà cung cấp")

    @model_validator(mode="after")
    def require_url_or_file_id(self) -> "VideoGenerationResult":
        if not self.url and not self.file_id:
            raise ValueError("Either url or file_id must be set")
        return self
