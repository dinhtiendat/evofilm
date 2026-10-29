---
title: "Phương án tác vụ hóa không đồng bộ và hủy"
description: "Giải thích cho người phát triển script-processing v.v., thiết kế tác vụ hóa, khôi phục trang và khả năng hủy cho các điểm API agent thời gian dài."
weight: 8
---

## Bối cảnh

Hệ thống hiện tại đã có một bộ hạ tầng tác vụ có thể dùng:

- `TaskManager`
- `GenerationTask`
- `GenerationTaskLink`
- `/api/v1/film/tasks/{task_id}/status`
- `/api/v1/film/tasks/{task_id}/result`

nhưng `script-processing` dưới route vẫn còn một loạt API**đồng bộ gọi trực tiếp Agent**. Trong đó điển hình nhất là:

- `/api/v1/script-processing/divide`

Giao diện loại này một khi thời gian kéo dài sẽ sinh một số vấn đề rõ rệt:

- Yêu cầu bị chặn trong thời gian dài
- Mất ngữ cảnh sau khi làm mới trang
- Người dùng không rõ hiện đã có tác vụ nào chạy chưa
- Hệ thống tác vụ hiện tại có `cancelled` trạng thái, nhưng thiếu điểm vào hủy thực sự và cơ chế thực thi hủy

Mục tiêu của tài liệu này là đưa ra một phương án có thể áp dụng dần theo từng bước:

```text
Tác vụ hóa giao diện agent có thời gian dài
→ Có thể khôi phục sau khi làm mới trang
→ Trạng thái tác vụ hiển thị được
→ Trước tiên hỗ trợ yêu cầu hủy và dừng hợp tác
→ Khả năng kết thúc bắt buộc đưa về sau
```

## Kết luận cốt lõi

### 1. `divide` nên ưu tiên đổi thành API tác vụ bất đồng bộ

Nên thêm mới:

```text
POST /api/v1/script-processing/divide-async
```

Và giữ lại giao diện đồng bộ ban đầu:

```text
POST /api/v1/script-processing/divide
```

Cách này có thể cân bằng:

- Chuyển đổi luồng chính phía trước
- Đầu quản trị hoặc gỡ lỗi kịch bản
- Kiểm thử đơn và kiểm chứng hồi quy

### 2. Khôi phục trang nên tái dùng hệ thống tác vụ có sẵn

Không nên cho `divide` tự tạo một mô hình tác vụ mới riêng.
Nên tái sử dụng trực tiếp:

- `GenerationTask`
- `GenerationTaskLink`

Và khôi phục trạng thái trang qua bộ liên kết nghiệp vụ dưới đây:

```text
relation_type = "chapter_division"
relation_entity_id = chapter_id
```

### 3. Khả năng hủy cần làm theo giai đoạn

Trong stack kỹ thuật hiện tại, nhiều tác vụ dài về bản chất vẫn là:

- Gọi Agent đồng bộ một lần
- Không nhất thiết phải phơi bày câu xử lý có thể ngắt

Vì vậy giai đoạn đầu đừng cam kết “kết thúc mạnh ngay lập tức”, mà nên làm trước:

- Yêu cầu hủy
- Trang hiển thị “Đã yêu cầu hủy”
- worker dừng hợp tác tại điểm kiểm tra

Nếu sau này cần kết thúc bắt buộc, hãy nâng cấp lên:

- Bảng đăng ký xử lý thời gian chạy
- Tiến trình worker độc lập / hệ thống hàng đợi

### 4. Phương án tầng thực thi tối thiểu hiện tại: MySQL + Redis + Celery

Giai đoạn hiện tại không cần di trú trước cơ sở dữ liệu nghiệp vụ. Phương án tối thiểu được khuyến nghị là:

```text
CSDL nghiệp vụ: MySQL
Broker：Redis
Trình thực thi: Celery Worker
nguồn đúng của tác vụ:tiếp tục dùng GenerationTask / GenerationTaskLink
```

Giải thích:

- `GenerationTask`
  - Tiếp tục là nguồn chân duy nhất của trạng thái tác vụ, kết quả và yêu cầu hủy
- `Redis`
  - Chỉ dùng làm broker Celery
- `Celery Worker`
  - Thực sự thực thi các tác vụ tốn thời gian dài như `divide / extract`

Ở cấu hình backend:

- Nếu chưa chỉ định `CELERY_BROKER_URL` riêng
- Sẽ tự động ghép theo cấu hình Redis:

```text
redis://[:password@]REDIS_HOST:REDIS_PORT/REDIS_DB
```

Điều này giúp môi trường cục bộ, compose, các môi trường triển khai sau đều dùng thống nhất một bộ ngữ nghĩa cấu hình.

## Liên động Compose và kiểm chứng vòng đầu

