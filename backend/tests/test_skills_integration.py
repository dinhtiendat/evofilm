"""test tích hợp kỹ năng điện ảnh:ứng dụng FastAPI, chuỗi kỹ năng hoàn chỉnh và (tùy chọn) LLM thật."""

from __future__ import annotations

from fastapi.testclient import TestClient


# ---------- Tích hợp ứng dụng FastAPI ----------


class TestAppIntegration:
    """Kiểm thử end-to-end ứng dụng FastAPI: health check và các route hiện có."""

    def test_health_returns_ok(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"code": 200, "message": "success", "data": {"status": "ok"}}

