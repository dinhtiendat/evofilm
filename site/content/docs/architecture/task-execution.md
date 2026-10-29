---
title: "Kiến trúc thực thi tác vụ"
description: "Ghi lại phạm vi tiếp quản Celery, tầng thực thi tác vụ dài và tầng sự thật tác vụ đang hiệu lực thực tế hiện tại."
weight: 7
---

## Phân lớp thực thi hiện tại

Thực thi tác vụ kéo dài hiện dùng cấu trúc hai lớp:

```text
Lớp sự thật tác vụ nghiệp vụ
├── GenerationTask
├── GenerationTaskLink
├── /api/v1/film/tasks
├── /api/v1/film/tasks/{task_id}/status
└── /api/v1/film/tasks/{task_id}/result

Tầng thực thi
├── FastAPI chịu trách nhiệm tạo tác vụ và trả về task_id
├── Redis làm broker cho Celery
└── Celery Worker thực thi tác vụ chạy lâu

Tầng giao thức thực thi
├── GenerationTask.task_kind
├── task.execute (điểm vào thống nhất của Celery)
└── TaskExecutorRegistry（task_kind → executor）

Phân lớp runtime
├── Web Runtime
│   ├── async SQLAlchemy
│   └── FastAPI dependencies
└── Worker Runtime
    ├── sync SQLAlchemy
    └── Celery task wrappers + worker services
```

Các ràng buộc sau:

- `GenerationTask` vẫn là nguồn đúng duy nhất của trạng thái tác vụ, kết quả, lỗi và yêu cầu hủy
- `/api/v1/film/tasks` hiện là nguồn dữ liệu chính của trung tâm tác vụ toàn cục phía trước
- `GenerationTaskLink` hiện phụ trách query liên kết giữa tác vụ và thực thể nghiệp vụ
- `GenerationTask` hiện cũng ghi chỉ số runtime: `started_at`, `finished_at`
- Giao diện trạng thái tác vụ hiện đang phơi bày trực tiếp:
  - `started_at_ts`
  - `finished_at_ts`
  - `elapsed_ms`
- Frontend không đọc trực tiếp trạng thái task của Celery
- Celery chỉ chịu trách nhiệm thực thi, không chịu trách nhiệm phơi bày trạng thái nghiệp vụ cho frontend
- Việc phát tác vụ thống nhất dùng `task_kind` để nhận dạng bộ thực thi cụ thể

Quy tắc hiện tại của giao diện danh sách tác vụ toàn cục:

- Trả về mặc định:
  - Tác vụ đang hoạt động (`pending / running / streaming`)
  - Các tác vụ vừa kết thúc (kiểm soát theo `recent_seconds`)
- Hỗ trợ lọc theo các chiều sau:
  - `statuses`
  - `task_kind`
  - `relation_type`
  - `relation_entity_id`
- Mục trả về đồng thời bao gồm:
  - Trạng thái và tiến độ tác vụ
  - Chỉ số started / finished / elapsed
  - thông tin executor
  - thông tin relation
  - Thông tin đối tượng điều hướng mặc định của frontend (để trung tâm tác vụ quay về chương/phân cảnh/tài nguyên tương ứng)

Hiện trung tâm tác vụ phía frontend dùng interface này làm nguồn danh sách chính, bản thân trang chỉ bổ sung:

- Ngữ cảnh tô sáng đối tượng liên kết của trang hiện tại
- Siêu dữ liệu UI tức thời như tiêu đề tác vụ, nguồn, đường nhảy

## Hạ tầng hiện tại

Phương án tầng thực thi tối thiểu hiện tại là:

```text
CSDL nghiệp vụ: MySQL
Broker：Redis
Trình thực thi: Celery Worker
```

Quy tắc cấu hình:

