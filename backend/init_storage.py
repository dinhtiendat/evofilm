import asyncio

from app.core.storage import init_storage


async def _main() -> None:
    """Khởi tạo bộ lưu trữ đối tượng (ví dụ tạo bucket)."""
    # boto3 là thư viện đồng bộ, ở đây dùng thread pool để tránh chặn event loop
    await asyncio.to_thread(init_storage)


if __name__ == "__main__":
    asyncio.run(_main())

