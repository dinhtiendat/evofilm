"""Phân tích thiếu thông tin trang phục: schema đầu ra có cấu trúc."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict


class CostumeInfoAnalysisResult(BaseModel):
    """dựa theo mô tả trang phục/đạo cụ nguyên văn, phân tích thông tin thiếu, và đưa ra mô tả trang phục có thể sinh sau tối ưu."""

    model_config = ConfigDict(extra="forbid")

    issues: List[str]
    optimized_description: str


__all__ = ["CostumeInfoAnalysisResult"]