- `DATABASE_URL` tiếp tục trỏ đến MySQL
- `CELERY_BROKER_URL` nếu không được chỉ định rõ thì tự ghép theo cấu hình Redis
- `backend/.env` được `app.config` nạp theo đường dẫn tuyệt đối, tránh worker rơi về SQLite mặc định khi thư mục làm việc thay đổi

## Tác vụ đã chuyển sang Celery

Các tác vụ hiện đã chuyển từ `asyncio.create_task(...)` cục bộ sang worker Celery:

- `divide`
- `extract`
- `check-consistency`
- `optimize-script`
- `simplify-script`
- `analyze-character-portrait`
- `analyze-prop-info`
- `analyze-scene-info`
- `analyze-costume-info`
- `image-generation`
- `video-generation`
- `shot-frame-prompt`

Trong đó chia thành hai loại:

### Đã chuyển sang runtime worker sync

- `divide`
- `extract`
- `check-consistency`
- `optimize-script`
- `simplify-script`
- `analyze-character-portrait`
- `analyze-prop-info`
- `analyze-scene-info`
- `analyze-costume-info`

Các tác vụ này hiện được thực hiện qua:

- `db_sync.py`
- `SyncSqlAlchemyTaskStore`
- runtime LLM đồng bộ riêng cho worker
- `script_processing_worker.py`

thực thi, không còn đặt runtime DB không đồng bộ trong Celery worker.

### Đã chuyển sang bộ thực thi ủy thác bất đồng bộ

- `image-generation`
- `video-generation`
- `shot-frame-prompt`

Các tác vụ này hiện cũng đi vào tầng thực thi Celery thống nhất thông qua `task.execute(task_id)`,
nhưng executor dùng `AbstractAsyncDelegatingExecutor` làm cầu nối:

- Trước mỗi lần thực thi tác vụ, xây dựng lại async DB runtime
- Chạy service async có sẵn trong event loop độc lập
- Chủ động giải phóng async engine sau khi kết thúc tác vụ
- Chạy kiểm tra hủy thống nhất trước khi thực thi, sau khi tạo kết quả, sau khi lưu kết quả
- Cấu hình hết thời gian của tác vụ thống nhất qua executor
- Xuất nhật ký sự kiện tác vụ thống nhất (started / running / cancelled / succeeded / failed)

Như vậy có thể di xuất thực thi ra khỏi tiến trình Web, đồng thời giữ nguyên thực thi async hiện có của chuỗi gọi provider ảnh / video.

Hiện ba loại async worker này đã bổ sung kiểm thử chuyên biệt tối thiểu, trọng tâm khóa vào:

- Yêu cầu hủy trước khi khởi động sẽ chuyển thẳng sang `cancelled`
- Không đi tiếp vào các cuộc gọi provider / agent phía sau

## Đặc điểm chuỗi chính Celery hiện tại

Chuỗi chính hiện tại dùng:

- Tầng API tạo `GenerationTask`
- Tầng API ghi `task_kind`
- Nộp vào Celery qua `spawn_*_task(...)`
- Celery thống nhất qua `task.execute(task_id)`
- worker định tuyến đến `WorkerTaskExecutor` cụ thể theo `task_kind` thông qua `TaskExecutorRegistry`
- Sau khi worker thực thi xong, ghi ngược trạng thái và kết quả về MySQL
- Trang tiếp tục truy vấn lặp và khôi phục qua giao diện trạng thái tác vụ hiện có

Với tác vụ cốt lõi (như `divide`) tiếp tục áp dụng mô hình hai giai đoạn:

```text
Giai đoạn A: Kết quả tạo
→ gọi LLM / Agent
→ GenerationTask.result

Giai đoạn B: Áp dụng kết quả
→ Ghi bảng nghiệp vụ
→ Cập nhật trạng thái nghiệp vụ
```

Các tác vụ văn bản script-processing hiện có cổng vào front thực đang dùng thống nhất được gắn vào:

- `AbstractWorkerTaskExecutor`
- `AbstractLLMResultGenerator`
- `TaskExecutorRegistry`

