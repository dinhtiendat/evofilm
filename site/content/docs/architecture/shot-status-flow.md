---
title: "Giải thích luân chuyển trạng thái phân cảnh"
description: "Giải thích cho người phát triển shot.status, skip_extraction, cùng quy tắc trách nhiệm và luân chuyển của ứng viên tài nguyên và ứng viên thoại."
weight: 7
---

> Bài này thuộc tài liệu "Kiến trúc hiện tại", mô tả mô hình trạng thái và luật phán đoán backend đang có hiệu lực.

## Bối cảnh

Để “việc phân cảnh có đáp ứng điều kiện tạo video” có nguồn phán quyết thống nhất, truy vết được, hiện backend đã thu hẹp `shots.status` thu hẹp thành**trạng thái quy trình hệ thống**, và đưa vào hai bảng ứng viên để ghi lại trạng thái trung gian trong quá trình xác nhận trích xuất phân cảnh.

Mục tiêu của lần điều chỉnh này không phải thêm nhiều phán đoán ở frontend, mà là giao trạng thái chính thức cho backend duy trì thống nhất, frontend chỉ tiêu thụ kết quả.

## Kết luận cốt lõi

- `shots.status`: trạng thái quy trình hệ thống, chỉ được backend cập nhật
- `shots.skip_extraction`: người dùng tuyên bố rõ “phân cảnh hiện tại không cần trích xuất”
- `shot_extracted_candidates`: ghi trạng thái xử lý của từng mục ứng viên trích xuất tài nguyên
- `shot_extracted_dialogue_candidates`: ghi trạng thái xử lý của từng mục ứng viên trích xuất thoại

Nói cách khác:

```text
shots.status
  = Trạng thái luồng hệ thống

skip_extraction
  = Có bỏ qua trích xuất không

shot_extracted_candidates
  = Chi tiết xác nhận ứng viên tài nguyên

shot_extracted_dialogue_candidates
  = Chi tiết xác nhận ứng viên thoại
```

## Ngữ nghĩa `shot.status`

Hiện tại chỉ giữ hai trạng thức chính thức:

- `pending`
  - Phân cảnh hiện tại chưa hoàn thành quy trình xác nhận trước tạo video
- `ready`
  - Phân cảnh hiện tại đã có điều kiện tiên quyết vào tạo video

ở đây `ready` không còn biểu thị “trông chừng là ổn rồi”, mà biểu thị rõ ràng:

> Phân cảnh hiện tại đã hoàn thành xác nhận trích xuất thông tin, do đó đủ điều kiện vào tạo video.

Đặc biệt lưu ý:

> các tác vụ tạo đang chạy không còn ghi vào `shots.status`.
> “Đang tạo” nên thể hiện qua `GenerationTask / GenerationTaskLink`
> Được tổng hợp động, không tái sử dụng các trạng thái tĩnh như `pending / ready`.

## Quy tắc phán định `ready`

Phía sau thống nhất tính lại theo quy tắc sau:

1. Nếu `skip_extraction = true`, trạng thái là `ready`
2. Nếu chưa bao giờ trích xuất, trạng thái là `pending`
3. Nếu đã trích xuất nhưng không có mục ứng viên nào, trạng thái là `ready`
4. Nếu mọi ứng viên tài nguyên và ứng viên thoại đều đã xử lý xong, trạng thái là `ready`
5. Các trường hợp khác là `pending`

Trong đó “xử lý xong toàn bộ ứng viên tài nguyên” nghĩa là:

- `candidate_status = linked`
- Hoặc `candidate_status = ignored`

Trong đó “xử lý xong toàn bộ ứng viên thoại” nghĩa là:

- `candidate_status = accepted`
- Hoặc `candidate_status = ignored`

Chỉ cần vẫn còn bất kỳ ứng viên tài nguyên hay ứng viên thoại nào ở `pending`, phân cảnh không được vào `ready`.

Nếu một phân cảnh sau trích xuất không có ứng viên thoại nào, điều này sẽ không chặn `ready`.

## `shot_extracted_candidates` Trách nhiệm cấu trúc bảng

Bảng này ghi lại**Chi tiết xác nhận trích xuất tài nguyên cấp phân cảnh**, chứ không phải chính tài nguyên cuối cùng.

Các trường chính gồm:

- `shot_id`
- `candidate_type`
  - `character / scene / prop / costume`
- `candidate_name`
- `candidate_status`
  - `pending / linked / ignored`
- `linked_entity_id`
- `source`
- `payload`
- `confirmed_at`

Nên hiểu là:

```text
Một ứng viên trích xuất
→ Trước tiên chuyển sang pending
→ Sau khi người dùng xác nhận, trở thành linked hoặc ignored
```

## `shot_extracted_dialogue_candidates` Trách nhiệm cấu trúc bảng

