"""Thích ứng lối vào pytest ở cấp gốc repository.

Tác dụng:
- khi chạy pytest từ thư mục gốc repo, tự động thêm backend/ vào sys.path
- Tránh việc cấu hình kiểm thử chỉ hiệu lực khi chạy trong thư mục backend/
"""

from __future__ import annotations

import asyncio
import inspect
import sys
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parent / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def pytest_configure(config: pytest.Config) -> None:
    """Bù marker asyncio khi chạy pytest ở thư mục gốc."""
    config.addinivalue_line("markers", "asyncio: mark test as asyncio coroutine")


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """Khi chạy ở thư mục gốc kho, cung cấp bộ thực thi nhẹ cho kiểm thử async.

    Giải thích:
    - Thư mục backend/ thường dùng môi trường kiểm thử đầy đủ hơn;
    - Khi chạy `uv run pytest backend/tests ...` ở thư mục gốc, có thể pytest-asyncio chưa được cài;
    - Dùng asyncio.run làm dự phòng để thực thi coroutine test, tránh ca không đồng bộ bị bỏ qua.
    """

    if not inspect.iscoroutinefunction(pyfuncitem.obj):
        return None

    funcargs = {
        arg: pyfuncitem.funcargs[arg]
        for arg in pyfuncitem._fixtureinfo.argnames
        if arg in pyfuncitem.funcargs
    }
    asyncio.run(pyfuncitem.obj(**funcargs))
    return True
