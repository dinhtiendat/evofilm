"""image_tasks Kiểm tra vỏ phản hồi API của image_tasks.。"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient

from app.api.v1.routes.studio import image_tasks as route
from app.dependencies import get_db
from app.main import app


class _DummyDB:
    async def get(self, *_args, **_kwargs):
        return None

    async def execute(self, *_args, **_kwargs):
        class _Result:
            def scalars(self):
                class _Scalars:
                    def first(self):
                        return None

                return _Scalars()

        return _Result()

    def add(self, *_args, **_kwargs):
        return None

    async def flush(self):
        return None

    async def refresh(self, *_args, **_kwargs):
        return None


def _override_db(db: _DummyDB):
    async def _get_db() -> AsyncGenerator[_DummyDB, None]:
        yield db

    return _get_db


def test_create_actor_image_task_requires_prompt(client: TestClient) -> None:
    db = _DummyDB()
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/actors/actor-1/image-tasks",
            json={"image_id": 1, "prompt": "   ", "images": []},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json() == {
        "code": 400,
        "message": "prompt is required for actor generation",
        "data": None,
        "meta": None,
    }


def test_render_actor_image_prompt_returns_success_envelope(client: TestClient, monkeypatch) -> None:
    db = _DummyDB()

    class _Base:
        prompt = "Prompt diễn viên cơ bản"
        default_images = ["file-1", "file-2"]
        entity_type = "actor"
        entity_id = "actor-1"
        relation_type = "actor_image"
        relation_entity_id = "1"

    class _Derived:
        prompt = "Prompt diễn viên sau render"
        images = ["file-1", "file-2"]

    async def _fake_build_base(*_args, **_kwargs):
        return _Base()

    def _fake_derive(*_args, **_kwargs):
        return _Derived()

    monkeypatch.setattr(route, "_build_actor_image_base_draft_service", _fake_build_base)
    monkeypatch.setattr(route, "_derive_asset_image_preview_service", _fake_derive)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/actors/actor-1/render-prompt",
            json={"image_id": 1, "images": []},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert body["message"] == "success"
    assert body["data"]["prompt"] == "Prompt diễn viên sau render"
    assert body["data"]["images"] == ["file-1", "file-2"]


def test_create_shot_frame_image_task_requires_prompt(client: TestClient) -> None:
    db = _DummyDB()
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/shot/shot-1/frame-image-tasks",
            json={"frame_type": "first", "prompt": "   ", "target_ratio": "16:9", "images": []},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json() == {
        "code": 400,
        "message": "prompt is required for shot frame generation",
        "data": None,
        "meta": None,
    }


def test_render_shot_frame_prompt_returns_success_envelope_when_prompt_given(client: TestClient, monkeypatch) -> None:
    db = _DummyDB()
    async def _fake_load_frame_render_guidance(**_kwargs):
        return {
            "director_command_summary": "Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính",
            "continuity_guidance": "Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, đừng như một cảnh hoàn toàn mới mở đầu lại",
            "frame_specific_guidance": "Khung hình đầu chỉ thể hiện phản ứng đơ cứng ban đầu sau khi tiếng động bất ngờ xuất hiện, nhân vật chưa hoàn thành động tác che tai và cúi",
            "composition_anchor": "Lấy khung cửa nhà kính và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng lúc đọc được",
            "screen_direction_guidance": "Giữ phương hướng nhìn từ Lục Viễn đến lối vào môi trường ổn định, tránh đảo hướng nhìn không lý do",
        }

    monkeypatch.setattr(route, "_load_frame_render_guidance", _fake_load_frame_render_guidance)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/shot/shot-1/frame-render-prompt",
            json={
                "frame_type": "first",
                "prompt": "Tạo khung hình đầu căng thẳng",
                "images": [
                    {"type": "character", "id": "char-1", "name": "Lục Viễn", "file_id": "file-1"},
                    {"type": "scene", "id": "scene-1", "name": "Nhà kính", "file_id": "file-2"},
                ],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert body["message"] == "success"
    assert body["data"]["base_prompt"] == "Tạo khung hình đầu căng thẳng"
    assert body["data"]["selected_guidance"] == [
        "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính",
        "Trách nhiệm khung hình hiện tại: Khung hình đầu chỉ thể hiện phản ứng đơ cứng ban đầu sau khi tiếng động bất ngờ xuất hiện, nhân vật chưa hoàn thành động tác che tai và cúi",
        "Yêu cầu tính liên tục: Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, đừng như một cảnh hoàn toàn mới mở đầu lại",
    ]
    assert body["data"]["dropped_guidance"] == [
        "Mỏ neo bố cục: Lấy khung cửa nhà kính và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng lúc đọc được",
        "Hướng và ánh nhìn: Giữ phương hướng nhìn từ Lục Viễn đến lối vào môi trường ổn định, tránh đảo hướng nhìn không lý do",
    ]
    assert body["data"]["selected_guidance_details"][1]["reason_tag"] == "Khung hình đầu giữ thứ tự thời gian"
    assert body["data"]["selected_guidance_details"][1]["reason"] == "hiện là khung hình đầu, hệ thống ưu tiên giữ ràng buộc khoảnh khắc kích hoạt và trạng thái chưa hoàn thành, tránh khung nhảy thẳng vào hành động hoàn tất sau."
    assert body["data"]["dropped_guidance_details"][0]["reason_tag"] == "Khung hình đầu giáng bố cục"
    assert body["data"]["dropped_guidance_details"][1]["reason_tag"] == "Khung hình đầu hạ trục kịch"
    assert body["data"]["images"] == ["file-1", "file-2"]
    assert body["data"]["mappings"] == [
        {"token": "图1", "type": "character", "id": "char-1", "name": "Lục Viễn", "file_id": "file-1"},
        {"token": "图2", "type": "scene", "id": "scene-1", "name": "Nhà kính", "file_id": "file-2"},
    ]
    assert "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính" in body["data"]["rendered_prompt"]
    assert "Trách nhiệm khung hình hiện tại: Khung hình đầu chỉ thể hiện phản ứng đơ cứng ban đầu sau khi tiếng động bất ngờ xuất hiện, nhân vật chưa hoàn thành động tác che tai và cúi" in body["data"]["rendered_prompt"]
    assert "Yêu cầu tính liên tục: Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, đừng như một cảnh hoàn toàn mới mở đầu lại" in body["data"]["rendered_prompt"]
    assert "Mỏ neo bố cục: Lấy khung cửa nhà kính và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng lúc đọc được" not in body["data"]["rendered_prompt"]
    assert "Hướng và ánh nhìn: Giữ phương hướng nhìn từ Lục Viễn đến lối vào môi trường ổn định, tránh đảo hướng nhìn không lý do" not in body["data"]["rendered_prompt"]
    assert "图1: Lục Viễn" in body["data"]["rendered_prompt"]
    assert "图2: Nhà kính" in body["data"]["rendered_prompt"]
    assert "Tạo khung hình đầu căng thẳng" in body["data"]["rendered_prompt"]


def test_render_shot_frame_prompt_requires_prompt(client: TestClient) -> None:
    db = _DummyDB()
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/shot/shot-1/frame-render-prompt",
            json={
                "frame_type": "first",
                "prompt": "",
                "images": [],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422


def test_create_shot_frame_image_task_renders_prompt_before_submit(client: TestClient, monkeypatch) -> None:
    class _ShotDetailDB(_DummyDB):
        async def get(self, model, ident):
            if getattr(model, "__name__", "") == "ShotDetail" and ident == "shot-1":
                return object()
            return None

    db = _ShotDetailDB()

    async def _fake_resolve_image_refs(*_args, **_kwargs):
        return [{"image_url": "data:image/png;base64,abc"}]

    async def _fake_load_frame_render_guidance(**_kwargs):
        return {
            "director_command_summary": "Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính",
            "continuity_guidance": "Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, đừng như một cảnh hoàn toàn mới mở đầu lại",
            "frame_specific_guidance": "Khung hình đầu chỉ thể hiện phản ứng đơ cứng ban đầu sau khi tiếng động bất ngờ xuất hiện, nhân vật chưa hoàn thành động tác che tai và cúi",
            "composition_anchor": "Lấy khung cửa nhà kính và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng lúc đọc được",
            "screen_direction_guidance": "Giữ phương hướng nhìn từ Lục Viễn đến lối vào môi trường ổn định, tránh đảo hướng nhìn không lý do",
        }

    async def _fake_create_image_task_and_link(*_args, **kwargs):
        assert kwargs["prompt"].startswith("## Diễn giải nội dung hình ảnh")
        assert "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính" in kwargs["prompt"]
        assert "Trách nhiệm khung hình hiện tại: Khung hình đầu chỉ thể hiện phản ứng đơ cứng ban đầu sau khi tiếng động bất ngờ xuất hiện, nhân vật chưa hoàn thành động tác che tai và cúi" in kwargs["prompt"]
        assert "Yêu cầu tính liên tục: Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, đừng như một cảnh hoàn toàn mới mở đầu lại" in kwargs["prompt"]
        assert "Mỏ neo bố cục: Lấy khung cửa nhà kính và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng lúc đọc được" not in kwargs["prompt"]
        assert "Hướng và ánh nhìn: Giữ phương hướng nhìn từ Lục Viễn đến lối vào môi trường ổn định, tránh đảo hướng nhìn không lý do" not in kwargs["prompt"]
        assert "图1: Lục Viễn" in kwargs["prompt"]
        assert kwargs["images"] == [{"image_url": "data:image/png;base64,abc"}]
        assert kwargs["target_ratio"] == "9:16"
        assert kwargs["resolution_profile"] == "standard"
        assert kwargs["purpose"] == "video_reference"
        assert kwargs["render_context"]["images"] == ["file-1"]
        assert kwargs["render_context"]["mappings"][0]["token"] == "图1"
        assert kwargs["render_context"]["selected_guidance"][0] == "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: Khóa chặt hướng nhìn của nhân vật chính"
        assert kwargs["render_context"]["selected_guidance_details"][1]["reason_tag"] == "Khung hình đầu giữ thứ tự thời gian"
        assert kwargs["render_context"]["dropped_guidance_details"][0]["reason_tag"] == "Khung hình đầu giáng bố cục"
        assert kwargs["render_context"]["dropped_guidance_details"][1]["reason_tag"] == "Khung hình đầu hạ trục kịch"
        return "task-1"

    monkeypatch.setattr(route, "_resolve_reference_image_refs_by_file_ids_service", _fake_resolve_image_refs)
    monkeypatch.setattr(route, "_load_frame_render_guidance", _fake_load_frame_render_guidance)
    monkeypatch.setattr(route, "_create_image_task_and_link_service", _fake_create_image_task_and_link)
    app.dependency_overrides[get_db] = _override_db(db)
    try:
        response = client.post(
            "/api/v1/studio/image-tasks/shot/shot-1/frame-image-tasks",
            json={
                "frame_type": "first",
                "prompt": "Lục Viễn đứng trong nhà kính,",
                "target_ratio": "9:16",
                "resolution_profile": "standard",
                "images": [
                    {"type": "character", "id": "char-1", "name": "Lục Viễn", "file_id": "file-1"},
                ],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    body = response.json()
    assert body["data"]["task_id"] == "task-1"


def test_run_image_generation_task_persists_render_context(monkeypatch) -> None:
    from app.services.studio import image_task_runner as runner

    calls: dict[str, object] = {}

    class _FakeTaskStore:
        def __init__(self, _session):
            pass

        async def set_status(self, *_args, **_kwargs):
            return None

        async def set_progress(self, *_args, **_kwargs):
            return None

        async def set_result(self, _task_id, payload):
            calls["result_payload"] = payload

    class _FakeSession:
        async def commit(self):
            return None

        async def rollback(self):
            return None

    class _FakeSessionContext:
        async def __aenter__(self):
            return _FakeSession()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class _FakeImageTask:
        def __init__(self, *args, **kwargs):
            pass

        async def run(self):
            return None

        async def get_result(self):
            class _Result:
                def model_dump(self):
                    return {"images": [{"url": "http://example.com/a.png"}]}

            return _Result()

    async def _fake_cancel_if_requested_async(**_kwargs):
        return False

    async def _fake_persist_images_to_assets(*_args, **_kwargs):
        return None

    async def _fake_resolve_related_shot_id(*_args, **_kwargs):
        return None

    monkeypatch.setattr(runner, "SqlAlchemyTaskStore", _FakeTaskStore)
    monkeypatch.setattr(runner, "async_session_maker", lambda: _FakeSessionContext())
    monkeypatch.setattr(runner, "ImageGenerationTask", _FakeImageTask)
    monkeypatch.setattr(runner, "cancel_if_requested_async", _fake_cancel_if_requested_async)
    monkeypatch.setattr(runner, "_persist_images_to_assets", _fake_persist_images_to_assets)
    monkeypatch.setattr(runner, "_resolve_related_shot_id", _fake_resolve_related_shot_id)
    monkeypatch.setattr(runner, "log_task_event", lambda *_args, **_kwargs: None)

    import asyncio

    asyncio.run(
        runner.run_image_generation_task(
            "task-1",
            {
                "provider": "openai",
                "api_key": "k",
                "base_url": None,
                "relation_type": "shot_frame_image",
                "relation_entity_id": "1",
                "render_context": {
                    "images": ["file-1"],
                    "mappings": [{"token": "图1", "name": "Lục Viễn", "file_id": "file-1"}],
                    "selected_guidance": ["lệnh đạo diễn ưu tiên cao:bắt buộc:khóa hướng nhìn của nhân vật chính"],
                    "dropped_guidance": ["Hướng nhìn và ánh mắt: giữ ổn định hướng nhìn của Lục Viễn với lối vào môi trường, tránh lật hướng vô cớ"],
                    "selected_guidance_details": [
                        {
                            "text": "Chỉ đạo đạo diễn ưu tiên cao: bắt buộc: khóa hướng nhìn của nhân vật chính",
                            "category": "summary",
                            "reason_tag": "Lệnh chính của đạo diễn",
                            "reason": "Chỉ thị đạo diễn chính luôn là ràng buộc có độ ưu tiên cao nhất, nên sẽ được ưu tiên giữ lại.",
                        }
                    ],
                    "dropped_guidance_details": [
                        {
                            "text": "Hướng và ánh nhìn: giữ hướng nhìn giữa Lục Viễn và lối vào môi trường ổn định, tránh xoay hướng vô cớ",
                            "category": "screen",
                            "reason_tag": "Giảm trục kịch ở khung hình đầu",
                            "reason": "Hiện đang ở khung hình đầu, hệ thống ưu tiên bảo toàn thiết lập không gian và quan hệ vị trí đứng, nên hạ guidance hướng nhìn xuống mức thứ yếu.",
                        }
                    ],
                },
                "input": {"prompt": "## Diễn giải nội dung hình ảnh\n图1: Lục Viễn", "model": "gpt-image-1"},
            },
        )
    )

    assert calls["result_payload"]["render_context"]["images"] == ["file-1"]
    assert calls["result_payload"]["render_context"]["selected_guidance_details"][0]["reason_tag"] == "Lệnh chính của đạo diễn"
    assert calls["result_payload"]["render_context"]["dropped_guidance_details"][0]["reason_tag"] == "Giảm trục kịch ở khung hình đầu"
