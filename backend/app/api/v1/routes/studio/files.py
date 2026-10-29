""" Route liên quan vật liệu tệp: tải lên / tải xuống / danh sách / chi tiết."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.common import ApiResponse, PaginatedData, created_response, empty_response, paginated_response, success_response
from app.schemas.studio import FileDetailRead, FileRead, FileUpdate
from app.services.studio.file_usages import list_files_by_scope_paginated
from app.services.studio.files import (
    build_download_response,
    delete_file,
    get_file_detail as get_file_detail_service,
    get_storage_info,
    list_files_paginated,
    update_file_meta as update_file_meta_service,
    upload_file,
)
router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[PaginatedData[FileRead]],
    summary="Danh sách tệp (phân trang)",
)
async def list_files_api(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="từ khóa, lọc name"),
    order: str | None = Query(None),
    is_desc: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    project_id: str | None = Query(None, description="Giới hạn dự án theo file_usages; khi truyền chỉ trả về tệp có bản ghi liên kết trong dự án đó"),
    chapter_title: str | None = Query(None, description="Tiêu đề chương (khớp chính xác, dùng cùng project_id)"),
    shot_title: str | None = Query(None, description="Tiêu đề phân cảnh (khớp chính xác, dùng cùng project_id)"),
) -> ApiResponse[PaginatedData[FileRead]]:
    if chapter_title is not None or shot_title is not None:
        if not project_id:
            raise HTTPException(
                status_code=400,
                detail="project_id is required when chapter_title or shot_title is set",
            )

    if project_id is not None:
        items, total = await list_files_by_scope_paginated(
            db,
            project_id=project_id,
            chapter_title=chapter_title,
            shot_title=shot_title,
            q=q,
            order=order,
            is_desc=is_desc,
            page=page,
            page_size=page_size,
        )
        return paginated_response(
            [FileRead.model_validate(x) for x in items],
            page=page,
            page_size=page_size,
            total=total,
        )
    return await list_files_paginated(
        db,
        q=q,
        order=order,
        is_desc=is_desc,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/upload",
    response_model=ApiResponse[FileRead],
    status_code=status.HTTP_201_CREATED,
    summary="Tải tệp lên và tạo bản ghi FileItem",
)
async def upload_file_api(
    file: UploadFile = File(..., description="file: UploadFile = File(..., description=Tệp nhị phân cần tải lên)"),
    name: str | None = None,
    db: AsyncSession = Depends(get_db),
    project_id: str | None = Form(None, description="Tùy chọn: ID dự án để ghi vào file_usages"),
    chapter_id: str | None = Form(None),
    shot_id: str | None = Form(None),
    usage_kind: str | None = Form(None, description="Ghi vào file_usages khi cung cấp cùng lúc với project_id"),
    source_ref: str | None = Form(None),
) -> ApiResponse[FileRead]:
    obj = await upload_file(
        db,
        file=file,
        name=name,
        project_id=project_id,
        chapter_id=chapter_id,
        shot_id=shot_id,
        usage_kind=usage_kind,
        source_ref=source_ref,
    )
    return created_response(FileRead.model_validate(obj))


@router.get(
    "/{file_id}/download",
    summary="summary=Tải xuống nội dung nhị phân của tệp,",
)
async def download_file_api(
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await build_download_response(db, file_id=file_id)


@router.get(
    "/{file_id}/storage-info",
    response_model=ApiResponse[dict],
    summary="summary=Lấy chi tiết object storage (head_object),（head_object）",
)
async def get_file_storage_info_api(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    return success_response(await get_storage_info(db, file_id=file_id))


@router.get(
    "/{file_id}",
    response_model=ApiResponse[FileDetailRead],
    summary="Lấy chi tiết tệp (siêu dữ liệu + file_usages)",
)
async def get_file_detail(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[FileDetailRead]:
    return success_response(await get_file_detail_service(db, file_id=file_id))


@router.patch(
    "/{file_id}",
    response_model=ApiResponse[FileRead],
    summary="summary=Cập nhật siêu dữ liệu tệp,",
)
async def update_file_meta(
    file_id: str,
    body: FileUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[FileRead]:
    obj = await update_file_meta_service(db, file_id=file_id, body=body)
    return success_response(FileRead.model_validate(obj))


@router.delete(
    "/{file_id}",
    response_model=ApiResponse[None],
    summary="Xóa tệp (bản ghi + đối tượng lưu trữ)",
)
async def delete_file_api(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    await delete_file(db, file_id=file_id)
    return empty_response()
