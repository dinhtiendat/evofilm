"""Thực thể ứng dụng Celery.

Nguyên tắc triển khai tối thiểu:
- Chỉ dùng Celery như tầng thực thi và client broker;
- Trạng thái/kết quả thực của tác vụ vẫn ghi ngược vào GenerationTask;
- Giai đoạn một không phụ thuộc result backend của Celery.
"""

from celery import Celery
from celery.signals import worker_process_init

from app.config import settings
from app.core.db import reset_db_runtime


celery_app = Celery(
    "jellyfish",
    broker=settings.celery_broker_url,
    include=["app.tasks.execute_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
    timezone="Asia/Shanghai",
    enable_utc=False,
)


@worker_process_init.connect
def _reset_async_db_runtime(**_: object) -> None:
    """sau tiến trình con Celery prefork khởi động, khôi phục runtime DB không đồng bộ."""

    reset_db_runtime()
