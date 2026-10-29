---
title: "Ghi chú phát hành v0.1.0-beta"
date: 2026-04-03
description: "Ghi chú phát hành giai đoạn một phía backend của Jellyfish, bao phủ refactor route -> service, thống nhất vỏ response, khép kín trạng thái phân cảnh, API gộp assets-overview, quy ước đồng bộ OpenAPI và bổ sung test."
---

trọng điểm của giai đoạn này không phải tiếp tục chất thêm tính năng, mà là thu gọn luồng chính đã chạy thông thành một cấu trúc kỹ thuật ổn định hơn.

Nếu tóm tắt bằng một câu, bản phát hành này hoàn thành:

- Gọn định tuyến và phân tầng Service
- Thống nhất vỏ phản hồi giao diện và phong cách lỗi
- Vòng khép kín chuyển trạng thái phân cảnh
- Gom nhóm view tài nguyên phân cảnh
- Thỏa thuận đồng bộ OpenAPI đã đi vào thực tế
- Củng cố kiểm thử và di trú

## ✨ Tóm tắt lần phát hành này

Đợt này có 5 thay đổi quan trọng nhất:

- phân tầng phía sau `route -> service -> common` đã được chính thức thiết lập
- `shot.status` giờ đã có máy trạng thái phía backend thực sự bảo trì được
- thêm `shot_extracted_candidates`, biến luồng xác nhận trích xuất thành trạng thái trung gian chính thức
- thêm `assets-overview`, chuyển view tài nguyên phân cảnh từ ghép phía trước sang aggregate phía sau
- Thoả thuận gọi giao diện phía trước được siết chặt: **sau khi cập nhật API, chủ động chạy `pnpm run openapi:update` và ưu tiên dùng generated client**

## 🚀 Added

### 1. Lớp khả năng Common

Thêm mới:

- `services/common/validators.py`
- `services/common/crud.py`
- `services/common/errors.py`

Tầng này thống nhất các khả năng dùng chung cho logic mẫu lặp cao:

- Xác thực tồn tại
- Helper CRUD cơ bản
- Mẫu văn bản lỗi thông dụng

Hiệu quả trực tiếp của nó là:

- route mỏng hơn
- service không phải viết lại mã mẫu (boilerplate)
- Phong cách lỗi thống nhất hơn

### 2. Tầng Studio / LLM / Film Service

Lượt này tạo mới hoặc cấu trúc lại nhiều service, trọng tâm gồm:

- `services/studio/shots.py`
- `services/studio/shot_assets.py`
- `services/studio/shot_details.py`
- `services/studio/shot_dialogs.py`
- `services/studio/shot_frames.py`
- `services/studio/shot_character_links.py`
- `services/studio/script_division.py`
- `services/studio/files.py`
- `services/studio/image_task_validation.py`
- `services/studio/image_task_references.py`
- `services/studio/image_task_prompts.py`
- `services/studio/image_task_runner.py`
- `services/llm/manage.py`
- `services/film/generated_video.py`
- `services/film/shot_frame_prompt_tasks.py`

Điều này có nghĩa là luồng chính Studio, luồng cấu hình LLM, luồng tác vụ Film đã không còn chất đống trong file route.

### 3. Bảng trung gian xác nhận trích xuất phân cảnh

Mới thêm cấu trúc dữ liệu chính thức:

- `shot_extracted_candidates`

Đồng thời `Shot` bổ sung mới:

- `skip_extraction`
- `last_extracted_at`

`shot_extracted_candidates` có vai trò ghi nhận:

- Mục ứng viên được trích xuất từ kịch bản cho một phân cảnh
- Hiện tại vẫn đang chờ xử lý hay không
- Có đã liên kết chưa
- Có đã bỏ qua chưa

Trạng thái ứng viên giờ là trạng thái chính thức, không còn là dữ liệu UI chắp vá tạm thời ở frontend.

### 4. Giao diện tổng hợp tài nguyên phân cảnh

Giao diện mới thêm:

- `GET /api/v1/studio/shots/{shot_id}/assets-overview`

Giao diện này chuyên dùng để trả về:

