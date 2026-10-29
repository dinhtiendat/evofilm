"""CRUD thực thể thống nhất: actor/character/scene/prop/costume."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.common import ApiResponse, PaginatedData, created_response, empty_response, paginated_response, success_response
from app.schemas.studio.entity_existence import (
    EntityNameExistenceCheckRequest,
    EntityNameExistenceCheckResponse,
)
from app.services.studio import StudioEntitiesService

router = APIRouter()


@router.post(
    "/existence-check",
    response_model=ApiResponse[EntityNameExistenceCheckResponse],
    summary="Kiểm tra hàng loạt tên tài nguyên có tồn tại không (khớp mờ, không phân trang)",
)
async def check_entity_names_existence(
    body: EntityNameExistenceCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[EntityNameExistenceCheckResponse]:
    service = StudioEntitiesService(db)
    data = await service.check_names_existence(
        project_id=body.project_id,
        shot_id=body.shot_id,
        character_names=body.character_names,
        prop_names=body.prop_names,
        scene_names=body.scene_names,
        costume_names=body.costume_names,
    )
    return success_response(EntityNameExistenceCheckResponse.model_validate(data))


@router.get("/{entity_type}", response_model=ApiResponse[PaginatedData[dict[str, Any]]], summary="Danh sách thực thể thống nhất (phân trang)")
async def list_entities(
    entity_type: str,
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Từ khóa, lọc theo name/description"),
    style: str | None = Query(None, description="Thể loại/phong cách (một giá trị)"),
    visual_style: str | None = Query(None, description="Hình thức biểu diễn khung hình (giá trị đơn: người thật/hoạt hình)"),
    order: str | None = Query(None),
    is_desc: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> ApiResponse[PaginatedData[dict[str, Any]]]:
    service = StudioEntitiesService(db)
    payload, total = await service.list_entities(
        entity_type=entity_type,
        q=q,
        style=style,
        visual_style=visual_style,
        order=order,
        is_desc=is_desc,
        page=page,
        page_size=page_size,
    )
    return paginated_response(payload, page=page, page_size=page_size, total=total)


@router.post("/{entity_type}", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED, summary="Tạo thực thể thống nhất")
async def create_entity(
    entity_type: str,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict[str, Any]]:
    service = StudioEntitiesService(db)
    payload = await service.create_entity(entity_type=entity_type, body=body)
    return created_response(payload)


@router.get("/{entity_type}/{entity_id}", response_model=ApiResponse[dict[str, Any]], summary="Lấy thực thể thống nhất")
async def get_entity(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)) -> ApiResponse[dict[str, Any]]:
    service = StudioEntitiesService(db)
    payload = await service.get_entity(entity_type=entity_type, entity_id=entity_id)
    return success_response(payload)


@router.patch("/{entity_type}/{entity_id}", response_model=ApiResponse[dict[str, Any]], summary="Cập nhật thực thể thống nhất")
async def update_entity(
    entity_type: str,
    entity_id: str,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict[str, Any]]:
    service = StudioEntitiesService(db)
    payload = await service.update_entity(entity_type=entity_type, entity_id=entity_id, body=body)
    return success_response(payload)


@router.delete("/{entity_type}/{entity_id}", response_model=ApiResponse[None], summary="Xóa thực thể thống nhất")
async def delete_entity(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)) -> ApiResponse[None]:
    service = StudioEntitiesService(db)
    await service.delete_entity(entity_type=entity_type, entity_id=entity_id)
    return empty_response()


@router.get(
    "/{entity_type}/{entity_id}/images",
    response_model=ApiResponse[PaginatedData[dict[str, Any]]],
    summary="Liệt kê ảnh thực thể thống nhất (phân trang)",
)
async def list_entity_images(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    order: str | None = Query(None),
    is_desc: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> ApiResponse[PaginatedData[dict[str, Any]]]:
    service = StudioEntitiesService(db)
    payload, total = await service.list_entity_images(
        entity_type=entity_type,
        entity_id=entity_id,
        order=order,
        is_desc=is_desc,
        page=page,
        page_size=page_size,
    )
    return paginated_response(payload, page=page, page_size=page_size, total=total)


@router.post(
    "/{entity_type}/{entity_id}/images",
    response_model=ApiResponse[dict[str, Any]],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo ảnh thực thể thống nhất",
)
async def create_entity_image(
    entity_type: str,
    entity_id: str,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict[str, Any]]:
    service = StudioEntitiesService(db)
    payload = await service.create_entity_image(entity_type=entity_type, entity_id=entity_id, body=body)
    return created_response(payload)


@router.patch(
    "/{entity_type}/{entity_id}/images/{image_id}",
    response_model=ApiResponse[dict[str, Any]],
    summary="Cập nhật ảnh thực thể thống nhất",
)
async def update_entity_image(
    entity_type: str,
    entity_id: str,
    image_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict[str, Any]]:
    service = StudioEntitiesService(db)
    payload = await service.update_entity_image(
        entity_type=entity_type,
        entity_id=entity_id,
        image_id=image_id,
        body=body,
    )
    return success_response(payload)


@router.delete(
    "/{entity_type}/{entity_id}/images/{image_id}",
    response_model=ApiResponse[None],
    summary="Xóa ảnh thực thể thống nhất",
)
async def delete_entity_image(
    entity_type: str,
    entity_id: str,
    image_id: int,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    service = StudioEntitiesService(db)
    await service.delete_entity_image(entity_type=entity_type, entity_id=entity_id, image_id=image_id)
    return empty_response()
