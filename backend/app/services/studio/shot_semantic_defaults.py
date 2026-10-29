"""Ghi ngược gợi ý mặc định ngôn ngữ điện ảnh trong bản nháp trích xuất vào ShotDetail."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.studio import CameraAngle, CameraMovement, CameraShotType, Shot, ShotDetail


def _get_value(obj: Any, key: str) -> Any:
    """đọc trường tương thích dict / Pydantic model / object thường."""

    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _coerce_enum(enum_cls: type, value: Any) -> Any:
    """Chuyển chuỗi trong kết quả trích xuất thành enum an toàn; giá trị không hợp lệ sẽ bị bỏ qua."""

    if value in (None, ""):
        return None
    if isinstance(value, enum_cls):
        return value
    try:
        return enum_cls(value)
    except Exception:
        return None


def _coerce_duration(value: Any) -> int | None:
    """Chuyển đổi an toàn thời lượng trong kết quả trích xuất thành số giây nguyên dương."""

    if value in (None, ""):
        return None
    try:
        duration = int(value)
    except Exception:
        return None
    return duration if duration > 0 else None


def _apply_detail_defaults_from_shot_draft(detail: ShotDetail, shot_draft: Any) -> None:
    """Ghi ngôn ngữ điện ảnh mặc định trong bản nháp trích xuất một phân cảnh vào ShotDetail hiện có."""

    semantic = _get_value(shot_draft, "semantic_suggestion")
    source = semantic or shot_draft

    camera_shot = _coerce_enum(CameraShotType, _get_value(source, "camera_shot"))
    angle = _coerce_enum(CameraAngle, _get_value(source, "angle"))
    movement = _coerce_enum(CameraMovement, _get_value(source, "movement"))
    duration = _coerce_duration(_get_value(source, "duration"))
    action_beats = [
        str(item).strip()
        for item in list(_get_value(source, "action_beats") or [])
        if str(item).strip()
    ]

    if camera_shot is not None:
        detail.camera_shot = camera_shot
    if angle is not None:
        detail.angle = angle
    if movement is not None:
        detail.movement = movement
    if duration is not None:
        detail.duration = duration
    if action_beats:
        detail.action_beats = action_beats


async def apply_shot_semantic_defaults_from_draft(
    db: AsyncSession,
    *,
    chapter_id: str,
    draft: Any,
) -> None:
    """ghép nháp theo số thứ tự shot, và ghi ngược đề xuất mặc định ngôn ngữ điện ảnh vào ShotDetail."""

    shot_rows = (
        await db.execute(
            select(Shot.id, Shot.index).where(Shot.chapter_id == chapter_id)
        )
    ).all()
    shot_id_by_index = {int(row.index): str(row.id) for row in shot_rows}

    for shot_draft in list(_get_value(draft, "shots") or []):
        shot_index = _coerce_duration(_get_value(shot_draft, "index"))
        if shot_index is None:
            continue
        shot_id = shot_id_by_index.get(shot_index)
        if not shot_id:
            continue
        detail = await db.get(ShotDetail, shot_id)
        if detail is None:
            continue
        _apply_detail_defaults_from_shot_draft(detail, shot_draft)


def apply_shot_semantic_defaults_from_draft_sync(
    db: Session,
    *,
    chapter_id: str,
    draft: Any,
) -> None:
    """Đồng bộ phiên bản executor tác vụ: ghi ngược gợi ý mặc định ngôn ngữ điện ảnh vào ShotDetail."""

    shot_rows = db.execute(select(Shot.id, Shot.index).where(Shot.chapter_id == chapter_id)).all()
    shot_id_by_index = {int(row.index): str(row.id) for row in shot_rows}

    for shot_draft in list(_get_value(draft, "shots") or []):
        shot_index = _coerce_duration(_get_value(shot_draft, "index"))
        if shot_index is None:
            continue
        shot_id = shot_id_by_index.get(shot_index)
        if not shot_id:
            continue
        detail = db.get(ShotDetail, shot_id)
        if detail is None:
            continue
        _apply_detail_defaults_from_shot_draft(detail, shot_draft)