Bảng này ghi lại**Chi tiết xác nhận trích xuất thoại cấp phân cảnh**.

Các trường chính gồm:

- `shot_id`
- `index`
- `text`
- `line_mode`
- `speaker_name`
- `target_name`
- `candidate_status`
  - `pending / accepted / ignored`
- `linked_dialog_line_id`
- `source`
- `payload`
- `confirmed_at`

Nên hiểu là:

```text
Một ứng viên thoại
→ Trước tiên chuyển sang pending
→ Sau khi người dùng chấp nhận, ghi vào ShotDialogLine, và trở thành accepted
→ Hoặc người dùng rõ bỏ qua, thành ignored
```

## Luồng điển hình

### Đường A: Trích xuất xác nhận thường

```text
extract
→ shot_extracted_candidates Ghi vào tài nguyên pending
→ shot_extracted_dialogue_candidates Ghi vào thoại pending
→ Người dùng xử lý ứng viên tài nguyên:linked / ignored
→ Người dùng xử lý ứng viên thoại:accepted / ignored
→ toàn bộ ứng viên tài nguyên và ứng viên thoại đã resolved
→ shot.status = ready
```

### Đường B: Rõ ràng không cần trích xuất

```text
Người dùng đặt skip_extraction = true
→ shot.status = ready
```

### Đường C: Hủy liên kết / thay thế

```text
candidate gốc = linked
→ Người dùng xóa liên kết / thay đối tượng liên kết / Xóa scene
→ candidate Rơi về pending
→ shot.status tính lại
```

## Điểm ghi ngược tự động đã kết nối

Hiện phía sau đã kết nối những hành động ghi ngược này:

- Sau khi API trích xuất xong, đồng bộ theo phân cảnh `shot_extracted_candidates`
- Sau khi API trích xuất xong, đồng bộ theo phân cảnh `shot_extracted_dialogue_candidates`
- sau khi liên kết nhân vật thành công, ghi ngược ứng viên nhân vật khớp thành `linked`
- Bối cảnh / Đạo cụ / sau khi liên kết trang phục thành công, ghi ngược ứng viên khớp thành `linked`
- `ShotDetail.scene_id` sau khi đặt thành công, ghi ngược ứng viên bối cảnh thành `linked`
- Xóa bối cảnh / Đạo cụ / sau khi liên kết trang phục, ứng viên tương ứng rơi về `pending`
- cùng index khi nhân vật bị thay, ứng viên nhân vật cũ bị thay sẽ rơi về `pending`
- `scene_id` từ A chuyển sang B, hoặc khi xóa, ứng viên bối cảnh cũ rơi về `pending`
- Sau khi chấp nhận ứng viên thoại, ghi vào `ShotDialogLine` và ghi ngược ứng viên thoại thành `accepted`
- Sau khi bỏ qua ứng viên thoại, ghi ngược ứng viên thoại thành `ignored`

## Ràng buộc phía trước

Trang phía trước hiện phải tuân theo quy tắc dưới đây:

> không còn tự suy ra `shot.status`, cũng không còn thủ công `pending/ready` ghi ngược về trạng thái cục bộ.

Cách làm đúng là:

- Gọi giao diện phía sau
- Dùng `ShotRead` mới nhất do phía sau trả về
- Trang chuẩn bị ưu tiên dùng trạng thái tập hợp backend `ShotPreparationState`
- dùng `shot_extracted_candidates` hiển thị mục tài nguyên chờ xác nhận
- dùng `shot_extracted_dialogue_candidates` hiển thị mục thoại chờ xác nhận

Hiện tại `ChapterStudio` và `ChapterShotEditPage` đã áp dụng ràng buộc này.

## Quy ước đồng bộ OpenAPI

Lần thay đổi này đã thêm mới:

- `GET /api/v1/studio/shots/{shot_id}/preparation-state`
- `GET /api/v1/studio/shots/{shot_id}/extracted-candidates`
- `PATCH /api/v1/studio/shots/{shot_id}/skip-extraction`
- `PATCH /api/v1/studio/shots/extracted-candidates/{candidate_id}/link`
- `PATCH /api/v1/studio/shots/extracted-candidates/{candidate_id}/ignore`
- `GET /api/v1/studio/shots/{shot_id}/extracted-dialogue-candidates`
- `PATCH /api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/accept`
- `PATCH /api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/ignore`

Sau khi giao diện cập nhật, phía trước nên chủ động chạy:

```bash
cd front
pnpm run openapi:update
```

Đừng tiếp tục viết tay thêm một lớp request lớp bọc để sao chép generated client.

## Quy ước trạng thái gom nhóm trang chuẩn bị

Để tránh phía trước tự đoán trạng thái cục bộ nào cần làm mới sau "liên kết/bỏ qua ứng viên", phía sau hiện đã bổ sung một giao thức trạng thái thống hợp của trang chuẩn bị:

