"""generated_video Kiểm thử vỏ phản hồi API generated_video.。"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from types import SimpleNamespace

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.routes.film import generated_video as route
from app.dependencies import get_db
from app.main import app


class _FakeTaskRecord:
    def __init__(self, task_id: str) -> None:
        self.id = task_id


class _FakeTaskManager:
    def __init__(self, *_args, **_kwargs) -> None:
        pass

    async def create(self, *_args, **_kwargs) -> _FakeTaskRecord:
        return _FakeTaskRecord("video-task-1")


class _FakeDB:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.committed = False

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        self.committed = True


async def _async_noop(*_args, **_kwargs) -> None:
    return None


def _override_db(db: _FakeDB):
    async def _get_db() -> AsyncGenerator[_FakeDB, None]:
        yield db

    return _get_db


def test_preview_video_generation_prompt_returns_success_envelope(client: TestClient, monkeypatch) -> None:
    db = _FakeDB()

    async def _fake_preview(*_args, **_kwargs):
        return "Prompt preview video", ["file-1", "file-2"], {
            "shot_id": "shot-1",
            "title": "Phân cảnh 1",
            "script_excerpt": "Nhân vật chính quay lại nhìn về phía cửa.",
            "action_beats": ["Nhân vật chính quay người", "Ánh mắt dừng lại ở cửa ra vào"],
            "action_beat_phases": [
                {"text": "Nhân vật chính quay người", "phase": "trigger"},
                {"text": "hướng nhìn dừng ở cửa", "phase": "aftermath"},
            ],
            "previous_shot_summary": "Tiêu đề: Phân cảnh không；trích đoạn kịch bản: Nhân vật chính đẩy cửa vào hành lang",
            "next_shot_goal": "Tiêu đề: Phân cảnh hai; nhân vật chính dừng hành động, giữ cảnh giác",
            "continuity_guidance": "Tiếp nối hành động của shot trước, đừng như cảnh hoàn toàn mới bắt đầu lại",
            "composition_anchor": "Lấy cửa hành lang làm mỏ neo không gian",
            "screen_direction_guidance": "Giữ liên tục hướng xoay và điểm nhìn của nhân vật chính",
            "dialogue_summary": "",
            "characters": [],
            "scene": None,
            "props": [],
            "costumes": [],
            "camera": {"camera_shot": "MS", "angle": "EYE_LEVEL", "movement": "STATIC", "duration": 4},
            "atmosphere": "Căng thẳng",
            "visual_style": "现实",
            "style": "真人都市",
            "negative_prompt": "",
        }

    monkeypatch.setattr(route, "preview_prompt_and_images", _fake_preview)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/film/tasks/video/preview-prompt",
            json={
                "shot_id": "shot-1",
                "reference_mode": "first_last",
                "prompt": "Chế tạo một phân cảnh có sức ép mạnh",
                "images": [],
                "ratio": "9:16",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert body["message"] == "success"
    assert body["data"]["prompt"] == "Prompt preview video"
    assert body["data"]["images"] == ["file-1", "file-2"]
    assert body["data"]["pack"]["previous_shot_summary"].startswith("Tiêu đề: Phân cảnh không")
    assert body["data"]["pack"]["next_shot_goal"].startswith("Tiêu đề: Phân cảnh hai")


def test_preview_video_generation_prompt_not_found_returns_api_response(
    client: TestClient, monkeypatch
) -> None:
    db = _FakeDB()

    async def _fake_preview(*_args, **_kwargs):
        raise HTTPException(status_code=404, detail="Shot not found")

    monkeypatch.setattr(route, "preview_prompt_and_images", _fake_preview)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/film/tasks/video/preview-prompt",
            json={
                "shot_id": "shot-missing",
                "reference_mode": "text_only",
                "prompt": "Chỉ tạo bằng văn bản",
                "images": [],
                "ratio": "16:9",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"code": 404, "message": "Shot not found", "data": None, "meta": None}


def test_create_video_generation_task_returns_created_envelope(client: TestClient, monkeypatch) -> None:
    db = _FakeDB()

    async def _fake_build_run_args(*_args, **_kwargs):
        return {"prompt": "return {prompt: prompt video cuối cùng, images: [file-1]}", "images": ["file-1"]}

    monkeypatch.setattr(route, "build_run_args", _fake_build_run_args)
    monkeypatch.setattr(route, "TaskManager", _FakeTaskManager)
    monkeypatch.setattr(route, "enqueue_task_execution", lambda task_id: SimpleNamespace(id=f"celery-{task_id}"))
    monkeypatch.setattr(route, "mark_shot_generating", _async_noop)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/film/tasks/video",
            json={
                "shot_id": "shot-1",
                "reference_mode": "first",
                "prompt": "prompt: Tạo một đoạn video nhịp điệu căng thẳng,",
                "images": [],
                "ratio": "9:16",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    body = response.json()
    assert body["code"] == 201
    assert body["message"] == "success"
    assert body["data"]["task_id"] == "video-task-1"
    assert body["meta"] is None
    assert db.committed is True
    assert len(db.added) == 1


def test_create_video_generation_task_validation_error_returns_api_response(client: TestClient) -> None:
    db = _FakeDB()
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/film/tasks/video",
            json={
                "shot_id": "shot-1",
                "reference_mode": "invalid-mode",
                "prompt": "bad",
                "images": [],
                "ratio": "16:9",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == 422
    assert body["data"] is None
    assert "reference_mode" in body["message"]