Trọng tâm nghiệm thu của phương án tối thiểu này không phải là “tác vụ có chạy được không”, mà là:

> `divide / extract` chạy được rồi, backend có còn giữ được nhẹ và phản hồi tốt không.

### Thứ tự khởi chạy

Khuyến nghị xác nhận trạng thái dịch vụ theo chuỗi sau:

```text
mysql
→ redis
→ backend-init-db
→ mysql-init-sql
→ backend
→ celery-worker
→ front
```

### Kiểm tra cơ bản

Trước tiên xác nhận hai dịch vụ mới đã khả dụng:

- `redis`
  - Trong `docker compose ... ps` phải là `healthy`
- `celery-worker`
  - Trong nhật ký nên xuất hiện `ready`
  - và đăng ký tác vụ:
    - `task.execute`

### Xác minh tính năng vòng một

#### Trường hợp 1: Trích xuất phân cảnh trên trang quản lý phân cảnh

Chuỗi kiểm chứng:

```text
Nhấn “Trích xuất phân cảnh một chạm”
→ divide-async trả về task_id ngay
→ celery-worker bắt đầu thực thi
→ backend vẫn tiếp tục xử lý các interface chương, phân cảnh, task status
```

Tiêu chuẩn thành công:

- Sau khi tải lại trang vẫn khôi phục được trạng thái tác vụ
- `/api/v1/film/tasks/{task_id}/status` trả về bình thường
- Các giao diện như chi tiết chương, danh sách phân cảnh không còn bị tác vụ dài giữ lại
- Nhật ký `backend` chỉ đảm nhận tạo tác vụ, tra trạng thái, tra kết quả
- Nhật ký thực thi thực sự tốn thời gian chủ yếu xuất hiện ở `celery-worker`

#### Trường hợp 2: Trích xuất tài nguyên trên trang chỉnh sửa phân cảnh

Chuỗi kiểm chứng:

```text
Nhấn “Trích xuất và làm mới ứng viên”
→ extract-async trả về task_id ngay lập tức
→ celery-worker thực hiện extract
→ tiếp tục khôi phục task sau khi tải lại trang
→ các giao diện khác của backend vẫn đáp ứng được
```

Tiêu chí thành công giống với `divide`.

### Xác minh đường dẫn hủy

Sau khi kiểm thử liên động cơ bản thông, hãy kiểm chứng thêm:

1. Khởi động `divide-async` hoặc `extract-async`
2. Nhấn hủy ngay
3. Làm mới trang
4. Trạng thái xác nhận đi qua:
   - `cancel_requested = true`
   - Sau đó tại điểm kiểm tra chuyển sang `cancelled`

### Nếu sau liên động vẫn tắc, ưu tiên kiểm tra

1. `celery-worker` có khởi động thành công thật không
2. Có còn sót `asyncio.create_task(...)` nào không
3. Trang có dùng nhầm API đồng bộ cũ thay vì `*-async`

## Vì sao `divide` phải được ưu tiên tác vụ hóa

### Vấn đề hiện tại

`/api/v1/script-processing/divide` hiện là đồng bộ Agent gọi:

```text
Yêu cầu đi vào
→ ScriptDividerAgent.divide_script(...)
→ Kết quả trả về
```

Chuỗi này một khi chậm lại, người dùng sẽ cảm nhận trực tiếp:

- Trang cứ loading mãi
- Sau khi làm mới trang không rõ tác vụ còn chạy không
- Cùng một chương có thể bị kích hoạt trích xuất nhiều lần

### Mục tiêu sau khi tác vụ hóa

Nên đổi thành:

```text
POST divide-async
→ Tạo tác vụ
→ Tạo task_link
→ Trả về task_id ngay
→ Thực thi divide ở nền
→ Trang theo chapter_id khôi phục trạng thái tác vụ
```

## Thiết kế `divide-async`

### Định tuyến

```text
POST /api/v1/script-processing/divide-async
```

### Thân yêu cầu

Nên tái sử dụng thân yêu cầu của giao diện đồng bộ hiện tại:

```json
{
  "chapter_id": "2a67890b-46a9-41ed-b220-18d18a3d300a",
  "script_text": "...",
  "write_to_db": true
}
```

### Thân trả về

```json
{
  "success": true,
  "code": 200,
  "message": "Task created",
  "data": {
    "task_id": "uuid",
    "status": "pending",
    "reused": false,
    "relation_type": "chapter_division",
    "relation_entity_id": "2a67890b-46a9-41ed-b220-18d18a3d300a"
  }
}
```

### Tái sử dụng tác vụ đang hoạt động cùng chương

Nên thêm ràng buộc nghiệp vụ:

> cùng một `chapter_id` đồng thời chỉ cho phép một `chapter_division` tác vụ.

Các trạng thái hoạt động gồm:

- `pending`
- `running`
- `streaming`