Trong đó executor sync hiện cung cấp:

- thống nhất log started / succeeded / failed / cancelled
- Kiểm tra hết thời gian ranh giới giai đoạn thống nhất

Ở đây, nghĩa của “hết thời gian” là “hết thời gian tại ranh giới giai đoạn”, không phải mạnh ngắt khi đang thực thi:

- Kiểm tra trước khi bắt đầu thực thi
- Kiểm tra sau khi có kết quả tạo
- Kiểm tra sau apply

Các executor đã mẫu hóa (template hóa) hiện tại gồm:

- `script_divide`
- `script_extract`
- `script_consistency`
- `script_character_portrait`
- `script_prop_info`
- `script_scene_info`
- `script_costume_info`
- `script_optimize`
- `script_simplify`

Các executor tạo không phải văn bản hiện đã kết nối vào registry gồm:

- `image_generation`
- `video_generation`
- `shot_frame_prompt`

## Hiển thị trạng thái tác vụ phía trước hiện tại

Hiển thị trạng thái tác vụ ở frontend hiện dùng “phản hồi cục bộ trong trang + thông báo toàn cục nhẹ”:

- Thành phần thông báo tác vụ cỡ lớn trong trang bản cũ đã rút khỏi luồng chính, không còn là hình thức tương tác mặc định

- Nút kích hoạt tác vụ chịu trách nhiệm:
  - `loading`
  - Chống bấm lặp
  - Giúp người dùng xác nhận hành động nào đang chạy
- Chi tiết tác vụ được hiển thị qua Notification:
  - Trạng thái hiện tại
  - Tiến độ
  - Thời điểm bắt đầu
  - Đã chạy/thời gian tích lũy
  - Phản hồi thành công, thất bại, hủy sau khi tác vụ kết thúc
  - Hỗ trợ nhảy thẳng về trang nguồn
- Cổng vào hủy hiện ưu tiên đặt ở:
  - Nút nhẹ cạnh vùng kích hoạt
  - Hành động hủy nhỏ bên trong Notification
- Trung tâm tác vụ nổi hiện hiển thị thống nhất danh sách tác vụ toàn cục:
  - Ẩn theo mặc định; việc mở rộng sẽ khôi phục theo trạng thái lịch sử cục bộ
  - Lần đầu vào, nút nổi mặc định nằm ở góc dưới bên trái
  - Nút nổi hỗ trợ kéo thả trong phạm vi khung nhìn và tự bám vào cạnh trái hoặc phải sau khi kéo
  - Nút nổi sẽ nhớ vị trí gần nhất
  - Panel mở sẽ tự điều chỉnh hướng mở và cách căn theo vị trí nút, tránh vượt khỏi khung nhìn hiện tại
  - Xem tác vụ đang chạy hiện tại
  - Xem tác vụ vừa kết thúc gần đây
  - Hiển thị đối tượng sở hữu hoặc trang nguồn của tác vụ
  - Xem tiến độ, thời điểm bắt đầu và thời gian thực hiện
  - Thống nhất thao tác hủy thực thi
  - Hỗ trợ quay lại trang nguồn tương ứng
  - Sẽ giữ lại trong chốc lát sau khi kết thúc tác vụ, để tiện xác nhận kết quả vừa thực thi
  - Hỗ trợ lọc nhẹ theo trang hiện tại / đang chạy / vừa kết thúc và loại tác vụ
  - Panel giữ mức nhẹ, hiện mỗi trang tối đa hiển thị 3 tác vụ
  - Lật trang dùng thành phần mũi tên gọn, không đưa thêm thanh phân trang lớn
