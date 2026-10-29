"""Dịch vụ tổng hợp độ sẵn sàng tạo video của phân cảnh."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm import Model, ModelCategoryKey, ModelSettings, Provider
from app.models.studio import (
    Shot,
    ShotCandidateStatus,
    ShotDialogueCandidateStatus,
    ShotDetail,
    ShotExtractedCandidate,
    ShotExtractedDialogueCandidate,
    ShotFrameType,
    ShotFrameImage,
)
from app.models.task import GenerationTask, GenerationTaskStatus
from app.models.task_links import GenerationTaskLink
from app.schemas.studio.shots import ShotVideoReadinessCheck, ShotVideoReadinessRead
from app.services.common import entity_not_found
from app.services.studio.generation.video import (
    build_video_base_draft,
    build_video_context,
    derive_video_preview,
)


REQUIRED_FRAMES_BY_MODE: dict[str, tuple[ShotFrameType, ...]] = {
    "first": (ShotFrameType.first,),
    "last": (ShotFrameType.last,),
    "key": (ShotFrameType.key,),
    "first_last": (ShotFrameType.first, ShotFrameType.last),
    "first_last_key": (ShotFrameType.first, ShotFrameType.last, ShotFrameType.key),
    "text_only": (),
}

_ACTIVE_TASK_STATUSES = (
    GenerationTaskStatus.pending,
    GenerationTaskStatus.running,
    GenerationTaskStatus.streaming,
)


def _check(key: str, ok: bool, message: str) -> ShotVideoReadinessCheck:
    return ShotVideoReadinessCheck(key=key, ok=ok, message=message)


async def _count_pending_candidates(db: AsyncSession, *, shot_id: str) -> tuple[int, int]:
    asset_stmt = (
        select(func.count(ShotExtractedCandidate.id))
        .where(ShotExtractedCandidate.shot_id == shot_id)
        .where(ShotExtractedCandidate.candidate_status == ShotCandidateStatus.pending)
    )
    dialogue_stmt = (
        select(func.count(ShotExtractedDialogueCandidate.id))
        .where(ShotExtractedDialogueCandidate.shot_id == shot_id)
        .where(ShotExtractedDialogueCandidate.candidate_status == ShotDialogueCandidateStatus.pending)
    )
    return int(await db.scalar(asset_stmt) or 0), int(await db.scalar(dialogue_stmt) or 0)


async def _has_active_video_task(db: AsyncSession, *, shot_id: str) -> bool:
    stmt = (
        select(func.count(GenerationTask.id))
        .select_from(GenerationTaskLink)
        .join(GenerationTask, GenerationTask.id == GenerationTaskLink.task_id)
        .where(GenerationTaskLink.resource_type == "video")
        .where(GenerationTaskLink.relation_type == "video")
        .where(GenerationTaskLink.relation_entity_id == shot_id)
        .where(GenerationTask.status.in_(_ACTIVE_TASK_STATUSES))
    )
    return bool(await db.scalar(stmt))


async def _reference_frames_ready(
    db: AsyncSession,
    *,
    shot_id: str,
    reference_mode: str,
) -> ShotVideoReadinessCheck:
    required_frames = REQUIRED_FRAMES_BY_MODE.get(reference_mode)
    if required_frames is None:
        return _check("reference_frames_ready", False, f"Chế độ tham chiếu không rõ: {reference_mode}")
    if not required_frames:
        return _check("reference_frames_ready", True, "Chế độ tham chiếu hiện tại không cần khung hình tham chiếu")

    stmt = select(ShotFrameImage).where(
        ShotFrameImage.shot_detail_id == shot_id,
        ShotFrameImage.frame_type.in_(required_frames),
    )
    rows = (await db.execute(stmt)).scalars().all()
    frame_map = {row.frame_type: row for row in rows}
    missing = [frame.value for frame in required_frames if not frame_map.get(frame) or not frame_map[frame].file_id]
    if missing:
        return _check("reference_frames_ready", False, f"Thiếu khung hình tham chiếu: {', '.join(missing)}")
    return _check("reference_frames_ready", True, "Khung hình tham chiếu đã sẵn sàng")


async def _video_model_and_provider_ready(db: AsyncSession) -> tuple[ShotVideoReadinessCheck, ShotVideoReadinessCheck]:
    settings = await db.get(ModelSettings, 1)
    model_id = settings.default_video_model_id if settings else None
    if not model_id:
        return (
            _check("video_model_ready", False, "chưa cấu hình mô hình video mặc định"),
            _check("provider_ready", False, "Chưa cấu hình mô hình video mặc định, không thể kiểm tra nhà cung cấp"),
        )
    model = await db.get(Model, model_id)
    if model is None:
        return (
            _check("video_model_ready", False, f"Mô hình video mặc định không tồn tại: {model_id}"),
            _check("provider_ready", False, "Mô hình video mặc định không tồn tại, không thể kiểm tra nhà cung cấp"),
        )
    if model.category != ModelCategoryKey.video:
        return (
            _check("video_model_ready", False, f"Mô hình mặc định không thuộc hạng mục video: {model_id}"),
            _check("provider_ready", False, "Mô hình mặc định không phải loại video, không thể kiểm tra nhà cung cấp"),
        )
    provider = await db.get(Provider, model.provider_id)
    if provider is None:
        return (
            _check("video_model_ready", True, "Mô hình video mặc định khả dụng"),
            _check("provider_ready", False, f"Nhà cung cấp mô hình video không tồn tại: {model.provider_id}"),
        )
    if not (provider.api_key or "").strip():
        return (
            _check("video_model_ready", True, "Mô hình video mặc định khả dụng"),
            _check("provider_ready", False, f"Nhà cung cấp mô hình video thiếu api_key: {provider.id}"),
        )
    return (
        _check("video_model_ready", True, "Mô hình video mặc định khả dụng"),
        _check("provider_ready", True, "nhà cung cấp mô hình video khả dụng"),
    )


async def get_shot_video_readiness(
    db: AsyncSession,
    *,
    shot_id: str,
    reference_mode: str,
) -> ShotVideoReadinessRead:
    """Tổng hợp thời gian thực độ sẵn sàng tạo video của phân cảnh, không ghi trạng thái vào CSDL."""
    shot = await db.get(Shot, shot_id)
    if shot is None:
        raise ValueError(entity_not_found("Shot"))
    detail = await db.get(ShotDetail, shot_id)

    pending_assets, pending_dialogues = await _count_pending_candidates(db, shot_id=shot_id)
    extraction_ok = bool(shot.skip_extraction) or (
        shot.last_extracted_at is not None and pending_assets == 0 and pending_dialogues == 0
    )
    if extraction_ok:
        extraction_msg = "Xác nhận trích xuất thông tin đã hoàn tất" if not shot.skip_extraction else "Phân cảnh hiện tại đã được đánh dấu là không cần trích xuất"
    else:
        extraction_msg = f"Còn các mục chờ xác nhận: tài nguyên {pending_assets} mục, thoại {pending_dialogues} mục"

    if detail is None:
        duration_check = _check("duration_ready", False, "Thiếu chi tiết phân cảnh, không đọc được thời lượng")
    else:
        duration = int(detail.duration or 0)
        duration_check = _check(
            "duration_ready",
            duration > 0,
            "đã cấu hình thời lượng shot" if duration > 0 else "vui lòng cấu hình thời lượng shot trước",
        )

    try:
        preview = await derive_video_preview(
            db,
            base=build_video_base_draft(shot_id=shot_id, prompt=None),
            context=await build_video_context(
                db,
                shot_id=shot_id,
                reference_mode="text_only",
                images=[],
            ),
        )
        prompt_ok = bool(preview.rendered_prompt.strip())
        prompt_message = "Prompt video khả dụng" if prompt_ok else "Prompt video đang trống"
    except Exception as exc:  # noqa: BLE001
        prompt_ok = False
        prompt_message = f"Render prompt video thất bại: {exc}"

    active_video_task = await _has_active_video_task(db, shot_id=shot_id)
    model_check, provider_check = await _video_model_and_provider_ready(db)
    checks = [
        _check("extraction_ready", extraction_ok, extraction_msg),
        duration_check,
        _check("prompt_ready", prompt_ok, prompt_message),
        await _reference_frames_ready(db, shot_id=shot_id, reference_mode=reference_mode),
        model_check,
        provider_check,
        _check(
            "no_active_video_task",
            not active_video_task,
            "Không có tác vụ video nào đang chạy" if not active_video_task else "Đã có tác vụ tạo video đang chạy",
        ),
    ]
    return ShotVideoReadinessRead(
        shot_id=shot_id,
        reference_mode=reference_mode,
        ready=all(item.ok for item in checks),
        checks=checks,
    )
