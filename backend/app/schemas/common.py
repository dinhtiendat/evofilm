"""API Cấu trúc phản hồi toàn cục và phân trang của API.。"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Cấu trúc phản hồi thống nhất khi không phân trang.。"""

    code: int = Field(200, description="Khớp mã trạng thái HTTP")
    message: str = Field("success", description="message: str = Field(success, description=Thông báo)")
    data: T | None = Field(None, description="data: T | None = Field(None, description=dữ liệu thực)")
    meta: dict[str, Any] | None = Field(None, description="meta: dict[str, Any] | None = Field(None, description=siêu dữ liệu đi kèm)")


class Pagination(BaseModel):
    """Thông tin phân trang.。"""

    page: int = Field(..., description="trang hiện tại, bắt đầu từ 1")
    page_size: int = Field(..., description="page_size: int = Field(..., description=số dòng mỗi trang)")
    total: int = Field(..., description="total: int = Field(..., description=tổng số dòng)")
    max_page: int = Field(..., description="max_page: int = Field(..., description=số trang tối đa)")


class PaginatedData(BaseModel, Generic[T]):
    """Cấu trúc data khi có phân trang."""

    items: list[T] = Field(..., description="items: list[T] = Field(..., description=dữ liệu trang hiện tại)")
    pagination: Pagination = Field(..., description="pagination: Pagination = Field(..., description=Thông tin phân trang)")


def success_response(
    data: T,
    *,
    code: int = 200,
    message: str = "success",
    meta: dict[str, Any] | None = None,
) -> ApiResponse[T]:
    """Xây dựng phản hồi thành công không phân trang.。"""
    return ApiResponse(code=code, message=message, data=data, meta=meta)


def created_response(
    data: T,
    *,
    message: str = "success",
    meta: dict[str, Any] | None = None,
) -> ApiResponse[T]:
    """Xây dựng phản hồi tạo thành công.。"""
    return success_response(data, code=201, message=message, meta=meta)


def empty_response(
    *,
    code: int = 200,
    message: str = "success",
    meta: dict[str, Any] | None = None,
) -> ApiResponse[None]:
    """Dựng phản hồi thành công với data là null."""
    return ApiResponse(code=code, message=message, data=None, meta=meta)


def paginated_response(
    items: list[T],
    *,
    page: int,
    page_size: int,
    total: int,
    code: int = 200,
    message: str = "success",
    meta: dict[str, Any] | None = None,
) -> ApiResponse[PaginatedData[T]]:
    """Xây dựng phản hồi thành công có phân trang.。"""
    max_page = max(1, (total + page_size - 1) // page_size) if page_size > 0 else 1
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        max_page=max_page,
    )
    payload = PaginatedData(items=items, pagination=pagination)
    return ApiResponse(code=code, message=message, data=payload, meta=meta)


def error_response(
    *,
    code: int = 500,
    message: str = "error",
) -> ApiResponse[None]:
    """Dựng phản hồi lỗi (data là null)."""
    return ApiResponse(code=code, message=message, data=None)
