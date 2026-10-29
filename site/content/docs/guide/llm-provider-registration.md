---
title: "Đăng ký và mở rộng nhà cung cấp LLM"
weight: 12
description: "cách đăng ký năng lực nhà cung cấp tích hợp trong mã, và đối chiếu với executor tác vụ không đồng bộ."
---

Các khái niệm liên quan đến “nhà cung cấp” trong hệ thống chia làm hai tầng, khi mở rộng thường phải cân nhắc đồng thời cả hai.

## Hai lớp đăng ký, mỗi lớp giải quyết gì

1. **Bảng đăng ký khả năng (tích hợp, trong tiến trình)**
   mô tả "chúng ta nhận biết những provider key, alias nào, hỗ trợ hạng mục mô hình nào, base URL mặc định là gì" v.v.
   Thực hiện nằm trong `app/services/llm/provider_registry.py`, lúc khởi động gọi `bootstrap_builtin_providers()` của `app/services/llm/provider_bootstrap.py` để viết vào bằng `register_many(...)`.
   Lối vào chỉ đọc đối ngoại: `GET /api/v1/llm/providers/supported` (có thể lọc theo `category`), dùng cho phía trước hiển thị khả năng có thể chọn và gợi ý giá trị mặc định.

2. **Bảng đăng ký bộ thực thi tác vụ (loại tác vụ × key nhà cung cấp)**
   mô tả "hàm factory nào dựng executor cho một loại tác vụ không đồng bộ (như sinh ảnh, sinh video) trên một provider key nào đó".
   Thực hiện nằm trong `app/core/tasks/registry.py`, lúc khởi động đăng ký qua `bootstrap_task_adapters()` của `app/core/tasks/bootstrap.py`.
   Worker hoặc đường thực thi inline sẽ phân tích tới thực hiện cụ thể theo thông tin nhà cung cấp trong payload tác vụ.

3. **tầng thích ứng HTTP ra(`app/core/integrations/`)**
   URL, body yêu cầu, phân giải response của các nhà cung cấp như OpenAI / Volcengine được tập trung trong `app/core/integrations/openai/` và `app/core/integrations/volcengine/` (ảnh, video tách tệp riêng); `ImageGenerationTask` / `VideoGenerationTask` chỉ lo vòng đời và nhịp truy vấn lặp, **không** trực tiếp ghép chi tiết httpx.
   Mô hình Pydantic dùng chung cho đầu vào / đầu ra tác vụ nằm trong `app/core/tasks/image_generation_types.py`, `video_generation_types.py`, tránh `tasks` và `integrations` import vòng nhau.

Khi ứng dụng khởi động, `bootstrap_all_registries()` của `app/bootstrap.py` **trước tiên** bootstrap khả năng nhà cung cấp, **rồi** mới bootstrap adapter tác vụ, đảm bảo khi phân giải key nhà cung cấp thì bảng đăng ký đã sẵn sàng.

## Khi thêm nhà cung cấp tích hợp, cần sửa ở đâu

Kiểm tra và bổ sung lần lượt các mục dưới đây (đều lấy "thêm key `acme`" làm ví dụ).

### 1. Spec năng lực: thêm một `ProviderSpec` cho `acme` trong `provider_bootstrap.py`:

- `key`: key chữ thường ổn định, khớp quy ước đặt tên tùy chọn trong đăng ký tác vụ, DB.
- `aliases`: tương thích tên cũ, tên tiếng Trung, cách viết phổ biến.
- `supported_categories`: các hạng mục trong `ModelCategoryKey` mà nhà cung cấp này thực sự nhận được (text / image / video).
- `default_base_url`: nếu UI hoặc khi tạo Provider cần endpoint mặc định thì có thể điền; loại gateway thuần có thể để trống.

nếu key hoặc alias trùng với đăng ký có sẵn, `register_provider` sẽ báo lỗi, tránh ghi đè im lặng.

### 2. Bộ thích ứng tác vụ

