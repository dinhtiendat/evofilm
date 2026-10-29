"""Hợp đồng loại nhà cung cấp dùng chung cho khả năng tạo."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ProviderKey = Literal["openai", "volcengine"]


@dataclass(frozen=True, slots=True)
class ProviderConfig:
    """Cấu hình nhà cung cấp cần khi thực thi tác vụ tạo."""

    provider: ProviderKey
    api_key: str
    base_url: str | None = None
