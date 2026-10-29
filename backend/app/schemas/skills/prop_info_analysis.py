"""Phân tích thiếu thông tin đạo cụ: schema đầu ra có cấu trúc."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict


class PropInfoAnalysisResult(BaseModel):
    """Dựa mô tả đạo cụ gốc, phân tích thông tin thiếu và đưa ra mô tả đạo cụ có thể tạo đã tối ưu."""

    model_config = ConfigDict(extra="forbid")

    issues: List[str]
    optimized_description: str


__all__ = ["PropInfoAnalysisResult"]

