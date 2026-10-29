"""Giao diện CRUD cấu hình nền tảng liên quan LLM: Provider / Model / ModelSettings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.llm import ModelCategoryKey
from app.schemas.common import ApiResponse, PaginatedData, created_response, empty_response, success_response
from app.schemas.llm import (
    ImageGenerationOptionsRead,
    ModelCreate,
    ModelRead,
    ModelSettingsRead,
    ModelSettingsUpdate,
    ModelUpdate,
    ProviderCreate,
    ProviderRead,
    ProviderSupportedRead,
    VideoGenerationOptionsRead,
    ProviderUpdate,
)
from app.services.llm.manage import (
    create_model as create_model_service,
    create_provider as create_provider_service,
    delete_model as delete_model_service,
    delete_provider as delete_provider_service,
    get_model as get_model_service,
    get_model_settings as get_model_settings_service,
    get_provider as get_provider_service,
    get_image_generation_options as get_image_generation_options_service,
    get_video_generation_options as get_video_generation_options_service,
    list_supported_providers as list_supported_providers_service,
    list_models_paginated,
    list_providers_paginated,
    update_model as update_model_service,
    update_model_settings as update_model_settings_service,
    update_provider as update_provider_service,
)

router = APIRouter()

# Các trường cho phép sắp xếp danh sách (tránh tiêm)
PROVIDER_ORDER_FIELDS = {"name", "created_at", "updated_at"}
MODEL_ORDER_FIELDS = {"name", "category", "created_at", "updated_at"}
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


# ---------- Provider ----------


@router.get(
    "/providers",
    response_model=ApiResponse[PaginatedData[ProviderRead]],
    summary="Liệt kê nhà cung cấp mô hình (phân trang)",
)
async def list_providers(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Từ khóa, lọc theo name/description"),
    order: str | None = Query(None, description="Trường sắp xếp: name, created_at, updated_at"),
    is_desc: bool = Query(False, description="Sắp xếp giảm dần hay không"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Số mục mỗi trang"),
) -> ApiResponse[PaginatedData[ProviderRead]]:
    return await list_providers_paginated(
        db,
        q=q,
        order=order,
        is_desc=is_desc,
        page=page,
        page_size=page_size,
        allow_fields=PROVIDER_ORDER_FIELDS,
    )


@router.get(
    "/providers/supported",
    response_model=ApiResponse[list[ProviderSupportedRead]],
    summary="Liệt kê năng lực nhà cung cấp được hệ thống hỗ trợ",
)
async def list_supported_providers(
    category: ModelCategoryKey | None = Query(None, description="Lọc theo hạng mục mô hình: text/image/video"),
) -> ApiResponse[list[ProviderSupportedRead]]:
    items = list_supported_providers_service(category=category)
    return success_response(items)


@router.get(
    "/image-generation-options",
    response_model=ApiResponse[ImageGenerationOptionsRead],
    summary="Lấy tùy chọn quy cách khung hình chính của mô hình hình ảnh mặc định hiện tại",
)
async def get_image_generation_options(
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ImageGenerationOptionsRead]:
    data = await get_image_generation_options_service(db)
    return success_response(data)


@router.get(
    "/video-generation-options",
    response_model=ApiResponse[VideoGenerationOptionsRead],
    summary="Lấy tùy chọn tỉ lệ động của mô hình video mặc định hiện tại",
)
async def get_video_generation_options(
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[VideoGenerationOptionsRead]:
    data = await get_video_generation_options_service(db)
    return success_response(data)


@router.post(
    "/providers",
    response_model=ApiResponse[ProviderRead],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo nhà cung cấp mô hình",
)
async def create_provider(
    body: ProviderCreate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ProviderRead]:
    provider = await create_provider_service(db, body=body)
    return created_response(ProviderRead.model_validate(provider))


@router.get(
    "/providers/{provider_id}",
    response_model=ApiResponse[ProviderRead],
    summary="Lấy một nhà cung cấp mô hình",
)
async def get_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ProviderRead]:
    provider = await get_provider_service(db, provider_id=provider_id)
    return success_response(ProviderRead.model_validate(provider))


@router.patch(
    "/providers/{provider_id}",
    response_model=ApiResponse[ProviderRead],
    summary="Cập nhật nhà cung cấp mô hình",
)
async def update_provider(
    provider_id: str,
    body: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ProviderRead]:
    provider = await update_provider_service(db, provider_id=provider_id, body=body)
    return success_response(ProviderRead.model_validate(provider))


@router.delete(
    "/providers/{provider_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Xóa nhà cung cấp mô hình",
)
async def delete_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    await delete_provider_service(db, provider_id=provider_id)
    return empty_response()


# ---------- Model ----------


@router.get(
    "/models",
    response_model=ApiResponse[PaginatedData[ModelRead]],
    summary="Liệt kê mô hình (phân trang)",
)
async def list_models(
    db: AsyncSession = Depends(get_db),
    provider_id: str | None = Query(None, description="lọc theo nhà cung cấp"),
    category: ModelCategoryKey | None = Query(None, description="Lọc theo hạng mục mô hình"),
    q: str | None = Query(None, description="Từ khóa, lọc theo name/description"),
    order: str | None = Query(None, description="Trường sắp xếp: name, category, created_at, updated_at"),
    is_desc: bool = Query(False, description="Sắp xếp giảm dần hay không"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Số mục mỗi trang"),
) -> ApiResponse[PaginatedData[ModelRead]]:
    return await list_models_paginated(
        db,
        provider_id=provider_id,
        category=category,
        q=q,
        order=order,
        is_desc=is_desc,
        page=page,
        page_size=page_size,
        allow_fields=MODEL_ORDER_FIELDS,
    )


@router.post(
    "/models",
    response_model=ApiResponse[ModelRead],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mô hình",
)
async def create_model(
    body: ModelCreate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ModelRead]:
    model = await create_model_service(db, body=body)
    return created_response(ModelRead.model_validate(model))


@router.get(
    "/models/{model_id}",
    response_model=ApiResponse[ModelRead],
    summary="Lấy một mô hình",
)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ModelRead]:
    model = await get_model_service(db, model_id=model_id)
    return success_response(ModelRead.model_validate(model))


@router.patch(
    "/models/{model_id}",
    response_model=ApiResponse[ModelRead],
    summary="Cập nhật mô hình",
)
async def update_model(
    model_id: str,
    body: ModelUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ModelRead]:
    model = await update_model_service(db, model_id=model_id, body=body)
    return success_response(ModelRead.model_validate(model))


@router.delete(
    "/models/{model_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Xóa mô hình",
)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    await delete_model_service(db, model_id=model_id)
    return empty_response()


# ---------- ModelSettings (đơn thể) ----------


@router.get(
    "/model-settings",
    response_model=ApiResponse[ModelSettingsRead],
    summary="Lấy cài đặt toàn cục của mô hình (đơn lệ)",
)
async def get_model_settings(
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ModelSettingsRead]:
    settings = await get_model_settings_service(db)
    return success_response(ModelSettingsRead.model_validate(settings))


@router.put(
    "/model-settings",
    response_model=ApiResponse[ModelSettingsRead],
    summary="Cập nhật cài đặt toàn cục của mô hình (đơn lệ)",
)
async def update_model_settings(
    body: ModelSettingsUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ModelSettingsRead]:
    settings = await update_model_settings_service(db, body=body)
    return success_response(ModelSettingsRead.model_validate(settings))
