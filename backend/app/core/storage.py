"""Gói bộ lưu trữ đối tượng thống nhất (hiện chủ yếu là S3 tương thích).

Mục tiêu thiết kế:：
- Cung cấp các khả năng cơ bản: tải lên / tải xuống / danh sách / chi tiết;
- Hạn chế không gắn với nhà cung cấp cloud cụ thể, chỉ dựa trên giao thức tương thích S3;
- Trong môi trường không đồng bộ của FastAPI, tránh chặn event loop: gọi boto3 qua pool thread bằng anyio.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, BinaryIO

from anyio import to_thread
import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings


@dataclass
class StoredFileInfo:
    """thông tin cơ bản của tệp (cho phía gọi tự đóng gói thành Pydantic schema ở tầng route)."""

    key: str
    url: str
    size: int | None = None
    content_type: str | None = None
    etag: str | None = None
    extra: dict[str, Any] | None = None


def _build_s3_client():
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 chưa cấu hình: vui lòng đặt các trường bắt buộc như s3_bucket_name trong cấu hình")

    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region_name,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        config=BotoConfig(s3={"addressing_style": "virtual"}),
    )
    return client


def _normalize_key(key: str) -> str:
    key = key.lstrip("/")
    base = settings.s3_base_path.strip().strip("/")
    if base:
        return f"{base}/{key}"
    return key


def _build_public_url(key: str) -> str:
    key = _normalize_key(key)
    if settings.s3_public_base_url:
        base = settings.s3_public_base_url.rstrip("/")
        return f"{base}/{key}"
    # fallback: dùng dạng URL S3 chuẩn; có thể điều chỉnh theo nhà cung cấp thực tế
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")
    endpoint = settings.s3_endpoint_url.rstrip("/") if settings.s3_endpoint_url else ""
    if endpoint:
        return f"{endpoint}/{settings.s3_bucket_name}/{key}"
    # Nếu chưa cấu hình endpoint, sẽ lùi về dạng path cơ bản nhất
    return f"/{settings.s3_bucket_name}/{key}"


def init_storage() -> None:
    """Khởi tạo bộ lưu trữ đối tượng (ví dụ tạo bucket).

    Giải thích:：
    - Nếu bucket đã tồn tại thì trả về trực tiếp;
    - Lỗi quyền hạn/cấu hình sẽ ném ngoại lệ, giúp thất bại sớm khi triển khai;
    - Với một số dịch vụ S3 tương thích (MinIO, v.v.), tham số CreateBucket có thể khác, ở đây cố gắng tương thích các trường hợp phổ biến.
    """
    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if not bucket:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    try:
        client.head_bucket(Bucket=bucket)
        return
    except ClientError as e:
        code = str(e.response.get("Error", {}).get("Code", ""))
        # # Không tồn tại thường gặp: 404 / NoSuchBucket / NotFound：404 / NoSuchBucket / NotFound
        if code not in {"404", "NoSuchBucket", "NotFound"}:
            raise

    params: dict[str, Any] = {"Bucket": bucket}
    region = settings.s3_region_name
    # AWS S3 ở us-east-1 không cần LocationConstraint, các region khác thì cần
    if region and region != "us-east-1":
        params["CreateBucketConfiguration"] = {"LocationConstraint": region}

    try:
        client.create_bucket(**params)
    except ClientError as e:
        # # Có thể xảy ra tạo đồng thời hoặc phía máy chủ trả về đã tồn tại
        code = str(e.response.get("Error", {}).get("Code", ""))
        if code in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
            return
        raise

    # Xác nhận lại bucket khả dụng
    client.head_bucket(Bucket=bucket)


async def upload_file(
    *,
    key: str,
    data: bytes | BinaryIO,
    content_type: str | None = None,
    extra_args: dict[str, Any] | None = None,
) -> StoredFileInfo:
    """Tải tệp lên S3. S3。

    Tham số:：
    - key: key logic (không cần kèm base_path, hệ thống sẽ tự nối);
    - data：- data: nội dung byte hoặc đối tượng kiểu tệp;；
    - content_type: loại MIME, ví dụ image/png;
    - extra_args: tham số ExtraArgs truyền xuyên cho boto3, ví dụ {"ACL": "public-read"}.
    """

    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if bucket is None:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    s3_key = _normalize_key(key)
    extra = extra_args.copy() if extra_args else {}
    if content_type and "ContentType" not in extra:
        extra["ContentType"] = content_type

    def _upload():
        if isinstance(data, (bytes, bytearray)):
            return client.put_object(Bucket=bucket, Key=s3_key, Body=data, **extra)
        return client.upload_fileobj(data, bucket, s3_key, ExtraArgs=extra)  # type: ignore[arg-type]

    result = await to_thread.run_sync(_upload)

    etag = None
    if isinstance(result, dict):
        etag = result.get("ETag")

    url = _build_public_url(key)
    return StoredFileInfo(key=s3_key, url=url, etag=etag)


async def download_file(*, key: str) -> bytes:
    """Tải nội dung tệp (đọc cả object vào bộ nhớ)."""
    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if bucket is None:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    s3_key = _normalize_key(key)

    def _download() -> bytes:
        obj = client.get_object(Bucket=bucket, Key=s3_key)
        body = obj["Body"].read()
        return body  # type: ignore[no-any-return]

    return await to_thread.run_sync(_download)


async def get_file_info(*, key: str) -> StoredFileInfo:
    """Lấy siêu dữ liệu tệp (không tải nội dung)."""
    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if bucket is None:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    s3_key = _normalize_key(key)

    def _head() -> dict[str, Any]:
        return client.head_object(Bucket=bucket, Key=s3_key)  # type: ignore[no-any-return]

    meta = await to_thread.run_sync(_head)

    size = int(meta.get("ContentLength") or 0)
    content_type = meta.get("ContentType")
    etag = meta.get("ETag")

    url = _build_public_url(key)
    return StoredFileInfo(
        key=s3_key,
        url=url,
        size=size,
        content_type=content_type,
        etag=etag,
        extra={k: v for k, v in meta.items() if k not in {"ContentLength", "ContentType", "ETag"}},
    )


async def list_files(*, prefix: str = "") -> list[StoredFileInfo]:
    """Liệt kê tệp theo prefix (tối đa một trang, có thể mở rộng phân trang)."""
    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if bucket is None:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    normalized_prefix = _normalize_key(prefix) if prefix else settings.s3_base_path.strip().strip("/")

    def _list() -> list[dict[str, Any]]:
        resp = client.list_objects_v2(Bucket=bucket, Prefix=normalized_prefix or None)
        return resp.get("Contents", [])  # type: ignore[no-any-return]

    contents = await to_thread.run_sync(_list)

    results: list[StoredFileInfo] = []
    for item in contents:
        key = item["Key"]
        size = int(item.get("Size") or 0)
        url = _build_public_url(key)
        results.append(
            StoredFileInfo(
                key=key,
                url=url,
                size=size,
                extra={"LastModified": item.get("LastModified"), "StorageClass": item.get("StorageClass")},
            )
        )
    return results


async def delete_file(*, key: str) -> None:
    """Xóa tệp.。"""
    client = _build_s3_client()
    bucket = settings.s3_bucket_name
    if bucket is None:
        raise RuntimeError("S3 chưa cấu hình: thiếu s3_bucket_name")

    s3_key = _normalize_key(key)

    def _delete() -> None:
        client.delete_object(Bucket=bucket, Key=s3_key)

    await to_thread.run_sync(_delete)