Nếu có tác vụ đang hoạt động, thì:

- Không tạo trùng
- Trả về luôn `task_id` có sẵn
- `reused = true`

Cách này có thể giải quyết:

- Nhấp lặp lại
- Nhấp lại sau khi làm mới trang
- Nhiều tab kích hoạt đồng thời

## Liên kết và khôi phục sau khi làm mới trang

### Cách viết liên kết nghiệp vụ

Khi tạo tác vụ `divide` ghi vào:

```text
resource_type = "task"
relation_type = "chapter_division"
relation_entity_id = chapter_id
```

### Cách khôi phục trang

Khi người dùng vào các trang này:

- Trang chương
- Trang danh sách phân cảnh
Bàn làm việc dự án

Có thể theo `chapter_id` truy vấn tác vụ đang chạy mới nhất:

```text
chapter_id
→ relation_type=chapter_division
→ latest active task
```

Nếu tồn tại:

- Hiển thị “Đang trích xuất phân cảnh”
- Truy vấn lặp trạng thái tác vụ
- Làm mới danh sách phân cảnh sau khi tác vụ xong

### Gợi ý thông báo trên trang

Hiển thị thống nhất:

- `Đang trích xuất phân cảnh`
- `Đã yêu cầu hủy`
- `Trích xuất thất bại`
- `Trích xuất hoàn tất`

## Thiết kế khả năng hủy

## Giai đoạn 1: Yêu cầu hủy

Giao diện mới thêm:

```text
POST /api/v1/film/tasks/{task_id}/cancel
```

Nên ở `generation_tasks` thêm trường mới lên bảng:

- `cancel_requested`
- `cancel_requested_at`
- `cancel_reason`
- `cancelled_at`

Giai đoạn này trước hết giải quyết:

- Người dùng có thể khởi động việc hủy
- Trang biết yêu cầu hủy đã tồn tại
- Giao diện trạng thái tác vụ hiển thị được trạng thái yêu cầu hủy

Điều này không có nghĩa là tác vụ nhất định dừng ngay.

## Giai đoạn 2: Hủy hợp tác

Thêm điểm kiểm tra hủy trong worker:

1. Trước khi khởi động tác vụ
2. Trước khi gọi Agent kế tiếp
3. Ranh giới giai đoạn trong quy trình nhiều giai đoạn
4. Trước khi ghi vào CSDL

Nếu phát hiện:

```text
cancel_requested = true
```

Thì:

- Dừng các bước tiếp theo
- Ghi tác vụ thành `cancelled`
- Ghi `cancelled_at`

### Hạn chế của cách này

Nếu mã nguồn hiện tại đang bị kẹt ở:

- Gọi mô hình đồng bộ thời gian dài một lần
- Gọi SDK kiểu chặn

Thì giai đoạn một không thể “ngắt ngay”, chỉ có thể đợi bước hiện tại kết thúc rồi mới dừng.

Vì vậy tài liệu sản phẩm và phát triển đều nên nêu rõ:

> Khả năng hủy ở giai đoạn một thuộc loại “yêu cầu hủy + hủy phối hợp”, chứ không phải kết thúc bắt buộc.

## Giai đoạn 3: Bảng đăng ký xử lý thời gian chạy

Nếu sau này muốn tăng cường khả năng hủy, nên trên `TaskManager` thêm mới bảng đăng ký handle chạy:

```text
task_id -> asyncio.Task
```

Như vậy với tác vụ nền không đồng bộ thực sự, có thể thử:

- `task.cancel()`

Nhưng cần lưu ý:

> Dù có handle chạy, cũng không có nghĩa là mọi LLM gọi đều dừng được ngay lập tức.

## Giai đoạn 4: Dự phòng khả năng kết thúc bắt buộc

Nếu sau này nghiệp vụ rõ ràng yêu cầu “kết thúc ngay tác vụ dài”, thì phải nâng cấp kiến trúc sâu hơn, ví dụ:

- Tiến trình worker độc lập
- Hệ thống hàng đợi
- Cách ly tiến trình thực thi và tiến trình Web

Đến khi đó, mới có thể hỗ trợ tin cậy hơn:

- kill worker
- Thu hồi tác vụ bị chặn
- Ngữ nghĩa hủy mạnh hơn

Ở giai đoạn hiện tại, không nên nhảy thẳng đến bước này.

## Trạng thái triển khai hiện tại

### Giao diện chính: Đã hoàn thành tác vụ hóa và kết nối trang thực

- `/api/v1/script-processing/divide`
- `/api/v1/script-processing/extract`
- `/api/v1/script-processing/check-consistency`
- `/api/v1/script-processing/optimize-script`
- `/api/v1/script-processing/simplify-script`
- `/api/v1/script-processing/analyze-character-portrait`
- `/api/v1/script-processing/analyze-prop-info`
- `/api/v1/script-processing/analyze-scene-info`
- `/api/v1/script-processing/analyze-costume-info`

