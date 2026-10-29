"""Kiểm thử đơn services image_task_*."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.studio import (
    Actor,
    ActorImage,
    AssetViewAngle,
    Character,
    CharacterImage,
    Costume,
    FileItem,
    ShotFrameType,
)
from app.schemas.studio.shots import ShotLinkedAssetItem
from app.services.studio.generation.asset_image import build_base as asset_base
from app.services.studio.generation.frame.build_base import build_frame_base_draft
from app.services.studio.generation.frame.build_context import build_frame_context
from app.services.studio.generation.frame.derive_preview import derive_frame_preview
from app.services.studio.image_task_references import (
    pick_ordered_ref_file_ids,
    resolve_reference_file_ids_and_names_from_linked_items,
    resolve_reference_image_refs_by_file_ids,
)
from app.services.studio.image_task_validation import (
    validate_actor_image,
    validate_asset_image_and_relation_type,
    validate_character_image,
)


class _FakeScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeExecuteResult:
    def __init__(self, rows=None, single=None):
        self._rows = rows or []
        self._single = single

    def scalars(self):
        return _FakeScalarResult(self._rows)

    def scalar_one_or_none(self):
        return self._single


class _FakeColumn:
    def is_not(self, _value):
        return self

    def desc(self):
        return self

    def __eq__(self, _other):
        return self


class _FakeImageModel:
    actor_id = _FakeColumn()
    file_id = _FakeColumn()
    created_at = _FakeColumn()
    id = _FakeColumn()


class _FakeStmt:
    def where(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self


class _FakeDB:
    def __init__(self, mapping=None, execute_results=None):
        self.mapping = mapping or {}
        self.execute_results = list(execute_results or [])

    async def get(self, model, entity_id):
        return self.mapping.get((model, entity_id))

    async def execute(self, *_args, **_kwargs):
        if not self.execute_results:
            return _FakeExecuteResult()
        return self.execute_results.pop(0)


@pytest.mark.asyncio
async def test_validate_actor_image_returns_row_when_belongs_to_actor():
    actor = SimpleNamespace(id="actor-1")
    image = SimpleNamespace(id=1, actor_id="actor-1")
    db = _FakeDB(
        mapping={
            (Actor, "actor-1"): actor,
            (ActorImage, 1): image,
        }
    )

    row = await validate_actor_image(db, actor_id="actor-1", image_id=1)

    assert row is image


@pytest.mark.asyncio
async def test_validate_asset_image_and_relation_type_rejects_invalid_asset_type():
    db = _FakeDB()

    with pytest.raises(HTTPException) as exc:
        await validate_asset_image_and_relation_type(
            db,
            asset_type="invalid",
            asset_id="asset-1",
            image_id=1,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "asset_type must be one of: prop/scene/costume"


@pytest.mark.asyncio
async def test_validate_character_image_requires_image_id():
    character = SimpleNamespace(id="char-1")
    db = _FakeDB(mapping={(Character, "char-1"): character})

    with pytest.raises(HTTPException) as exc:
        await validate_character_image(db, character_id="char-1", image_id=None)

    assert exc.value.status_code == 400
    assert exc.value.detail == "image_id is required for character image generation"


@pytest.mark.asyncio
async def test_resolve_reference_file_ids_and_names_filters_empty_file_ids():
    items = [
        ShotLinkedAssetItem(id="a1", type="prop", name="Đạo cụ 1", file_id="file-1"),
        ShotLinkedAssetItem(id="a2", type="scene", name="", file_id="file-2"),
        ShotLinkedAssetItem(id="a3", type="costume", name="Mục bỏ qua", file_id=""),
    ]

    file_ids, names = await resolve_reference_file_ids_and_names_from_linked_items(None, items=items)

    assert file_ids == ["file-1", "file-2"]
    assert names == ["Đạo cụ 1", "a2"]


@pytest.mark.asyncio
async def test_resolve_reference_image_refs_by_file_ids_returns_data_urls(monkeypatch):
    file_obj = FileItem(id="file-1", name="sample.png", storage_key="images/sample.png")
    db = _FakeDB(mapping={(FileItem, "file-1"): file_obj})

    async def _fake_download_file(*, key: str):
        assert key == "images/sample.png"
        return b"png-bytes"

    async def _fake_get_file_info(*, key: str):
        assert key == "images/sample.png"
        return SimpleNamespace(content_type="image/png")

    monkeypatch.setattr("app.services.studio.image_task_references.storage.download_file", _fake_download_file)
    monkeypatch.setattr("app.services.studio.image_task_references.storage.get_file_info", _fake_get_file_info)

    refs = await resolve_reference_image_refs_by_file_ids(db, file_ids=["file-1"])

    assert len(refs) == 1
    assert refs[0]["image_url"].startswith("data:image/png;base64,")


@pytest.mark.asyncio
async def test_pick_ordered_ref_file_ids_returns_requested_angle_order(monkeypatch):
    rows = [
        SimpleNamespace(file_id="file-back", view_angle=AssetViewAngle.back),
        SimpleNamespace(file_id="file-right", view_angle=AssetViewAngle.right),
        SimpleNamespace(file_id="file-front", view_angle=AssetViewAngle.front),
    ]
    db = _FakeDB(execute_results=[_FakeExecuteResult(rows=rows)])
    monkeypatch.setattr("app.services.studio.image_task_references.select", lambda *_args, **_kwargs: _FakeStmt())

    out = await pick_ordered_ref_file_ids(
        db,
        image_model=_FakeImageModel,
        parent_field_name="actor_id",
        parent_id="actor-1",
        view_angles=(AssetViewAngle.front, AssetViewAngle.right, AssetViewAngle.left),
    )

    assert out == ["file-front", "file-right"]


@pytest.mark.asyncio
async def test_build_actor_image_base_draft_front_view_returns_no_refs(monkeypatch):
    actor = SimpleNamespace(
        id="actor-1",
        name="Diễn viên A",
        description="Nam giới điềm tĩnh",
        tags=["Chín muồi", "Đô thị"],
        visual_style="Thực tế",
        style="Điện ảnh",
    )
    image = SimpleNamespace(
        id=1,
        actor_id="actor-1",
        view_angle=AssetViewAngle.front,
        quality_level="high",
        format="png",
    )
    db = _FakeDB(
        mapping={
            (Actor, "actor-1"): actor,
            (ActorImage, 1): image,
        }
    )

    async def _fake_build_prompt(*_args, **_kwargs):
        return "Prompt kết xuất diễn viên"

    monkeypatch.setattr(asset_base, "build_prompt_with_template", _fake_build_prompt)
    monkeypatch.setattr(asset_base, "asset_prompt_category", lambda **_kwargs: "actor_front")

    draft = await asset_base.build_actor_image_base_draft(
        db,
        actor_id="actor-1",
        image_id=1,
    )

    assert draft.prompt == "Prompt kết xuất diễn viên"
    assert draft.default_images == []
    assert draft.image_id == 1


@pytest.mark.asyncio
async def test_build_character_image_base_draft_combines_actor_and_costume_refs(monkeypatch):
    character = SimpleNamespace(
        id="char-1",
        name="Nhân vật A",
        description="Nhân vật chính",
        actor_id="actor-1",
        costume_id="costume-1",
        visual_style="Thực tế",
        style="Điện ảnh",
    )
    image = SimpleNamespace(
        id=1,
        character_id="char-1",
        view_angle=AssetViewAngle.front,
        quality_level="high",
        format="png",
    )
    db = _FakeDB(
        mapping={
            (Character, "char-1"): character,
            (CharacterImage, 1): image,
            (Actor, "actor-1"): SimpleNamespace(id="actor-1"),
            (Costume, "costume-1"): SimpleNamespace(id="costume-1"),
        }
    )

    async def _fake_build_prompt(*_args, **_kwargs):
        return "Prompt tổng hợp nhân vật"

    async def _fake_pick_ordered(*_args, parent_id: str, **_kwargs):
        if parent_id == "actor-1":
            return ["actor-front", "actor-left"]
        return ["costume-front"]

    monkeypatch.setattr(asset_base, "build_prompt_with_template", _fake_build_prompt)
    monkeypatch.setattr(asset_base, "pick_ordered_ref_file_ids", _fake_pick_ordered)

    draft = await asset_base.build_character_image_base_draft(
        db,
        character_id="char-1",
        image_id=1,
    )

    assert draft.prompt == "Prompt tổng hợp nhân vật"
    assert draft.default_images == ["actor-front", "actor-left", "costume-front"]
    assert draft.image_id == 1


def test_derive_frame_preview_replaces_reference_names_with_stable_order() -> None:
    base = build_frame_base_draft(
        shot_id="shot-1",
        frame_type=ShotFrameType.first,
        prompt="Trương Tam trong đêm mưa áp sát Lý Tứ",
        director_command_summary="Bắt buộc: cố định hướng nhìn của nhân vật chính; Ưu tiên: giữ ổn định trục cùng bối cảnh",
        continuity_guidance="Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, không nên như một khung cảnh hoàn toàn mới bắt đầu lại từ đầu",
        frame_specific_guidance="Khung hình đầu chỉ thể hiện khoảnh khắc giật mình, thân thể nhân vật đơ lại đột ngột, hành động chưa hoàn thành",
        composition_anchor="Lấy ánh đèn cửa và vị trí đứng của nhân vật chính làm trọng tâm khung hình, giữ cho môi trường và nhân vật cùng đọc được",
        screen_direction_guidance="Giữ vị trí đứng trái/phải và hướng nhìn đối diện của Trương Tam và Lý Tứ ổn định, tránh lật hướng vô cớ",
    )
    context = build_frame_context(
        shot_id="shot-1",
        frame_type=ShotFrameType.first,
        items=[
            ShotLinkedAssetItem(id="char-1", type="character", name="Trương Tam", file_id="char-1-front"),
            ShotLinkedAssetItem(id="char-2", type="character", name="Lý Tứ", file_id="char-2-front"),
        ],
    )

    preview = derive_frame_preview(base=base, context=context)

    assert preview.images == ["char-1-front", "char-2-front"]
    assert preview.mappings[0].token == "图1"
    assert preview.mappings[1].token == "图2"
    assert preview.selected_guidance == [
        "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: cố định hướng nhìn của nhân vật chính; Ưu tiên: giữ ổn định trục cùng bối cảnh",
        "Trách nhiệm khung hình hiện tại: Khung hình đầu chỉ thể hiện khoảnh khắc giật mình, thân thể nhân vật đơ lại đột ngột, hành động chưa hoàn thành",
        "Yêu cầu tính liên tục: Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, không nên như một khung cảnh hoàn toàn mới bắt đầu lại từ đầu",
    ]
    assert preview.dropped_guidance == [
        "Mỏ neo bố cục: Lấy ánh đèn cửa và vị trí đứng của nhân vật chính làm trọng tâm khung hình, giữ cho môi trường và nhân vật cùng đọc được",
        "Hướng và ánh nhìn: Giữ vị trí đứng trái/phải và hướng nhìn đối diện của Trương Tam và Lý Tứ ổn định, tránh lật hướng vô cớ",
    ]
    assert preview.selected_guidance_details[1].reason_tag == "Khung hình đầu giữ thứ tự thời gian"
    assert preview.selected_guidance_details[1].reason == "hiện là khung hình đầu, hệ thống ưu tiên giữ ràng buộc khoảnh khắc kích hoạt và trạng thái chưa hoàn thành, tránh khung nhảy thẳng vào hành động hoàn tất sau."
    assert preview.dropped_guidance_details[0].reason_tag == "Khung hình đầu giáng bố cục"
    assert preview.dropped_guidance_details[1].reason_tag == "Khung hình đầu hạ trục kịch"
    assert "Chỉ đạo đạo diễn ưu tiên cao: Bắt buộc: cố định hướng nhìn của nhân vật chính; Ưu tiên: giữ ổn định trục cùng bối cảnh" in preview.rendered_prompt
    assert "Trách nhiệm khung hình hiện tại: Khung hình đầu chỉ thể hiện khoảnh khắc giật mình, thân thể nhân vật đơ lại đột ngột, hành động chưa hoàn thành" in preview.rendered_prompt
    assert "Yêu cầu tính liên tục: Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước, không nên như một khung cảnh hoàn toàn mới bắt đầu lại từ đầu" in preview.rendered_prompt
    assert "Mỏ neo bố cục: dùng ánh sáng cửa và vị trí đứng của nhân vật chính làm trọng tâm khung hình, giữ cho môi trường và nhân vật đều đọc được" not in preview.rendered_prompt
    assert "Hướng và đường nhìn: giữ vị trí đứng trái/phải và hướng nhìn nhau của Trương Tam với Lý Tứ ổn định, tránh vô cớ lật hướng" not in preview.rendered_prompt
    assert "图1 trong đêm mưa áp sát 图2" in preview.rendered_prompt


def test_derive_frame_preview_prioritizes_composition_for_first_frame() -> None:
    base = build_frame_base_draft(
        shot_id="shot-2",
        frame_type=ShotFrameType.first,
        prompt="Nhân vật chính đẩy cửa bước vào sảnh trống",
        director_command_summary="Bắt buộc: thiết lập không gian trước",
        continuity_guidance="Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước",
        frame_specific_guidance="Khung hình đầu ưu tiên thể hiện khoảnh khắc đẩy cửa và trạng thái nhân vật chưa hoàn toàn vào sảnh",
        composition_anchor="Lấy khung cửa, vị trí đứng của nhân vật và độ sâu của sảnh làm mỏ neo không gian, ưu tiên thiết lập mối quan hệ giữa môi trường và nhân vật",
        screen_direction_guidance="Giữ định hướng nhân vật ổn định",
    )
    context = build_frame_context(
        shot_id="shot-2",
        frame_type=ShotFrameType.first,
        items=[],
    )

    preview = derive_frame_preview(base=base, context=context)

    assert preview.selected_guidance[1] == "Trách nhiệm khung hình hiện tại: Khung hình đầu ưu tiên thể hiện khoảnh khắc đẩy cửa và trạng thái nhân vật chưa hoàn toàn vào sảnh"
    assert preview.dropped_guidance == [
        "Mỏ neo bố cục: Lấy khung cửa, vị trí đứng của nhân vật và độ sâu của sảnh làm mỏ neo không gian, ưu tiên thiết lập mối quan hệ giữa môi trường và nhân vật",
        "Hướng và ánh nhìn: Giữ định hướng nhân vật ổn định",
    ]
    assert preview.selected_guidance_details[1].reason_tag == "Khung hình đầu giữ thứ tự thời gian"
    assert preview.selected_guidance_details[1].reason == "hiện là khung hình đầu, hệ thống ưu tiên giữ ràng buộc khoảnh khắc kích hoạt và trạng thái chưa hoàn thành, tránh khung nhảy thẳng vào hành động hoàn tất sau."
    assert "Trách nhiệm khung hình hiện tại: Khung hình đầu ưu tiên thể hiện khoảnh khắc đẩy cửa và trạng thái nhân vật chưa hoàn toàn vào sảnh" in preview.rendered_prompt
    assert "Mỏ neo bố cục: Lấy khung cửa, vị trí đứng của nhân vật và độ sâu của sảnh làm mỏ neo không gian, ưu tiên thiết lập mối quan hệ giữa môi trường và nhân vật" not in preview.rendered_prompt
    assert "Hướng và ánh nhìn: Giữ định hướng nhân vật ổn định" not in preview.rendered_prompt


def test_derive_frame_preview_prioritizes_screen_guidance_for_key_frame() -> None:
    base = build_frame_base_draft(
        shot_id="shot-3",
        frame_type=ShotFrameType.key,
        prompt="Hai người đối đầu, cảm xúc lên đến đỉnh điểm",
        director_command_summary="Bắt buộc: khóa căng thẳng đối đầu",
        continuity_guidance="Phân cảnh hiện tại nên tiếp nối hành động và cảm xúc của phân cảnh trước",
        frame_specific_guidance="khung hình chính nên khóa khoảnh khắc đỉnh của hành động đối đầu",
        composition_anchor="Lấy cuối hành lang và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng đọc được",
        screen_direction_guidance="Giữ vị trí đứng trái/phải và hướng nhìn đối diện của hai người ổn định, tránh nhảy trục",
    )
    context = build_frame_context(
        shot_id="shot-3",
        frame_type=ShotFrameType.key,
        items=[],
    )

    preview = derive_frame_preview(base=base, context=context)

    assert preview.selected_guidance[2] == "Hướng và ánh nhìn: Giữ vị trí đứng trái/phải và hướng nhìn đối diện của hai người ổn định, tránh nhảy trục"
    assert preview.dropped_guidance == [
        "Trách nhiệm khung hình hiện tại: khung hình chính nên khóa khoảnh khắc đỉnh của hành động đối đầu",
        "Mỏ neo bố cục: Lấy cuối hành lang và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng đọc được",
    ]
    assert preview.selected_guidance_details[2].reason_tag == "Giữ trục kịch ở khung hình chính"
    assert preview.selected_guidance_details[2].reason == "shot hiện tại chú trọng sự ổn định của hướng nhìn và trục trái/phải hơn, nên ưu tiên giữ guidance hướng xoay và hướng nhìn."
    assert preview.dropped_guidance_details[0].reason_tag == "khung chính hạ đỉnh"
    assert "Hướng và ánh nhìn: Giữ vị trí đứng trái/phải và hướng nhìn đối diện của hai người ổn định, tránh nhảy trục" in preview.rendered_prompt
    assert "Mỏ neo bố cục: Lấy cuối hành lang và vị trí đứng của nhân vật làm mỏ neo không gian, giữ cho môi trường và nhân vật cùng đọc được" not in preview.rendered_prompt
    assert "Trách nhiệm khung hình hiện tại: khung hình chính nên khóa khoảnh khắc đỉnh của hành động đối đầu" not in preview.rendered_prompt