Trong `app/core/tasks/bootstrap.py`, với mỗi loại tác vụ cần chạy trên `acme` đều gọi `register_task_adapter`, ví dụ:

- `image_generation` + `acme` → trỏ đến `_build_acme_impl` tương ứng trên `ImageGenerationTask` (hoặc factory tương đương).
- `video_generation` + `acme` → trỏ đến nhà máy tương ứng trên `VideoGenerationTask`.

Khi nhà máy (factory) chưa được đăng ký, việc điều phối tác vụ sẽ gây lỗi ở thời điểm chạy, đây không cùng ý với việc 「có key trong bảng năng lực」: **bảng năng lực chỉ cho biết 「được hỗ trợ ở cấp độ sản phẩm」; bảng tác vụ cho biết 「worker có thể thực thi được」**。

### 3. Lớp thực hiện cụ thể

- Dưới `app/core/integrations/` thêm lớp thích ứng API ảnh / video cho `acme` (gọi httpx và ánh xạ JSON).
- Thêm `_build_acme_impl` trong `image_generation_tasks.py` / `video_generation_tasks.py`, xây Task và tiêm adapter tương ứng (hoặc adapter mặc định).
- Đăng ký `(task_kind, acme)` → nhà máy đó trong `app/core/tasks/bootstrap.py`.
Nếu `provider_resolver` hoặc tầng manage có logic phân nhánh theo nhà cung cấp, thêm nhánh theo nhu cầu, giữ **api mỏng, service dày**.

### 4. Xác minh

- Chạy test liên quan routing LLM (ví dụ các assertion về `providers/supported` trong `backend/tests/test_llm_api_responses.py` có thể mở rộng tùy nhu cầu).
- Chạy test liên quan đến đăng ký tác vụ (ví dụ `backend/tests/test_task_registry.py`).
- Tầng thích ứng có thể bổ sung đơn vị kiểm thử dựa trên `httpx.MockTransport` dưới `backend/tests/core/integrations/`, không cần mạng thật.
- Nếu có mở API mới hoặc trường response mới, theo quy ước của repo chạy `pnpm run openapi:update` và cập nhật generated client phía frontend.

## Mối quan hệ với Provider cấu hình trong cơ sở dữ liệu

- **Bảng đăng ký tích hợp sẵn**: định nghĩa「hệ thống nhận diện những key nhà cung cấp, hạng mục, URL mặc định nào」, không thay thế bản ghi `Provider` trong cơ sở dữ liệu (API Key, base_url theo môi trường v.v. vẫn lưu ở DB).
- **Nhà cung cấp do người dùng / vận hành tạo trong UI**: thường nên chọn key trong danh sách `supported` hoặc tên khớp với cách phân giải alias, để `resolve_provider_key_from_name` có thể về đúng key thống nhất; khi thực thi tác vụ mới tra adapter đã đăng ký theo key.

### Thứ tự ưu tiên Base URL (phân giải theo hạng mục)

Hiện `Provider` hỗ trợ ba nhóm trường URL:

- `base_url`: cổng vào văn bản/ghiêng (khuyến nghị cấu hình gateway OpenAI-tương thích làm mặc định).
- `image_base_url`: điểm vào ghi đè năng lực hình ảnh (tùy chọn).
- `video_base_url`: điểm vào ghi đè năng lực video (tùy chọn).

Thứ tự ưu tiên phân giải runtime:

- image：`image_base_url` > `base_url` > `ProviderSpec.default_base_url`
- video：`video_base_url` > `base_url` > `ProviderSpec.default_base_url`
- text：`base_url` > `ProviderSpec.default_base_url`

## Mẹo kiểm thử

`app.main` đầy đủ sẽ nạp chuỗi routing có phụ thuộc Celery. Khi chỉ kiểm tra hành vi routing LLM, có thể dùng module hỗ trợ test `backend/tests/support/llm_api_app.py` để dựng ứng dụng chỉ gán `/api/v1/llm`, tránh môi trường nhẹ thiếu dependency tùy chọn làm hỏng import.