- Tài nguyên đã liên kết hiện tại
- Ứng viên tài nguyên chờ xác nhận
- `candidate_status` của từng mục
- Mỗi mục đã liên kết hay chưa
- Thống kê tổng hợp `summary`

Mục tiêu của nó rất rõ ràng:

> Đưa nguồn sự thật của “view tài nguyên phân cảnh” về phía backend, không để frontend tự ghép `linked-assets + extracted-candidates` nữa.

### 5. Tài liệu phát triển luồng trạng thái phân cảnh và SQL di trú

Lượt đồng bộ này đã bổ sung:

- Tài liệu phát triển:
  - `site/content/docs/guide/shot-status-flow.md`
- SQL di trú:
  - `backend/sql/002-add-shot-extracted-candidates.sql`

Điều này có nghĩa là chuỗi trạng thái này không chỉ dùng được trong code, mà đã có cả giải thích thiết kế có thể truy vết và cổng vào di trú database.

## 🔄 Changed

### 1. Route mỏng hơn, ranh giới rõ hơn

`app/api/v1/routes/` hiện chủ yếu chỉ làm:

- Tham số nhận
- Tiêm phụ thuộc
- Gọi service
- Bao bọc `ApiResponse`

logic nghiệp vụ phức tạp, xác thực chéo thực thể, xử lý tệp, dàn dựng tác vụ, đã chuyển phần lớn xuống tầng service.

### 2. Thống nhất vỏ phản hồi

Đợt này đã thống nhất phong cách phản hồi thành công:

- `created_response(...)`
- `success_response(...)`
- `empty_response()`
- `paginated_response(...)`

Điều này làm hành vi phản hồi của các API tạo, xóa, danh sách ổn định hơn, frontend cũng dễ xử lý thống nhất hơn.

### 3. Thống nhất văn bản lỗi

Mới thêm và từng bước kết nối:

- `entity_not_found(...)`
- `entity_already_exists(...)`
- `required_field(...)`
- `invalid_choice(...)`
- `not_belong_to(...)`
- `relation_mismatch(...)`

Vẫn giữ một số văn bản trường hợp đặc biệt có thông tin ngữ cảnh, dùng cho gỡ lỗi.

### 4. Tách `entities.py`

Tệp `entities.py` vốn nặng đã được tách thành:

- `entity_crud.py`
- `entity_images.py`
- `entity_existence.py`
- `entity_specs.py`
- `entity_thumbnails.py`
- `entities.py` (tầng điều phối)

Giờ nó không còn là tệp triển khai khổng lồ lớn mà lộn xộn, mà giống hơn một tầng điều phối có trách nhiệm rõ ràng.

### 5. Thu chặt cách gọi giao diện phía trước

Đợt này bổ sung rõ một thỏa thuận phát triển:

> **sau khi cập nhật API, phía trước cần chủ động chạy `pnpm run openapi:update`.**

Đồng thời, lô logic mới ở phía trước đã đổi sang ưu tiên dùng:

- OpenAPI generated client

chứ không phải tự viết thêm một tầng service trùng lặp.

## 🧠 Vòng khép kín trạng thái phân cảnh

thay đổi cấu trúc quan trọng nhất của đợt này là thật sự nối `shot.status` thành một chuỗi trạng thái phía sau có thể bảo trì được.

### Nghĩa chính thức của `shot.status` hiện nay

- `pending`
  - Phân cảnh hiện tại chưa hoàn thành luồng xác nhận trước khi vào tạo video
- `ready`
  - Phân cảnh hiện tại đã có điều kiện tiền đề để vào luồng tạo video

`ready` ở đây đã được thu gọn rõ ràng thành:

> Phân cảnh hiện tại đã hoàn tất xác nhận trích xuất thông tin, do đó có thể vào quy trình tạo video.

Đặc biệt lưu ý:

> Các tác vụ tạo đang chạy không còn ghi vào `shot.status` nữa.
> “Đang tạo” nên thể hiện qua `GenerationTask / GenerationTaskLink`
> Được tổng hợp động, không tái sử dụng các trạng thái tĩnh như `pending / ready`.

### Điều kiện cần tối thiểu của `ready`

