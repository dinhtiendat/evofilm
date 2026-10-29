
# Jellyfish Backend

Backend API xây trên FastAPI + LangChain/LangGraph + SQLAlchemy, quản lý phụ thuộc bằng **uv**.

## Công nghệ

- **FastAPI**: Khung web
- **LangChain / LangGraph**: điều phối chain và workflow, `PromptTemplate` quản lý prompt
- **SQLAlchemy**: ORM không đồng bộ, mặc định SQLite (có thể đổi PostgreSQL, v.v.)
- **uv**: Quản lý gói và môi trường ảo

## Cấu trúc thư mục

```
backend/
├── pyproject.toml          # Dự án và phụ thuộc (uv)
├── .python-version        # Phiên bản Python
├── app/
│   ├── __init__.py
│   ├── main.py             # Cổng vào FastAPI
│   ├── config.py           # Cấu hình (pydantic-settings)
│   ├── dependencies.py     # tiêm phụ thuộc (ví dụ get_db)
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py # Gom route
│   │       └── routes/     # Route của từng module
│   ├── core/
│   │   └── db.py           # Engine và Base của SQLAlchemy
│   ├── models/             # Mô hình ORM
│   ├── schemas/            # Pydantic request/response
│   ├── services/           # Logic nghiệp vụ
│   └── chains/             # LangChain PromptTemplate、LangGraph
├── tests/
├── .env.example
└── README.md
```

## Quy ước phân lớp hiện tại

Hiện backend đã được sắp xếp theo hướng "dọn dẹp tầng route, chuyển logic nghiệp vụ xuống", nên tiếp tục tuân theo cơ chế phân công dưới đây:

- `app/api/v1/routes/`
  - Chịu trách nhiệm nhận tham số, tiêm phụ thuộc, gọi service, bọc phản hồi
- `app/services/common/`
  - Chịu trách nhiệm xác thực dùng chung, CRUD dùng chung, văn bản lỗi công cộng
- `app/services/studio/`
  - Chịu trách nhiệm các nghiệp vụ chính của Studio: dự án, chương, phân cảnh, tệp, tác vụ hình ảnh
- `app/services/llm/`
  - Chịu trách nhiệm logic quản lý Provider / Model / Settings
- `app/services/film/`
  - Chịu trách nhiệm logic điều phối như tác vụ tạo video, prompt khung hình phân cảnh

Tiêu chí quyết định được khuyến nghị:

- **Được giữ lại trong route**
  - Phân tích tham số
  - `Depends`
  - Gọi service
  - Trả về `ApiResponse`
- **Được đưa vào service**
  - Xác thực xuyên thực thể
  - Chiến lược giá trị mặc định
  - Tương tác tệp/lưu trữ
  - Điều phối tác vụ
  - Gọi workflow AI

## Quy ước phản hồi và lỗi

API hiện tại đã thống nhất dùng vỏ phản hồi `ApiResponse`, API thêm mới sau này cũng nên giữ nhất quán:

- Tạo thành công: `created_response(...)`
- Thành công thường:`success_response(...)`
- Phản hồi rỗng thành công: `empty_response()`
- Phân trang thành công: `paginated_response(...)`

Phong cách lỗi cũng đã bắt đầu được thống nhất, ưu tiên dùng lại:

- `entity_not_found(...)`
- `entity_already_exists(...)`
- `required_field(...)`
- `invalid_choice(...)`
- `not_belong_to(...)`

## Bắt đầu nhanh

### 1. Cài uv (nếu chưa cài)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Vào backend và cài đặt phụ thuộc

```bash
cd backend
uv sync
```

### 3. Cấu hình môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env theo nhu cầu
```

### 4. Khởi tạo database (tùy chọn, MySQL/PostgreSQL v.v.)

Nếu bạn dùng **cấu hình mặc định SQLite** (`DATABASE_URL=sqlite+aiosqlite:///./jellyfish.db`), có thể bỏ qua mục này, tệp sẽ được tự động tạo ở lần truy cập đầu tiên.

nếu chuyển sang **cơ sở dữ liệu ngoài như MySQL / PostgreSQL**, nên khởi tạo cấu trúc bảng thủ công trước:

1. Cấu hình kết nối cơ sở dữ liệu trong `.env` (ví dụ):

   ```env
   # SQLite (mặc định)
   # DATABASE_URL=sqlite+aiosqlite:///./jellyfish.db

   # MySQL (dùng trình điều khiển aiomysql)
   # DATABASE_URL=mysql+aiomysql://user:pass@localhost:3306/jellyfish

   # PostgreSQL
   # DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/jellyfish
   ```

2. Chạy script khởi tạo (dùng uv):

   ```bash
   cd backend
   uv sync               # Đảm bảo phụ thuộc đã cài đặt
   uv run python init_db.py
   ```

Script này sẽ import toàn bộ ORM model và gọi `Base.metadata.create_all()`, tạo 27 bảng nghiệp vụ cần thiết trong CSDL đích.

### 5. Khởi động dịch vụ

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Tài liệu API: http://localhost:8000/docs
- Kiểm tra hoạt động: http://localhost:8000/health
- Ví dụ API v1: http://localhost:8000/api/v1/example/prompt
- Kỹ năng kịch chiếu (xác nhận routing): http://localhost:8000/api/v1/film (GET); trích xuất thực thể / phân cảnh xem bên dưới, cần **POST** và prefix đường dẫn là **/api/v1**.

### API kỹ năng điện ảnh (cần cấu hình OPENAI_API_KEY)

