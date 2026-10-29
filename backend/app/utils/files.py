from __future__ import annotations

"""Công cụ liên quan tệp: tạo FileItem từ URL hoặc nội dung base64, và tải lên bộ lưu trữ đối tượng."""

import base64
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.models.studio import FileItem, FileType
from app.models.types import FileUsageKind


async def _infer_file_type_from_ext(ext: str) -> FileType:
    ext = ext.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return FileType.image
    if ext in {".mp4", ".mov", ".mkv", ".avi", ".webm"}:
        return FileType.video
    # Mặc định xử lý như ảnh, nếu người gọi có yêu cầu chi tiết hơn thì bọc thêm ở lớp ngoài
    return FileType.image


@dataclass(frozen=True)
class FileUsageCreateParams:
    """Tham số ghi vào file_usages sau khi tạo FileItem."""

    project_id: str
    chapter_id: str | None = None
    shot_id: str | None = None
    usage_kind: FileUsageKind | str = FileUsageKind.api
    source_ref: str | None = None


async def _infer_file_type_from_content_type(content_type: str | None) -> FileType:
    if not content_type:
        return FileType.image
    ct = content_type.lower()
    if ct.startswith("image/"):
        return FileType.image
    if ct.startswith("video/"):
        return FileType.video
    return FileType.image


async def create_file_from_url_or_b64(
    session: AsyncSession,
    *,
    url: str | None = None,
    b64_data: str | None = None,
    name: str | None = None,
    prefix: str = "files",
    url_request_headers: dict[str, str] | None = None,
    httpx_timeout: float | None = None,
    usage: FileUsageCreateParams | None = None,
) -> FileItem:
    """Tạo FileItem từ nội dung URL remote hoặc base64.

    - Nếu có url: sẽ tải xuống nội dung trước, suy ra content_type và phần mở rộng;
    - Nếu cung cấp b64_data: ưu tiên phân tích MIME type trong tiền tố data URL, nếu không thì mặc định image/png;
    - Luôn tải lên bộ lưu trữ đối tượng qua storage.upload_file, sau đó tạo bản ghi FileItem và trả về.
    - url_request_headers / httpx_timeout: dùng cho trường hợp cần xác thực hoặc tải tệp lớn (ví dụ OpenAI /videos/{id}/content).
    """
    if not url and not b64_data:
        raise ValueError("create_file_from_url_or_b64 cần cung cấp ít nhất một trong url hoặc b64_data")

    content: bytes
    content_type: str | None = None
    filename: str = ""

    if url:
        client_kwargs: dict = {}
        if httpx_timeout is not None:
            client_kwargs["timeout"] = httpx_timeout
        async with httpx.AsyncClient(**client_kwargs) as client:
            resp = await client.get(url, headers=url_request_headers or None)
            resp.raise_for_status()
            content = resp.content
            content_type = resp.headers.get("Content-Type")

        # Suy tên tệp từ URL
        path = Path(httpx.URL(url).path)
        filename = path.name or "file"
    else:
        raw = b64_data or ""
        # hỗ trợ dạng data URL: data:image/png;base64,xxxxxx
        if raw.startswith("data:") and ";base64," in raw:
            header, encoded = raw.split(";base64,", 1)
            # Dạng data:image/png
            mime = header[5:]
            content_type = mime or "image/png"
            content = base64.b64decode(encoded)
        else:
            content_type = "image/png"
            content = base64.b64decode(raw)

        filename = "image.png"

    # Suy ra phần mở rộng và FileType
    _, ext = os.path.splitext(filename)
    file_type = await _infer_file_type_from_content_type(content_type)
    if not ext:
        # Gán hậu tố mặc định theo kiểu
        ext = ".png" if file_type == FileType.image else ".mp4"

    display_name = name or os.path.splitext(filename)[0] or filename

    key = f"{prefix}/{uuid.uuid4().hex}{ext}"
    info = await storage.upload_file(
        key=key,
        data=content,
        content_type=content_type,
        extra_args={"ACL": "public-read"},
    )

    file_id = str(uuid.uuid4())
    file_obj = FileItem(
        id=file_id,
        type=file_type,
        name=display_name,
        thumbnail=info.url,
        tags=[],
        storage_key=key,
    )
    session.add(file_obj)
    await session.flush()
    await session.refresh(file_obj)

    if usage is not None:
        from app.services.studio.file_usages import upsert_file_usage

        await upsert_file_usage(
            session,
            file_id=file_obj.id,
            project_id=usage.project_id,
            chapter_id=usage.chapter_id,
            shot_id=usage.shot_id,
            usage_kind=usage.usage_kind,
            source_ref=usage.source_ref,
        )

    return file_obj