- trang hiện tại chỉ phụ trách cung cấp ngữ cảnh "nêu bật tác vụ nào liên quan đến đối tượng hiện tại" cho trung tâm tác vụ, không còn quyết định tác vụ có tồn tại hay không
- Đối tượng điều hướng mặc định khớp với tác vụ ưu tiên dùng hiện tại được tô sáng trong trang hiện tại:
  - `navigate_relation_type`
  - `navigate_relation_entity_id`
  - Nếu backend không trả về đối tượng điều hướng, thì chuyển về `relation_type + relation_entity_id` gốc
- Với các tác vụ chưa được trang hiện tại bổ sung thông tin nguồn tường hợp, trung tâm tác vụ sẽ xử lý theo:
  - `relation_type + relation_entity_id`
  - Tự phân giải văn bản nguồn mặc định
  - Suy ra chuyển hướng xem mặc định khi có thể
- Câu chữ thông báo cho trạng thái khởi động, đang chạy, hủy và kết thúc của các tác vụ bất đồng bộ chính đã được thống nhất tập trung:
  - Tác vụ cùng loại giữ giọng văn nhất quán giữa các trang
  - Tác vụ mới thêm về sau nên dùng lại cùng bộ cấu hình văn bản
- Hành động tạo của trang tạo ảnh hiện tại và studio phân cảnh cũng đã kết nối với cầu nối Notification / trung tâm tác vụ thống nhất:
  - Không chỉ dựa vào `message + truy vấn lặp tự viết` trong trang nữa
  - Sẽ đồng thời xuất hiện trong chuỗi phản hồi tác vụ thống nhất

Các trang hiện đã chuyển từ gợi ý dạng khối lớn trong trang sang tương tác nhẹ hơn này, bao gồm:

- Trang quản lý phân cảnh
- Trang chỉnh sửa phân cảnh
- Studio phân cảnh
- Hộp thoại chỉnh sửa nguyên văn
- Trang chỉnh sửa tài nguyên
- Lối vào trích xuất phân cảnh trong danh sách chương của bàn làm việc dự án

## Các tác vụ hiện vẫn chưa chuyển sang Celery

Các tác vụ dưới đây hiện vẫn giữ cách thực thi cũ, và hiện chưa có cổng vào front chính nên không phải ưu tiên đường chính:

- `merge-entities`
- `analyze-variants`

Mặc dù đã đưa vào mô hình tác vụ, hiện tại chúng vẫn là năng lực dự bị.

## Ngữ nghĩa hủy

Hủy hiện tại dùng “hủy hai cấp”:

```text
Yêu cầu hủy từ frontend
→ GenerationTask.cancel_requested = true
→ Nếu tác vụ được Celery thực thi và có executor_task_id:
  → Gửi ngay revoke(terminate=True)
  → API trực tiếp đẩy trạng thái tác vụ nghiệp vụ sang cancelled
→ Nếu không thể kết thúc ngay:
  → worker tiếp tục thực hiện hủy hợp tác tại ranh giới giai đoạn
```

Điều này có nghĩa là:

- với tác vụ đã vào Celery worker, hiện hỗ trợ "hủy ngay" best-effort
- Với các cuộc gọi dài đơn lẻ không thể kết thúc ngay, vẫn giữ cơ chế hủy hợp tác ở ranh giới giai đoạn làm dự phòng
- Hiện không cam kết chấm dứt mạnh tuyệt đối ở tầng provider / SDK LLM, chỉ đảm bảo trạng thái tác vụ nghiệp vụ hội tụ ngay lập tức

## Ràng buộc tầng service

Chuỗi thực thi tác vụ hiện tại yêu cầu tuân thủ các ràng buộc sau:

- Tầng `service` không được phụ thuộc ngược vào `api.v1.routes`
- task wrapper của Celery chỉ gửi task_id
- Logic thực thi phía worker đặt trong `app.services.script_processing_worker`
- Logic tạo tác vụ và khôi phục trạng thái phía Web giữ nguyên trong `app.services.script_processing_tasks`

Ràng buộc này đã được dùng để sửa lỗi import vòng tròn lộ ra ở worker.
