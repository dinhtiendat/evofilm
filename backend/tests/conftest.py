"""fixture dùng chung cho Pytest:ứng dụng FastAPI và TestClient."""

from __future__ import annotations

import asyncio
import inspect

import pytest
from fastapi.testclient import TestClient

try:
    from app.main import app  # type: ignore
except Exception:  # noqa: BLE001
    # Trong môi trường kiểm thử, một số phụ thuộc tùy chọn (ví dụ langgraph) có thể chưa được cài.
    # đừng để toàn bộ suite test thất bại khi import conftest；chỉ bỏ qua trong test cần client.
    app = None


@pytest.fixture
def client() -> TestClient:
    """TestClient của ứng dụng FastAPI, dùng cho kiểm thử tích hợp."""
    if app is None:
        pytest.skip("Các phụ thuộc của FastAPI app chưa được thỏa mãn (ví dụ thiếu langgraph), bỏ qua test tích hợp cần client.")
    return TestClient(app)


def pytest_configure(config: pytest.Config) -> None:
    """Bổ sung marker asyncio cho môi trường kiểm thử nhẹ."""
    config.addinivalue_line("markers", "asyncio: mark test as asyncio coroutine")


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """thực thi dự phòng test không đồng bộ trong môi trường chưa cài pytest-asyncio."""

    if not inspect.iscoroutinefunction(pyfuncitem.obj):
        return None

    funcargs = {
        arg: pyfuncitem.funcargs[arg]
        for arg in pyfuncitem._fixtureinfo.argnames
        if arg in pyfuncitem.funcargs
    }
    asyncio.run(pyfuncitem.obj(**funcargs))
    return True
