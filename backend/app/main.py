"""Điểm vào ứng dụng FastAPI."""

# logo marker
_logo_marker = True

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import router as api_v1_router
from app.bootstrap import bootstrap_all_registries
from app.config import settings
from app.schemas.common import ApiResponse


def _error_message(detail: object) -> str:
    """Đổi detail của ngoại lệ thành message đọc được ở phía front-end."""
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        parts = []
        for item in detail:
            if isinstance(item, dict) and "msg" in item:
                loc = item.get("loc", ())
                loc_str = ".".join(str(x) for x in loc if x != "body")
                parts.append(f"{loc_str}: {item['msg']}" if loc_str else item["msg"])
            else:
                parts.append(str(item))
        return "; ".join(parts) if parts else "Validation error"
    return str(detail)


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Gộp ngoại lệ HTTP về dạng { code, message, data: null }."""
    from fastapi import HTTPException

    if isinstance(exc, HTTPException):
        code = exc.status_code
        message = _error_message(exc.detail)
    else:
        code = 500
        message = "Internal server error"
    body = ApiResponse[None](code=code, message=message, data=None, meta=None).model_dump()
    return JSONResponse(status_code=code, content=body)


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Gộp ngoại lệ validation 422 về dạng { code: 422, message, data: null }."""
    assert isinstance(exc, RequestValidationError)
    message = _error_message(exc.errors())
    body = ApiResponse[None](code=422, message=message, data=None, meta=None).model_dump()
    return JSONResponse(status_code=422, content=body)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Vòng đời ứng dụng: khởi tạo khi start, dọn dẹp khi shutdown."""
    # Khi khởi động: đăng ký providers + đăng ký task executor (idempotent)
    bootstrap_all_registries()
    yield
    # Khi đóng: dọn dẹp tài nguyên
    pass


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Định dạng lỗi thống nhất: { code, message, data: null }
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, http_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.api_v1_prefix)
# Đường dẫn film skill cũng được gắn vào app chính để /api/v1/film luôn truy cập được


@app.get("/health")
async def health():
    """Kiểm tra sức khỏe (health check)."""
    from app.schemas.common import success_response
    return success_response({"status": "ok"})