| Phương thức | Đường dẫn đầy đủ | Mô tả |
|------|----------|------|
| GET  | `/api/v1/film` | trả về mô tả endpoint, dùng để xác nhận route đã được đăng ký |
| POST | `/api/v1/film/extract/entities` | Trích xuất nhân vật/địa điểm/đạo cụ |
| POST | `/api/v1/film/extract/shotlist` | Trích xuất bảng phân cảnh/phân cảnh |

Khi chưa cấu hình `OPENAI_API_KEY`, POST trên sẽ trả 503.

## Lệnh thường dùng

| Lệnh | Giải thích |
|------|------|
| `uv sync` | Cài/đồng bộ phụ thuộc |
| `uv sync --group dev` | Đồng bộ phụ thuộc và bao gồm nhóm phát triển (pytest, pylint, v.v.) |
| `uv add <pkg>` | Thêm phụ thuộc |
| `uv run uvicorn app.main:app --reload` | Chạy chế độ phát triển |
| `uv run pytest` | Chạy kiểm thử |
| `uv run pytest tests/... -q` | chạy test được định hướng |
| `uv run pylint app` | Chạy Pylint trên gói `app` (cần đã chạy `uv sync --group dev`) |
| `python -m py_compile <paths>` | kiểm tra cú pháp nhanh |

## Kiểm tra mã nguồn (Pylint)

Khớp với dự án Python mã nguồn mở phổ biến, tùy chọn Pylint tập trung trong `[tool.pylint.*]` của [`pyproject.toml`](pyproject.toml) (bề rộng dòng, phiên bản Python, `jobs=1` v.v.; đồng thời tắt hợp lý các rule gây nhiễu như SQLAlchemy / docstring).

```bash
cd backend
uv sync --group dev
uv run pylint app
```

- **Pylint**: import không dùng, vấn đề style, một số cảnh báo bảo trì...
- **BasedPyright**: cấu hình kiểm tra kiểu nằm trong `[tool.basedpyright]` cùng tệp, dùng cho IDE hoặc CLI `basedpyright` đã cài trên máy; bổ trợ cho Pylint (kiểu so với phong cách / mẫu mã).
- **CI**: PR thay đổi `backend/**` (kể cả nhóm merge khi bật Merge queue) sẽ chạy [`.github/workflows/backend-pylint.yml`](../.github/workflows/backend-pylint.yml) trong thư mục gốc của repo. Nếu muốn Pylint là điều kiện trước khi merge, hãy đặt status check tương ứng (thường là **Backend Pylint / pylint**) thành bắt buộc trong **Branch protection / Rules** của GitHub, xem chú thích đầu tệp workflow đó.

## Kiểm thử

### Cổng vào được khuyến nghị

bây giờ bất kể chạy ở thư mục gốc repo hay thư mục `backend/`, pytest đều đã được cấu hình thống nhất.

Trong thư mục `backend/`:

```bash
cd backend
uv run pytest -q
```

Ở thư mục gốc của kho:

```bash
uv run pytest backend/tests -q
```

### Kiểm thử định hướng thường dùng

Chạy kiểm thử lớp service:

```bash
cd backend
uv run pytest \
  tests/test_common_services.py \
  tests/test_llm_manage.py \
  tests/test_shot_character_links.py \
  tests/test_script_division.py \
  tests/test_studio_files_service.py \
  tests/test_generated_video_service.py \
  tests/test_shot_frame_prompt_tasks_service.py \
  tests/test_image_task_services.py \
  -q
```

Chạy kiểm thử vỏ phản hồi API:

```bash
cd backend
uv run pytest \
  tests/test_api_response_envelopes.py \
  tests/test_llm_api_responses.py \
  tests/test_studio_prompts_categories.py \
  tests/test_studio_api_responses.py \
  tests/test_shot_subresource_api_responses.py \
  tests/test_files_api_responses.py \
  tests/test_task_status_api_responses.py \
  tests/test_shot_character_links_api_responses.py \
  tests/test_image_tasks_api_responses.py \
  tests/test_generated_video_api_responses.py \
  tests/test_tasks_images_api_responses.py \
  -q
```

### Trọng điểm kiểm thử hiện tại

Kiểm thử hiện tại chủ yếu bao phủ ba nhóm mục tiêu:

- **Tầng công cộng**
  - Kiểm tra dùng chung, CRUD dùng chung, văn bản lỗi công cộng
- **Lớp service**
  - Dịch vụ nghiệp vụ chính của `studio`, `llm`, `film`
- **Tầng API**
  - Cấu trúc ngoài `ApiResponse` khi tạo/xóa/lỗi

Nếu chỉ cần xác nhận nhanh các thay đổi của vòng này, nên ưu tiên:

```bash
cd backend
uv run pytest tests/test_common_services.py tests/test_studio_api_responses.py -q
```

### Kiểm tra nhanh cấp cú pháp

Khi thực hiện tái cấu trúc lớn nhưng tạm thời không muốn chạy toàn bộ kiểm thử, có thể chạy trước một vòng kiểm tra cú pháp:

```bash
cd backend
python -m py_compile $(rg --files app tests)
```

### Mô tả

- `pytest.ini` ở thư mục gốc đã được bổ sung, tránh khi chạy từ thư mục gốc repo test không đồng bộ bị bỏ qua nhầm
- Kiểm thử bất đồng bộ thống nhất dùng `@pytest.mark.asyncio`
- Trước khi liên động LLM thực, vui lòng chạy `uv sync --group dev`

## Giải thích mở rộng

- **Cơ sở dữ liệu**: thêm model mới trong `app/models/` và kế thừa `Base`, có thể gọi `init_db()` trong `app/core/db.py` để tạo bảng.
- **Prompt**: thêm `PromptTemplate` trong `app/chains/prompts.py`.
- **Quy trình**: định nghĩa `StateGraph` trong `app/chains/graphs.py` và `compile()`, gọi `ainvoke` trong các route.
