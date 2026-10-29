from __future__ import annotations

"""API tác vụ tạo ảnh liên quan tài nguyên và phân cảnh.

Gọi `ImageGenerationTask` thông qua TaskManager và sử dụng `GenerationTaskLink`
Thiết lập liên kết giữa tác vụ và thực thể nghiệp vụ cấp trên (hình tượng diễn viên/đạo cụ/bối cảnh/trang phục/nhân vật/khung hình phân cảnh).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.contracts.image_generation import ImageResolutionProfile, ImageTargetRatio
from app.dependencies import get_db
from app.models.studio import (
    ShotDetail,
    ShotFrameType,
    ShotFrameImage,
)
from app.schemas.common import ApiResponse, created_response, success_response
from app.schemas.studio.shots import RenderedShotFramePromptRead, ShotLinkedAssetItem
from app.api.v1.routes.film.common import TaskCreated
from app.services.studio.image_task_references import (
    resolve_reference_image_refs_by_file_ids as _resolve_reference_image_refs_by_file_ids_service,
)
from app.services.studio.generation.asset_image import (
    build_actor_image_base_draft as _build_actor_image_base_draft_service,
    build_actor_image_submission_payload as _build_actor_image_submission_payload_service,
    build_asset_image_base_draft as _build_asset_image_base_draft_service,
    build_asset_image_context as _build_asset_image_context_service,
    build_asset_image_submission_payload as _build_asset_image_submission_payload_service,
    build_character_image_base_draft as _build_character_image_base_draft_service,
    build_character_image_submission_payload as _build_character_image_submission_payload_service,
    derive_asset_image_preview as _derive_asset_image_preview_service,
)
from app.services.studio.generation.frame import (
    build_frame_base_draft as _build_frame_base_draft_service,
    build_frame_context as _build_frame_context_service,
    build_frame_submission_payload as _build_frame_submission_payload_service,
    derive_frame_preview as _derive_frame_preview_service,
)
from app.services.film.shot_frame_prompt_tasks import build_run_args as _build_shot_frame_prompt_run_args_service
from app.services.studio.generation.frame.derive_preview import (
    to_rendered_shot_frame_prompt_read as _to_rendered_shot_frame_prompt_read_service,
)
from app.services.studio.image_task_runner import create_image_task_and_link as _create_image_task_and_link_service


router = APIRouter()


class StudioImageTaskRequest(BaseModel):
    """thân yêu cầu tác vụ ảnh dùng riêng cho Studio:ID mô hình tùy chọn, không truyền thì dùng mô hình ảnh mặc định；provider được tra ngược từ mô hình.

    image_id là ID mô hình ảnh cụ thể, ví dụ:
    - - Ảnh diễn viên: ActorImage.id：ActorImage.id
    - - Ảnh bối cảnh: SceneImage.id：SceneImage.id
    - - Ảnh đạo cụ: PropImage.id：PropImage.id
    - - Ảnh trang phục: CostumeImage.id：CostumeImage.id
    - - Ảnh nhân vật: CharacterImage.id：CharacterImage.id
    - - Ảnh khung phân cảnh: ShotFrameImage.id：ShotFrameImage.id
    """

    model_id: str | None = Field(
        None,
        description="Mô hình tùy chọn ID(models.id); nếu không truyền sẽ dùng ModelSettings.default_image_model_id;Provider tra ngược từ liên kết của mô hình",
    )
    image_id: int | None = Field(
        None,
        description="ID mô hình ảnh, như ActorImage.id / SceneImage.id / PropImage.id...; phải khớp với ID chủ thể của đường dẫn",
    )
    prompt: str | None = Field(
        None,
        description="Prompt (do phía trước truyền). Giao diện tạo tác vụ bắt buộc phải truyền; giao diện render-prompt có thể không truyền",
    )
    images: list[str] = Field(
        default_factory=list,
        description="Danh sách file_id của ảnh tham chiếu (nhiều ảnh, thứ tự có hiệu lực). API tạo tác vụ sẽ dựa vào file_id để phân tích thành ảnh tham chiếu từ dữ liệu",
    )


class ShotFrameImageTaskRequest(BaseModel):
    """Thân yêu cầu tạo ảnh khung hình phân cảnh: chỉ định vị ShotFrameImage dựa trên `shot_id + frame_type`.

    Dùng để thay thế cách truyền trực tiếp ShotFrameImage.id qua `image_id` trong giao diện cũ.
    """

    model_id: str | None = Field(
        None,
        description="Mô hình tùy chọn ID(models.id); nếu không truyền sẽ dùng ModelSettings.default_image_model_id;Provider tra ngược từ liên kết của mô hình",
    )
    frame_type: ShotFrameType = Field(..., description="first | last | key")
    prompt: str = Field(
        ...,
        description="Prompt (do phía trước truyền vào, bắt buộc với interface tạo tác vụ).",
        min_length=1,
    )
    images: list[ShotLinkedAssetItem] = Field(
        default_factory=list,
        description=(
            "danh sách mục tài nguyên tham chiếu (nhiều ảnh, thứ tự có hiệu lực). Backend sẽ dùng item.file_id làm ảnh tham chiếu；"
            "Mục không hợp lệ sẽ bị bỏ qua.。"
        ),
    )
    target_ratio: ImageTargetRatio = Field(
        ...,
        description="tỷ lệ khung hình video đích；khung hình chính sẽ sinh theo khung hình này để tăng tính ổn định tham chiếu video sau",
    )
    resolution_profile: ImageResolutionProfile | None = Field(
        "standard",
        description="Hạng độ phân giải đầu ra khung hình chính, mặc định standard",
    )


class ShotFramePromptRenderRequest(BaseModel):
    """Body yêu cầu render prompt khung hình phân cảnh.。"""

    frame_type: ShotFrameType = Field(..., description="first | last | key")
    prompt: str = Field(
        ...,
        description="prompt nền gốc. API render yêu cầu truyền rõ, dùng để sinh prompt cuối.",
        min_length=1,
    )
    images: list[ShotLinkedAssetItem] = Field(
        default_factory=list,
        description="Danh sách mục tài nguyên tham chiếu (nhiều mục, thứ tự có hiệu lực). Backend sẽ dùng item.file_id làm ảnh tham chiếu; các mục không hợp lệ sẽ bị bỏ qua.",
    )


class RenderedPromptResponse(BaseModel):
    prompt: str = Field(..., description="Prompt sau kết xuất (đã áp mẫu và thay thế biến)")
    images: list[str] = Field(
        default_factory=list,
        description="Danh sách file_id ảnh tham chiếu (tự chọn; thứ tự có hiệu lực)",
    )


async def _load_frame_render_guidance(
    *,
    db: AsyncSession,
    shot_id: str,
    frame_type: ShotFrameType,
) -> dict[str, str]:
    """Đọc các ràng buộc phân cảnh ưu tiên cao cần giữ lại cho prompt hình ảnh cuối cùng.。"""
    try:
        run_args = await _build_shot_frame_prompt_run_args_service(
            db,
            shot_id=shot_id,
            frame_type=frame_type.value if hasattr(frame_type, "value") else str(frame_type),
        )
    except HTTPException:
        return {
            "director_command_summary": "",
            "continuity_guidance": "",
            "frame_specific_guidance": "",
            "composition_anchor": "",
            "screen_direction_guidance": "",
        }

    input_dict = dict(run_args.get("input") or {})
    return {
        "director_command_summary": str(input_dict.get("director_command_summary") or "").strip(),
        "continuity_guidance": str(input_dict.get("continuity_guidance") or "").strip(),
        "frame_specific_guidance": str(input_dict.get("frame_specific_guidance") or "").strip(),
        "composition_anchor": str(input_dict.get("composition_anchor") or "").strip(),
        "screen_direction_guidance": str(input_dict.get("screen_direction_guidance") or "").strip(),
    }



@router.post(
    "/actors/{actor_id}/image-tasks",
    response_model=ApiResponse[TaskCreated],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo ảnh diễn viên (phiên bản tác vụ)",
)
async def create_actor_image_generation_task(
    actor_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCreated]:
    """tạo tác vụ sinh ảnh cho diễn viên được chỉ định, và liên kết qua `GenerationTaskLink`."""
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="prompt is required for actor generation",
        )
    submission = await _build_actor_image_submission_payload_service(
        db,
        actor_id=actor_id,
        image_id=body.image_id,
        prompt=prompt,
        images=body.images,
    )
    ref_images = await _resolve_reference_image_refs_by_file_ids_service(db, file_ids=submission.images)
    task_id = await _create_image_task_and_link_service(
        db=db,
        model_id=body.model_id,
        relation_type=submission.relation_type,
        relation_entity_id=submission.relation_entity_id,
        prompt=submission.prompt,
        images=ref_images if ref_images else None,
    )
    return created_response(TaskCreated(task_id=task_id))


@router.post(
    "/actors/{actor_id}/render-prompt",
    response_model=ApiResponse[RenderedPromptResponse],
    status_code=status.HTTP_200_OK,
    summary="summary=Render prompt ảnh diễn viên,",
)
async def render_actor_image_prompt(
    actor_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RenderedPromptResponse]:
    base = await _build_actor_image_base_draft_service(
        db,
        actor_id=actor_id,
        image_id=body.image_id,
    )
    context = _build_asset_image_context_service(base=base)
    derived = _derive_asset_image_preview_service(base=base, context=context)
    return success_response(RenderedPromptResponse(prompt=derived.prompt, images=derived.images))


@router.post(
    "/assets/{asset_type}/{asset_id}/image-tasks",
    response_model=ApiResponse[TaskCreated],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo hình ảnh đạo cụ/bối cảnh/trang phục (phiên bản tác vụ)",
)
async def create_asset_image_generation_task(
    asset_type: str,
    asset_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCreated]:
    """Tạo tác vụ tạo ảnh cho đạo cụ/bối cảnh/trang phục.

    - asset_type: prop / scene / costume
    - Tham số path asset_id là ID tài nguyên tương ứng
    - body.image_id - body.image_id phải là ID của bản ghi tương ứng trong bảng hình ảnh dưới tài nguyên (PropImage/SceneImage/CostumeImage) ID（PropImage/SceneImage/CostumeImage）
    """
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="prompt is required for asset image generation",
        )
    submission = await _build_asset_image_submission_payload_service(
        db,
        asset_type=asset_type,
        asset_id=asset_id,
        image_id=body.image_id,
        prompt=prompt,
        images=body.images,
    )
    ref_images = await _resolve_reference_image_refs_by_file_ids_service(db, file_ids=submission.images)

    task_id = await _create_image_task_and_link_service(
        db=db,
        model_id=body.model_id,
        relation_type=submission.relation_type,
        relation_entity_id=submission.relation_entity_id,
        prompt=submission.prompt,
        images=ref_images if ref_images else None,
    )
    return created_response(TaskCreated(task_id=task_id))


@router.post(
    "/assets/{asset_type}/{asset_id}/render-prompt",
    response_model=ApiResponse[RenderedPromptResponse],
    status_code=status.HTTP_200_OK,
    summary="Kết xuất prompt ảnh đạo cụ/bối cảnh/trang phục",
)
async def render_asset_image_prompt(
    asset_type: str,
    asset_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RenderedPromptResponse]:
    base = await _build_asset_image_base_draft_service(
        db,
        asset_type=asset_type,
        asset_id=asset_id,
        image_id=body.image_id,
    )
    context = _build_asset_image_context_service(base=base)
    derived = _derive_asset_image_preview_service(base=base, context=context)
    return success_response(RenderedPromptResponse(prompt=derived.prompt, images=derived.images))


@router.post(
    "/characters/{character_id}/image-tasks",
    response_model=ApiResponse[TaskCreated],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo ảnh nhân vật (phiên bản tác vụ)",
)
async def create_character_image_generation_task(
    character_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCreated]:
    """Tạo tác vụ tạo ảnh cho nhân vật (tương ứng nghiệp vụ CharacterImage)."

    - tham số path character_id là Character.id
    - body.image_id - body.image_id phải là CharacterImage.id dưới nhân vật này CharacterImage.id
    """
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="prompt is required for character image generation",
        )
    submission = await _build_character_image_submission_payload_service(
        db,
        character_id=character_id,
        image_id=body.image_id,
        prompt=prompt,
        images=body.images,
    )
    ref_images = await _resolve_reference_image_refs_by_file_ids_service(db, file_ids=submission.images)
    task_id = await _create_image_task_and_link_service(
        db=db,
        model_id=body.model_id,
        relation_type=submission.relation_type,
        relation_entity_id=submission.relation_entity_id,
        prompt=submission.prompt,
        images=ref_images if ref_images else None,
    )
    return created_response(TaskCreated(task_id=task_id))


@router.post(
    "/characters/{character_id}/render-prompt",
    response_model=ApiResponse[RenderedPromptResponse],
    status_code=status.HTTP_200_OK,
    summary="summary=Render prompt ảnh nhân vật,",
)
async def render_character_image_prompt(
    character_id: str,
    body: StudioImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RenderedPromptResponse]:
    base = await _build_character_image_base_draft_service(
        db,
        character_id=character_id,
        image_id=body.image_id,
    )
    context = _build_asset_image_context_service(base=base)
    derived = _derive_asset_image_preview_service(base=base, context=context)
    return success_response(RenderedPromptResponse(prompt=derived.prompt, images=derived.images))


@router.post(
    "/shot/{shot_id}/frame-image-tasks",
    response_model=ApiResponse[TaskCreated],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo ảnh khung phân cảnh của phân cảnh (phiên bản tác vụ)",
)
async def create_shot_frame_image_generation_task(
    shot_id: str,
    body: ShotFrameImageTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCreated]:
    """Tạo tác vụ cho ảnh khung hình phân cảnh (tự định vị dữ liệu dựa trên `shot_id + frame_type`)."""
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="prompt is required for shot frame generation",
        )
    shot_detail = await db.get(ShotDetail, shot_id)
    if shot_detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ShotDetail not found")
    render_guidance = await _load_frame_render_guidance(
        db=db,
        shot_id=shot_id,
        frame_type=body.frame_type,
    )
    base = _build_frame_base_draft_service(
        shot_id=shot_id,
        frame_type=body.frame_type,
        prompt=prompt,
        director_command_summary=render_guidance["director_command_summary"],
        continuity_guidance=render_guidance["continuity_guidance"],
        frame_specific_guidance=render_guidance["frame_specific_guidance"],
        composition_anchor=render_guidance["composition_anchor"],
        screen_direction_guidance=render_guidance["screen_direction_guidance"],
    )
    context = _build_frame_context_service(
        shot_id=shot_id,
        frame_type=body.frame_type,
        items=body.images,
    )
    submission = _build_frame_submission_payload_service(
        base=base,
        context=context,
    )
    ref_images = await _resolve_reference_image_refs_by_file_ids_service(db, file_ids=submission.images)

    # Định vị ShotFrameImage qua shot_id và frame_type, làm đối tượng ghi CSDL; nếu không tồn tại thì tạo bản ghi giữ chỗ.
    shot_frame_image_stmt = (
        select(ShotFrameImage)
        .where(ShotFrameImage.shot_detail_id == shot_id, ShotFrameImage.frame_type == body.frame_type)
        .limit(1)
    )
    shot_frame_image = (await db.execute(shot_frame_image_stmt)).scalars().first()
    if shot_frame_image is None:
        # Thiếu slot ShotFrameImage cho frame_type tương ứng: tạo bản ghi giữ chỗ (file_id được phép để trống).
        # # Sau khi tạo ảnh hoàn tất, sẽ ghi đè file_id. file_id。
        shot_frame_image = ShotFrameImage(
            shot_detail_id=shot_id,
            frame_type=body.frame_type,
            file_id=None,
            width=None,
            height=None,
            format="png",
        )
        db.add(shot_frame_image)
        await db.flush()
        await db.refresh(shot_frame_image)
    else:
        # Nếu đã tồn tại thì bổ sung trường mặc định (không ghi đè file_id).
        if not shot_frame_image.format:
            shot_frame_image.format = "png"

    submission_extra = dict(submission.extra or {})
    task_id = await _create_image_task_and_link_service(
        db=db,
        model_id=body.model_id,
        relation_type="shot_frame_image",
        relation_entity_id=str(shot_frame_image.id),
        prompt=submission.prompt,
        images=ref_images if ref_images else None,
        target_ratio=body.target_ratio,
        resolution_profile=body.resolution_profile,
        purpose="video_reference",
        render_context=submission_extra.get("render_context"),
    )
    return created_response(TaskCreated(task_id=task_id))


@router.post(
    "/shot/{shot_id}/frame-render-prompt",
    response_model=ApiResponse[RenderedShotFramePromptRead],
    status_code=status.HTTP_200_OK,
    summary="summary=Render prompt khung hình phân cảnh,",
)
async def render_shot_frame_prompt(
    shot_id: str,
    body: ShotFramePromptRenderRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RenderedShotFramePromptRead]:
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="prompt is required for shot frame render",
        )
    render_guidance = await _load_frame_render_guidance(
        db=db,
        shot_id=shot_id,
        frame_type=body.frame_type,
    )
    base = _build_frame_base_draft_service(
        shot_id=shot_id,
        frame_type=body.frame_type,
        prompt=prompt,
        director_command_summary=render_guidance["director_command_summary"],
        continuity_guidance=render_guidance["continuity_guidance"],
        frame_specific_guidance=render_guidance["frame_specific_guidance"],
        composition_anchor=render_guidance["composition_anchor"],
        screen_direction_guidance=render_guidance["screen_direction_guidance"],
    )
    context = _build_frame_context_service(
        shot_id=shot_id,
        frame_type=body.frame_type,
        items=body.images,
    )
    rendered = _to_rendered_shot_frame_prompt_read_service(
        derived=_derive_frame_preview_service(
            base=base,
            context=context,
        )
    )
    return success_response(rendered)