Phía sau hiện tính thống nhất theo bộ quy tắc sau:

1. `skip_extraction = true`：
   - `ready`
2. Chưa bao giờ trích xuất:
   - `pending`
3. Đã trích xuất, nhưng phân cảnh hiện tại không có ứng viên nào:
   - `ready`
4. Tất cả mục ứng viên đã được xử lý xong (`linked / ignored`):
   - `ready`
5. Các trường hợp khác:
   - `pending`

Ở đây “ứng viên đã xử lý xong” là quy tắc chính thức, không còn để frontend đoán nữa.

### Hai đường hợp lệ để vào `ready`

Phân cảnh hiện tại có thể vào `ready` qua hai đường dẫn:

```text
Đường A:
Trích xuất
→ Đã xử lý xong toàn bộ ứng viên
→ ready

Đường B:
Rõ ràng không cần trích xuất
→ skip_extraction = true
→ ready
```

### Vòng khép kín ghi ngược trạng thái ứng viên

Lần này không chỉ thêm cấu trúc bảng, mà đã kết nối các hành động nghiệp vụ thật vào.

Hiện tại đã hoàn thành các ghi ngược tự động sau:

- Sau khi trích xuất xong, đồng bộ ghi vào `shot_extracted_candidates`
- Sau khi liên kết nhân vật thành công, ứng viên nhân vật tự ghi ngược `linked`
- Sau khi liên kết bối cảnh / đạo cụ / trang phục thành công, tự động ghi ngược `linked`
- Sau khi đặt `ShotDetail.scene_id` thành công, ứng viên bối cảnh tự động ghi ngược `linked`
- sau khi xóa liên kết bối cảnh / đạo cụ / trang phục, ứng viên lùi về `pending`
- khi nhân vật cùng index bị thay thế, ứng viên nhân vật cũ bị thay sẽ lùi về `pending`
- Khi `scene_id` đổi từ A sang B hoặc xóa thành `None`, ứng viên của bối cảnh cũ lùi về `pending`

Vì vậy quy trình chính thức hiện nay là:

```text
Trích xuất
→ ứng viên vào kho
→ Sau khi liên kết, linked
→ sau khi bỏ qua là ignored
→ Hủy liên kết / thay thế / xóa sạch thì quay về pending
→ shot.status tự động tính lại
```

### "Không có thoại" không còn ảnh hưởng đến `ready`

Đợt này còn xử lý dứt khoát một điểm mơ hồ ngữ nghĩa:

> Phân cảnh không có thoại không nên bị xác định là trạng thái chưa hoàn tất chỉ vì “không có thoại”.

Quy tắc hiện tại đã rõ:

- `shot.status` chính thức không liên quan số lượng lời thoại
- Phân cảnh không có thoại, chỉ cần khép kín vòng xác nhận trích xuất là vẫn có thể vào `ready`

Quy tắc này hiện đang đồng thời nằm ở:

- Tính `shot_status` ở phía sau
- `ChapterStudio`
- `ChapterShotEditPage`
- `ChapterShotsPage`

Đã thu gọn một vòng và bổ sung kiểm thử hồi quy.

## 🖥️ Thay đổi cách phối hợp phía trước

Đợt này ngoài thay đổi cấu trúc backend, cách phối hợp giữa frontend và backend cũng được điều chỉnh rất quan trọng.

### 1. Trang chỉnh sửa phân cảnh mặc định hiển thị phần hội của “tài nguyên đã liên kết + ứng viên chờ xác nhận”

`ChapterShotEditPage` hiện mặc định hiển thị:

- Tài nguyên đã liên kết
- Ứng viên vẫn chờ xử lý trong `shot_extracted_candidates`

Thay vì:

- Chỉ sau khi nhấn "Trích xuất tài nguyên" mới tạm thời hiển thị ứng viên

### 2. Trang chỉnh sửa phân cảnh đã chuyển sang `assets-overview`

Trang chỉnh sửa phân cảnh hiện đã đổi sang ưu tiên dùng:

- `GET /api/v1/studio/shots/{shot_id}/assets-overview`

Không tự ghép tay lâu dài nữa:

- `linked-assets`
- `extracted-candidates`
- `extraction-draft`

### 3. Thu gọn trách nhiệm studio phân cảnh

`ChapterStudio` đợt này cũng thực hiện một điều chỉnh trách nhiệm rất quan trọng:

- **không gọi nữa** `/api/v1/script-processing/extract`
- Không giữ nữa bộ đệm trích xuất trong trang và tải trước hàng loạt
- `Mô tả khung hình / Độ sẵn sàng tài nguyên` chỉ phụ trách hiển thị:
  - `assets-overview`
  - `shot.status`
  - `skip_extraction`
- Hành động trích xuất và xác nhận chính thức thống nhất gom về:
  - `ChapterShotEditPage`

Nói cách khác:

```text
ChapterStudio
→ Xem trạng thái
→ Chuyển tới trang chỉnh sửa phân cảnh để xác nhận

ChapterShotEditPage
→ trích xuất
→ liên kết / bỏ qua / tạo mới
→ Xác nhận hoàn thành
```

Đường ranh giới trách nhiệm này giờ đã rõ ràng hơn nhiều.

### 4. Tiếp tục thu gọn trách nhiệm trang phân cảnh

Sau vòng này, phía trước tiếp tục thu hẹp ranh giới hai trang thêm một bước:

- `ChapterShotEditPage`
  - Xác nhận và củng cố là lối vào chính cho "chuẩn bị phân cảnh / xác nhận thông tin"
  - Chịu trách nhiệm trích xuất, xác nhận, chỉnh sửa, và đưa phân cảnh đến `ready`
- `ChapterStudio`
  - Được củng cố rõ thành “bàn làm việc tạo chương”
  - Chịu trách nhiệm `video-readiness`, khung hình chính, ảnh tham chiếu, tham số video và tạo video

Tương ứng với quy trình chính được khuyến nghị cũng rõ ràng hơn:

```text
Trang chỉnh sửa phân cảnh
→ Trích xuất và xác nhận
→ shot.status = ready
→ Vào studio phân cảnh
→ Xem video-readiness
→ Khung hình chính / Ảnh tham chiếu / Tham số video
→ Tạo video
```

## 🐞 Fixed

### 1. 500 của `ignore extracted candidate`

Đã sửa:

- `PATCH /api/v1/studio/shots/extracted-candidates/{id}/ignore`

lỗi `MissingGreenlet` do lazy load `updated_at` gây ra khi trả về.

Cách sửa là thống nhất bổ sung:

- `flush + refresh`

Đảm bảo đối tượng ORM ở trạng thái hoàn chỉnh trước khi chuỗi hóa không đồng bộ.

### 2. vấn đề tương thích Enum / str của `assets-overview`

Sửa lỗi của giao diện mới trên một số đường trả về ORM:

- `candidate_type`
- `candidate_status`

Có thể là `str` chứ không phải Enum, gây ra:

- `'str' object has no attribute 'value'`

Giờ đây đã thống nhất tương thích:

- Enum
- str

### 3. Sau khi trích xuất lại, các mục đã liên kết bị đặt lại sai

Đã sửa lỗi chủ chốt này:

> ứng viên đã `linked`, sau khi trích xuất lại bị đặt lại nhầm thành `pending`

Giờ đây khi trích xuất lại:

- Ứng viên cùng tên cùng loại, trước đó đã `linked`
- Sẽ tiếp tục giữ `linked`

Điều này cũng trực tiếp sửa luôn tình trạng trên trang kiểu:

- Liên kết 1 mục
- Bỏ qua 4 mục
- Trích xuất lại sau khi làm mới
- Bỏ qua thêm 4 mục
- mà vẫn hiển thị “còn 1 mục chờ xử lý”

về thống kê lỗi.

### 4. Yêu cầu cũ phía trước ghi đè trạng thái mới

Đã bổ sung cơ chế bảo vệ “lời yêu cầu mới nhất thắng” (latest request wins), tránh:

- Yêu cầu overview cũ trả về muộn
- Dùng trạng thái mới đè lên

Lớp bảo vệ này hiện đã được thêm ở:

