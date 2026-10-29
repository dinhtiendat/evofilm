"""Phân tích thiếu thông tin bối cảnh: schema đầu ra có cấu trúc."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict


class SceneInfoAnalysisResult(BaseModel):
    """Dựa mô tả bối cảnh gốc, phân tích thông tin thiếu và đưa ra mô tả bối cảnh có thể tạo đã tối ưu."""

    model_config = ConfigDict(extra="forbid")

    issues: List[str]
    optimized_description: str


__all__ = ["SceneInfoAnalysisResult"]

