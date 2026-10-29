"""Dịch vụ tính trạng thái quy trình phân cảnh.

`shot.status` hiện tại chỉ diễn đạt việc “xác nhận trích xuất thông tin” có khép kín hay chưa:

- pending: Ứng viên tài nguyên/thoại vẫn còn mục chưa xác nhận
- ready: Ứng viên đã xác nhận xong, hoặc bỏ qua trích xuất rõ ràng

Tác vụ tạo đang chạy không còn ghi vào `shot.status` nữa, mà do hệ thống tác vụ diễn đạt riêng.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.studio import (
    Shot,
    ShotCandidateStatus,
    ShotDialogueCandidateStatus,
    ShotExtractedCandidate,
    ShotExtractedDialogueCandidate,
    ShotStatus,
)
from app.services.common import entity_not_found


async def _count_candidates(db: AsyncSession, *, shot_id: str) -> tuple[int, int]:
    """Thống kê tổng số và số chưa xử lý các ứng viên của phân cảnh.

    Ở đây chủ động đếm bằng SQL, tránh truy cập relationship trong ngữ cảnh không đồng bộ
    Kích hoạt nạp chậm ẩn thức.
    """
    total_stmt = select(func.count(ShotExtractedCandidate.id)).where(
        ShotExtractedCandidate.shot_id == shot_id
    )
    unresolved_stmt = (
        select(func.count(ShotExtractedCandidate.id))
        .where(ShotExtractedCandidate.shot_id == shot_id)
        .where(ShotExtractedCandidate.candidate_status == ShotCandidateStatus.pending)
    )
    total = int(await db.scalar(total_stmt) or 0)
    unresolved = int(await db.scalar(unresolved_stmt) or 0)
    return total, unresolved


async def _count_dialogue_candidates(db: AsyncSession, *, shot_id: str) -> tuple[int, int]:
    """Đếm tổng số và số chưa xử lý ứng viên lời thoại của phân cảnh."""
    total_stmt = select(func.count(ShotExtractedDialogueCandidate.id)).where(
        ShotExtractedDialogueCandidate.shot_id == shot_id
    )
    unresolved_stmt = (
        select(func.count(ShotExtractedDialogueCandidate.id))
        .where(ShotExtractedDialogueCandidate.shot_id == shot_id)
        .where(ShotExtractedDialogueCandidate.candidate_status == ShotDialogueCandidateStatus.pending)
    )
    total = int(await db.scalar(total_stmt) or 0)
    unresolved = int(await db.scalar(unresolved_stmt) or 0)
    return total, unresolved


async def recompute_shot_status(db: AsyncSession, *, shot_id: str) -> ShotStatus:
    """Tính lại trạng thái quy trình theo trạng thái xác nhận ứng viên của phân cảnh."""
    shot = await db.get(Shot, shot_id)
    if shot is None:
        raise ValueError(entity_not_found("Shot"))

    if shot.skip_extraction:
        shot.status = ShotStatus.ready
        await db.flush()
        return shot.status

    if shot.last_extracted_at is None:
        shot.status = ShotStatus.pending
        await db.flush()
        return shot.status

    total_candidates, unresolved = await _count_candidates(db, shot_id=shot_id)
    total_dialogue_candidates, unresolved_dialogue = await _count_dialogue_candidates(db, shot_id=shot_id)
    if total_candidates == 0 and total_dialogue_candidates == 0:
        shot.status = ShotStatus.ready
        await db.flush()
        return shot.status

    shot.status = ShotStatus.ready if unresolved == 0 and unresolved_dialogue == 0 else ShotStatus.pending
    await db.flush()
    return shot.status


async def mark_shot_generating(db: AsyncSession, *, shot_id: str) -> ShotStatus:
    """tương thích điểm gọi cũ:sau khi khởi động tác vụ sinh chỉ tính lại trạng thái tĩnh, không ghi generating nữa.

    Giữ lại hàm ở đây để tránh phải sửa interface khắp nơi trên chuỗi tạo tác vụ.
    Có thể xóa sau khi di trú xong tại tất cả điểm gọi.
    """
    return await recompute_shot_status(db, shot_id=shot_id)


def _count_candidates_sync(db: Session, *, shot_id: str) -> tuple[int, int]:
    total_stmt = select(func.count(ShotExtractedCandidate.id)).where(
        ShotExtractedCandidate.shot_id == shot_id
    )
    unresolved_stmt = (
        select(func.count(ShotExtractedCandidate.id))
        .where(ShotExtractedCandidate.shot_id == shot_id)
        .where(ShotExtractedCandidate.candidate_status == ShotCandidateStatus.pending)
    )
    total = int(db.scalar(total_stmt) or 0)
    unresolved = int(db.scalar(unresolved_stmt) or 0)
    return total, unresolved


def _count_dialogue_candidates_sync(db: Session, *, shot_id: str) -> tuple[int, int]:
    total_stmt = select(func.count(ShotExtractedDialogueCandidate.id)).where(
        ShotExtractedDialogueCandidate.shot_id == shot_id
    )
    unresolved_stmt = (
        select(func.count(ShotExtractedDialogueCandidate.id))
        .where(ShotExtractedDialogueCandidate.shot_id == shot_id)
        .where(ShotExtractedDialogueCandidate.candidate_status == ShotDialogueCandidateStatus.pending)
    )
    total = int(db.scalar(total_stmt) or 0)
    unresolved = int(db.scalar(unresolved_stmt) or 0)
    return total, unresolved


def recompute_shot_status_sync(db: Session, *, shot_id: str) -> ShotStatus:
    shot = db.get(Shot, shot_id)
    if shot is None:
        raise ValueError(entity_not_found("Shot"))

    if shot.skip_extraction:
        shot.status = ShotStatus.ready
        db.flush()
        return shot.status

    if shot.last_extracted_at is None:
        shot.status = ShotStatus.pending
        db.flush()
        return shot.status

    total_candidates, unresolved = _count_candidates_sync(db, shot_id=shot_id)
    total_dialogue_candidates, unresolved_dialogue = _count_dialogue_candidates_sync(db, shot_id=shot_id)
    if total_candidates == 0 and total_dialogue_candidates == 0:
        shot.status = ShotStatus.ready
        db.flush()
        return shot.status

    shot.status = ShotStatus.ready if unresolved == 0 and unresolved_dialogue == 0 else ShotStatus.pending
    db.flush()
    return shot.status
