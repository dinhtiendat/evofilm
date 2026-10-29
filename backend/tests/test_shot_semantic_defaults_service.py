from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.db import Base
from app.models.studio import (
    CameraAngle,
    CameraMovement,
    CameraShotType,
    Chapter,
    Project,
    ProjectStyle,
    ProjectVisualStyle,
    Shot,
    ShotDetail,
)
from app.schemas.skills.script_processing import ShotSemanticSuggestion, StudioScriptExtractionDraft, StudioShotDraft
from app.services.script_processing_worker import apply_extraction_result
from app.services.studio.shot_extraction_draft import build_script_extraction_draft_for_shot
from app.services.studio.shot_semantic_defaults import apply_shot_semantic_defaults_from_draft


async def _seed_async_graph(db: AsyncSession) -> str:
    """Dựng đồ thị dự án/chương/phân cảnh tối thiểu, thuận tiện xác thực ghi ngược giá trị mặc định ngôn ngữ phân cảnh."""

    project = Project(
        id="project-1",
        name="Dự án 1",
        style=ProjectStyle.guoman,
        visual_style=ProjectVisualStyle.anime,
    )
    chapter = Chapter(id="chapter-1", project_id=project.id, index=1, title="Chương 1")
    shot = Shot(id="shot-1", chapter_id=chapter.id, index=1, title="Cảnh 1", script_excerpt="Trích dẫn gốc")
    detail = ShotDetail(
        id=shot.id,
        camera_shot=CameraShotType.ms,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.static,
        duration=4,
    )
    db.add_all([project, chapter, shot, detail])
    await db.flush()
    return shot.id


def _seed_sync_graph(db: Session) -> str:
    """Đồ thị tối thiểu dự án/chương/phân cảnh của phiên bản đồng bộ."""

    project = Project(
        id="project-1",
        name="Dự án 1",
        style=ProjectStyle.guoman,
        visual_style=ProjectVisualStyle.anime,
    )
    chapter = Chapter(id="chapter-1", project_id=project.id, index=1, title="Chương 1")
    shot = Shot(id="shot-1", chapter_id=chapter.id, index=1, title="Cảnh 1", script_excerpt="Trích dẫn gốc")
    detail = ShotDetail(
        id=shot.id,
        camera_shot=CameraShotType.ms,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.static,
        duration=4,
    )
    db.add_all([project, chapter, shot, detail])
    db.flush()
    return shot.id


def _build_semantic_draft() -> StudioScriptExtractionDraft:
    """Xây dựng bản nháp trích xuất kèm gợi ý mặc định ngôn ngữ điện ảnh."""

    return StudioScriptExtractionDraft(
        project_id="project-1",
        chapter_id="chapter-1",
        script_text="Văn bản thử nghiệm",
        characters=[],
        scenes=[],
        props=[],
        costumes=[],
        shots=[
            StudioShotDraft(
                index=1,
                title="Phân cảnh 1",
                script_excerpt="Trích đoạn",
                scene_name=None,
                character_names=[],
                prop_names=[],
                costume_names=[],
                dialogue_lines=[],
                actions=["Đóng băng sau khi nghe thấy tiếng"],
                semantic_suggestion=ShotSemanticSuggestion(
                    camera_shot=CameraShotType.cu,
                    angle=CameraAngle.low_angle,
                    movement=CameraMovement.track,
                    duration=6,
                    action_beats=["Đúng lúc nghe tiếng động lạ thì cứng đơ", "Kìm cắt cành tuột tay rơi xuống"],
                ),
            )
        ],
    )


@pytest.mark.asyncio
async def test_apply_shot_semantic_defaults_from_draft_updates_shot_detail() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    import app.models.studio  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_local() as db:
        shot_id = await _seed_async_graph(db)
        draft = _build_semantic_draft()

        await apply_shot_semantic_defaults_from_draft(db, chapter_id="chapter-1", draft=draft)
        detail = await db.get(ShotDetail, shot_id)

        assert detail is not None
        assert detail.camera_shot == CameraShotType.cu
        assert detail.angle == CameraAngle.low_angle
        assert detail.movement == CameraMovement.track
        assert detail.duration == 6
        assert detail.action_beats == ["Đúng lúc nghe tiếng động lạ thì cứng đơ", "Kìm cắt cành tuột tay rơi xuống"]

    await engine.dispose()


@pytest.mark.asyncio
async def test_build_script_extraction_draft_for_shot_includes_semantic_suggestion() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    import app.models.studio  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_local() as db:
        shot_id = await _seed_async_graph(db)
        draft = await build_script_extraction_draft_for_shot(db, shot_id)

        assert len(draft.shots) == 1
        semantic = draft.shots[0].semantic_suggestion
        assert semantic is not None
        assert semantic.camera_shot == CameraShotType.ms
        assert semantic.angle == CameraAngle.eye_level
        assert semantic.movement == CameraMovement.static
        assert semantic.duration == 4
        assert semantic.action_beats == []

    await engine.dispose()


def test_apply_extraction_result_sync_updates_shot_detail() -> None:
    engine = create_engine("sqlite:///:memory:", future=True)
    session_local = sessionmaker(engine, class_=Session, expire_on_commit=False)

    import app.models.studio  # noqa: F401

    Base.metadata.create_all(engine)

    with session_local() as db:
        shot_id = _seed_sync_graph(db)
        draft = _build_semantic_draft()

        apply_extraction_result(db, chapter_id="chapter-1", draft=draft)
        detail = db.get(ShotDetail, shot_id)

        assert detail is not None
        assert detail.camera_shot == CameraShotType.cu
        assert detail.angle == CameraAngle.low_angle
        assert detail.movement == CameraMovement.track
        assert detail.duration == 6
        assert detail.action_beats == ["Đúng lúc nghe tiếng động lạ thì cứng đơ", "Kìm cắt cành tuột tay rơi xuống"]

    engine.dispose()
