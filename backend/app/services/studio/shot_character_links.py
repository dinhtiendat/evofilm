""" Dịch vụ liên kết nhân vật của phân cảnh: đóng gói truy vấn dàn nhân vật và quy tắc upsert."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.studio import Chapter, Character, Shot, ShotCharacterLink
from app.schemas.studio.cast import ShotCharacterLinkCreate
from app.services.common import create_and_refresh, entity_not_found, flush_and_refresh, require_entity
from app.services.studio.shot_extracted_candidates import mark_linked_by_name, mark_pending_by_name


async def list_by_shot(
    db: AsyncSession,
    *,
    shot_id: str,
) -> list[ShotCharacterLink]:
    """Truy danh sách nhân vật liên kết theo phân cảnh."""
    await require_entity(db, Shot, shot_id, detail=entity_not_found("Shot"))

    stmt = (
        select(ShotCharacterLink)
        .where(ShotCharacterLink.shot_id == shot_id)
        .order_by(ShotCharacterLink.index.asc(), ShotCharacterLink.id.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def upsert(
    db: AsyncSession,
    *,
    body: ShotCharacterLinkCreate,
) -> ShotCharacterLink:
    """Upsert quan hệ dàn diễn viên theo phân cảnh và nhân vật, xử lý xung đột index."""
    shot = await require_entity(db, Shot, body.shot_id, detail=entity_not_found("Shot"))
    chapter = await require_entity(
        db,
        Chapter,
        shot.chapter_id,
        detail=f"{entity_not_found('Chapter')} for shot",
        status_code=400,
    )
    character = await require_entity(db, Character, body.character_id, detail=entity_not_found("Character"))

    if character.project_id != chapter.project_id:
        raise ValueError("Character does not belong to the same project")

    existing_same_character_stmt = select(ShotCharacterLink).where(
        ShotCharacterLink.shot_id == body.shot_id,
        ShotCharacterLink.character_id == body.character_id,
    )
    existing = (await db.execute(existing_same_character_stmt)).scalars().one_or_none()
    if existing is not None:
        existing.index = body.index
        existing.note = body.note
        existing = await flush_and_refresh(db, existing)
        await mark_linked_by_name(
            db,
            shot_id=body.shot_id,
            candidate_type="character",
            candidate_name=character.name,
            linked_entity_id=body.character_id,
        )
        return existing

    existing_same_index_stmt = select(ShotCharacterLink).where(
        ShotCharacterLink.shot_id == body.shot_id,
        ShotCharacterLink.index == body.index,
    )
    existing_same_index = (await db.execute(existing_same_index_stmt)).scalars().one_or_none()
    if existing_same_index is not None:
        previous_character = await db.get(Character, existing_same_index.character_id)
        await db.execute(delete(ShotCharacterLink).where(ShotCharacterLink.id == existing_same_index.id))
        if previous_character is not None and getattr(previous_character, "name", None):
            await mark_pending_by_name(
                db,
                shot_id=body.shot_id,
                candidate_type="character",
                candidate_name=str(previous_character.name),
            )

    row = await create_and_refresh(
        db,
        ShotCharacterLink(
            shot_id=body.shot_id,
            character_id=body.character_id,
            index=body.index,
            note=body.note,
        ),
    )
    await mark_linked_by_name(
        db,
        shot_id=body.shot_id,
        candidate_type="character",
        candidate_name=character.name,
        linked_entity_id=body.character_id,
    )
    return row