Các giao diện này hiện đều đã đi vào:

```text
Tác vụ không đồng bộ
→ Trang khôi phục tác vụ theo thực thể nghiệp vụ
→ Có thể yêu cầu hủy
→ Hủy hợp tác
```

### Khả năng dự bị: đã tác vụ hóa nhưng hiện chưa có điểm vào frontend thực

- `/api/v1/script-processing/merge-entities`
- `/api/v1/script-processing/analyze-variants`

Hai API này hiện không còn được xếp vào mục chỉnh sửa chính của frontend, chiến lược xử lý là:

- Giữ triển khai phía sau, kiểm thử và OpenAPI
- Trong mô tả định tuyến và chú thích mã nguồn, ghi rõ “khả năng dự bị”
- v.v., đến khi điểm vào trang thực sự xuất hiện, sẽ gắn vào theo cùng một mô hình khôi phục tác vụ

## khuyến nghị relation_type quy ước

Nên dùng thống nhất bộ giá trị này:

```text
chapter_division
script_extraction
entity_merge
consistency_check
variant_analysis
character_portrait_analysis
prop_info_analysis
scene_info_analysis
costume_info_analysis
script_optimization
script_simplification
```

Đã triển khai hiện tại:

- `chapter_division`
- `script_extraction`
- `consistency_check`
- `script_optimization`
- `script_simplification`
- `character_portrait_analysis`
- `prop_info_analysis`
- `scene_info_analysis`
- `costume_info_analysis`
- `entity_merge`
- `variant_analysis`

## Ôn lại thứ tự thực hiện và gợi ý tiếp theo

### Giai đoạn đã hoàn thành

1. `generation_tasks` thêm trường hủy
2. `TaskStore / TaskManager` thêm khả năng yêu cầu hủy
3. Thêm `script_processing_tasks.py`
4. `divide-async / extract-async` Áp dụng
5. Trang khôi phục theo thực thể nghiệp vụ `divide / extract` tác vụ
6. `check-consistency / optimize-script / simplify-script` gắn vào hệ thống tác vụ
7. Giao diện loại phân tích tài nguyên kết nối vào hệ thống tác vụ
8. worker Bù vòng một checkpoint hủy phối hợp cho worker

### Trọng tâm chốt hiện tại

1. Dọn kỳ vọng kết nối phía trước của giao diện chưa kích hoạt
2. nêu rõ trong mô tả route, chú thích code, tài liệu phát triển:
   - Giao diện nào thuộc luồng chính
   - Nền tảng nào là khả năng dự bị
   - Giao diện đồng bộ nào chỉ dùng cho tương thích và gỡ lỗi

### Gợi ý tiếp theo

1. Tiếp tục quan sát có thêm đầu vào trang thực nào không
2. Nếu sau này bật lại `merge-entities / analyze-variants`, sau đó gắn vào theo cùng một mô hình khôi phục tác vụ
3. Nếu nghiệp vụ sau này rõ ràng yêu cầu khả năng kết thúc mạnh hơn, hãy nâng cấp tiếp bảng đăng ký handle chạy hoặc worker

## Ràng buộc với phía trước

Trang không nên chỉ dựa vào taskId cache cục bộ.
Cách làm đúng là:

```text
Trang được mở
→ Tìm tác vụ hoạt động mới nhất theo thực thể nghiệp vụ
→ Khôi phục truy vấn lặp
→ Cập nhật UI theo trạng thái tác vụ
```

Nói cách khác:

- Trang chương xem `chapter_division`
- Trang chỉnh sửa phân cảnh xem `script_extraction`
- Không lấy “trang có làm mới không” làm tiên đề

## Gợi ý về ngữ nghĩa sản phẩm

Giai đoạn hiện tại nên thống nhất thông báo ra bên ngoài:

### Người dùng có thể thấy

- Tác vụ đang thực thi
- Đã yêu cầu hủy
- Đã hoàn thành
- Đã thất bại

### Người dùng tạm thời không nên mong đợi

- Ngừng ngay lập tức sau khi nhấn hủy

Cụ từ thông báo chính xác hơn nên là:

> Đã yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.

## Gợi ý cuối cùng

Điều đáng làm trước nhất trong vòng này không phải áp dụng ngay kết thúc mạnh, mà là:

```text
divide tác vụ không đồng bộ
→ Làm mới trang có thể khôi phục
→ Trạng thái tác vụ hiển thị được
→ Yêu cầu hủy có thể đăng ký
→ worker dừng hợp tác
```

Cách này trước tiên giải quyết hầu hết vấn đề trải nghiệm, đồng thời chừa sẵn điểm mở rộng cho khả năng điều khiển tác vụ mạnh hơn về sau.
