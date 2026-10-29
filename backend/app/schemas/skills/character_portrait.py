"""Phân tích thông tin còn thiếu của hồ sơ nhân vật: schema đầu ra có cấu trúc."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict


class CharacterPortraitAnalysisResult(BaseModel):
    """Dựa mô tả nhân vật gốc, phân tích thông tin thiếu và đưa ra mô tả hồ sơ có thể tạo đã tối ưu."""

    model_config = ConfigDict(extra="forbid")

    issues: List[str]
    optimized_description: str


__all__ = ["CharacterPortraitAnalysisResult"]