- API truy vấn:
  - `GET /api/v1/studio/shots/{shot_id}/preparation-state`
- Giao diện liên kết hiện có dành riêng cho trang chuẩn bị:
  - `POST /api/v1/studio/shots/{shot_id}/preparation-link`
- Trạng thái tổng hợp:
  - `shot`
  - `assets_overview`
  - `dialogue_candidates`
  - `saved_dialogue_lines`
  - `pending_confirm_count`
  - `ready_for_generation`

Giao diện lệnh liên quan ứng viên tài nguyên hiện tại:

- `PATCH /api/v1/studio/shots/extracted-candidates/{candidate_id}/link`
- `PATCH /api/v1/studio/shots/extracted-candidates/{candidate_id}/ignore`
- `PATCH /api/v1/studio/shots/{shot_id}/skip-extraction`
- `PATCH /api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/accept`
- `PATCH /api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/ignore`

đã trả về thống nhất:

- `ShotPreparationMutationResult`
  - `action`
  - `state`

Nói cách khác, frontend của trang chuẩn bị sau này không nên tiếp tục tự viết như sau khi các thao tác này thành công:

- `loadAssetsOverview()`
- `refreshCurrentShot()`
- Tự ghép `pendingConfirmCount`

mà nên dùng trực tiếp trạng thái tổng hợp mới nhất do phía sau trả về.

## Gợi ý phát triển

Sau này nếu tiếp tục mở chuỗi này, mức ưu tiên được đề xuất là:

1. Tiếp tục bổ sung “hủy liên kết -> candidate trở về” thêm nhiều kịch bản biên
2. để trang chương, trang danh sách phân cảnh tiêu thụ nhiều hơn `status`
3. Nếu về sau thực sự xuất hiện ngữ nghĩa thủ công tần suất cao, hãy thêm riêng trường “đánh dấu thủ công”

Ở giai đoạn hiện tại, không nên trộn các ngữ nghĩa như làm lại thủ công, mức ưu tiên, bỏ qua vào `shots.status`.

## Ranh giới trách nhiệm của trang

Theo `shot.status`, xác nhận ứng viên cùng với `video-readiness` đóng lại, các trang liên quan phân cảnh giờ cũng có ranh giới trách nhiệm rõ hơn.

### `ChapterShotEditPage`: Trang chuẩn bị phân cảnh

Nhiệm vụ cốt lõi của trang này là:

- Trích xuất ứng viên tài nguyên và thoại
- Xác nhận ứng viên tài nguyên
- Xác nhận ứng viên thoại
- Điều chỉnh tiêu đề, ghi chú và thông tin cơ bản
- Đẩy phân cảnh hiện tại đến `shot.status = ready`

Có thể hiểu nó như:

```text
Bàn chuẩn bị phân cảnh đơn
```

Nói cách khác, bất kỳ điều gì ảnh hưởng trực tiếp đến:

- `skip_extraction`
- ứng viên tài nguyên `pending / linked / ignored`
- ứng viên thoại `pending / accepted / ignored`
- `shot.status = pending / ready`

Các hành động này nên ưu tiên hoàn thành ở trang chỉnh sửa phân cảnh.

### `ChapterStudio`: Bàn làm việc tạo phân cảnh

Nhiệm vụ cốt lõi của trang này là:

- Xem cảnh đơn và hàng loạt `video-readiness`
- Tạo khung hình chính và ảnh tham chiếu
- Điều chỉnh tham số tạo video
- Tạo video
- Thúc đẩy liên tiếp nhiều phân cảnh trong chương

Có thể hiểu nó như:

```text
Bàn làm việc tạo trong chương
```

Nó tập trung vào:

- Phân cảnh hiện tại có thể tạo video không
- Còn thiếu điều kiện tiên quyết tạo nào
- Trước tạo khung hình chính hay tạo video luôn
- Cách thúc đẩy hàng loạt phân cảnh

### Mối quan hệ hợp tác giữa hai trang

Luồng chính được khuyến nghị như sau:

```text
ChapterShotEditPage
→ Trích xuất và xác nhận
→ shot.status = ready
→ Vào ChapterStudio
→ Xem video-readiness
→ Khung hình chính / Ảnh tham chiếu / Tham số video
→ Tạo video
```

Đối chiếu với trách nhiệm trang, chính là:

- Trang chỉnh sửa phân cảnh phụ trách “chuẩn bị”
- Studio phân cảnh phụ trách “tạo”

Vì vậy, `ChapterStudio` “trạng thái xác nhận thông tin” trong / trạng thái thoại” phù hợp hơn để làm**điểm vào chẩn đoán**, chứ không tiếp tục gánh các thao tác xác nhận chính.
