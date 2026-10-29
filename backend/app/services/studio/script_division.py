"""dịch vụ ghi DB phân cảnh kịch bản:lưu kết quả phân cảnh vào Chapter/Shot/ShotDetail."""

from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.studio import CameraAngle, CameraMovement, CameraShotType, Chapter, Shot, ShotDetail, VFXType
from app.schemas.skills.script_processing import ScriptDivisionResult
from app.services.common import entity_not_found, require_entity


def _append_division_rows(
    db_add,
    *,
    chapter_id: str,
    result: ScriptDivisionResult,
) -> None:
    for shot_division in result.shots:
        title = (shot_division.shot_name or "").strip() or f"Phân cảnh {shot_division.index}"
        shot_id = str(uuid.uuid4())
        db_add(
            Shot(
                id=shot_id,
                chapter_id=chapter_id,
                index=shot_division.index,
                title=title,
                script_excerpt=shot_division.script_excerpt,
            )
        )
        db_add(
            ShotDetail(
                id=shot_id,
                camera_shot=CameraShotType.ms,
                angle=CameraAngle.eye_level,
                movement=CameraMovement.static,
                follow_atmosphere=True,
                vfx_type=VFXType.none,
                duration=4,
            )
        )


async def write_division_result_to_chapter(
    db: AsyncSession,
    *,
    chapter_id: str,
    result: ScriptDivisionResult,
) -> None:
    """Viết kết quả phân cảnh vào chương chỉ định; nếu chương đã có phân cảnh thì từ chối ghi."""
    await require_entity(
        db,
        Chapter,
        chapter_id,
        detail=entity_not_found("Chapter"),
        status_code=400,
    )

    existing = await db.execute(select(Shot.id).where(Shot.chapter_id == chapter_id).limit(1))
    if existing.first() is not None:
        raise HTTPException(
            status_code=400,
            detail="Chapter already has shots; refusing to write (write_strategy=fail)",
        )

    _append_division_rows(db.add, chapter_id=chapter_id, result=result)

    # Kích hoạt kiểm tra ràng buộc duy nhất và khóa ngoại, đảm bảo thất bại trước khi trả về.
    await db.flush()


def write_division_result_to_chapter_sync(
    db: Session,
    *,
    chapter_id: str,
    result: ScriptDivisionResult,
) -> None:
    chapter = db.get(Chapter, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=400, detail=entity_not_found("Chapter"))

    existing = db.execute(select(Shot.id).where(Shot.chapter_id == chapter_id).limit(1))
    if existing.first() is not None:
        raise HTTPException(
            status_code=400,
            detail="Chapter already has shots; refusing to write (write_strategy=fail)",
        )

    _append_division_rows(db.add, chapter_id=chapter_id, result=result)
    db.flush()