- `ChapterShotEditPage`
- `ChapterStudio`

## 🧪 Testing

Trong đợt dọn dẹp này, kiểm thử không được bổ sung sau cùng mà được đẩy lên cùng với sự thay đổi cấu trúc.

### Tầng Service

Đã bao quát:

- common helpers
- Quản lý llm
- Liên kết nhân vật với phân cảnh
- Ghi kịch bản phân cảnh vào CSDL
- Dịch vụ tệp
- Tạo video
- Tác vụ prompt khung phân cảnh
- `image_task_*`
- `shot_status` / `shot_extracted_candidates`

### Tầng API

Đã bao quát:

- `prompts`
- `llm/providers`
- `projects / chapters / shots`
- `shot-details / shot-dialog-lines / shot-frame-images`
- `files`
- `task_status`
- `shot_character_links`
- `image_tasks`
- `generated_video`
- `tasks_images`
- `entities`

### Kết quả hiện tại

Khi kết thúc giai đoạn này, thực thi từ thư mục gốc của repository:

```bash
uv run pytest backend/tests -q
```

Kết quả là:

```text
125 passed
```

và cả hai lối vào thư mục gốc lẫn `backend/` đều đã ổn định, không còn vấn đề test async bị bỏ qua nhầm.

## 🗃️ Migration Notes

Lượt này có thay đổi cấu trúc cơ sở dữ liệu, phải chạy SQL di trú trước:

- `backend/sql/002-add-shot-extracted-candidates.sql`

Đặc biệt cần lưu ý:

- Mã đã phụ thuộc vào:
  - `shots.skip_extraction`
  - `shots.last_extracted_at`
  - `shot_extracted_candidates`
- Nếu không di trú cơ sở dữ liệu trước, lúc chạy sẽ báo lỗi:
  - `Unknown column 'shots.skip_extraction'`

Vì vậy, thứ tự đưa lên môi trường thật trong vòng này nên là:

1. Thực thi di trú cơ sở dữ liệu
2. Triển khai mã phía sau
3. Cập nhật generated client phía frontend

## 👩‍💻 Developer Notes

Đợt này bổ sung một thỏa thuận rõ ràng:

> **Khi giao diện phía sau có cập nhật, phía trước cần chủ động thực thi `pnpm run openapi:update`.**

Đồng thời khuyến nghị tuân thủ hai điều này:

- Frontend ưu tiên dùng generated client
- Không viết thêm tầng service trùng lặp thủ công để bọc các interface OpenAPI đã có

Quy ước này đã được thực thi trong việc kết nối giao diện mới của vòng này:

- `assets-overview`
- `skip_extraction`
- Các interface liên quan đến extracted-candidates

Đều đã đồng bộ một vòng theo thỏa thuận này.

## ⚠️ Known Gaps

Lượt này không phải chặng cuối, vẫn còn giữ một số điểm cố ý chưa khép hoàn toàn:

- `dependencies.py` vẫn có một số `HTTPException` tự viết
- Một ít văn bản lỗi vẫn giữ ngoại lệ ngữ cảnh
- Việc đặt tên một số route / service có thể tiếp tục thống nhất
- `entities.py` tuy đã tách ra nhưng vẫn thuộc dịch vụ thực thể dùng chung tương đối phức tạp

Những thứ này không còn là điểm chặn cấu trúc nữa, giống hơn là đối tượng dọn dẹp kỹ thuật hóa của lượt tới.

## ✅ Kết luận phát hành

Nếu nén vòng này thành một câu, điều thực sự hoàn thành là:

- Phân tầng phía sau rõ ràng hơn
- Hành vi giao diện thống nhất hơn
- Chuyển trạng thái phân cảnh đã chính thức khép kín
- Phía trước không phải đoán lâu dài trạng thái tài nguyên nữa
- Hàng rào kiểm thử và di trú cũng đã được bổ sung

Điều này có nghĩa là sau này dù tiếp tục làm:

- Tối ưu tương tác
- Tối ưu prompt
- Củng cố khả năng dựng phim
- Chuẩn hóa mô hình dữ liệu

Đều đã có nền tảng phía sau vững hơn.
