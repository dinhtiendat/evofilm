---
title: "Ranh giới trách nhiệm trang phân cảnh"
description: "Giải thích cho người phát triển về sự phân chia trách nhiệm giữa trang chỉnh sửa phân cảnh và studio phân cảnh, cùng quy trình chính được khuyến nghị giữa giai đoạn chuẩn bị và giai đoạn tạo."
weight: 8
---

## Bối cảnh

Khi `shot.status` thu hẹp còn:

- `pending`
- `ready`

và `video-readiness` trở thành bước kiểm tra độ sẵn sàng tạo độc lập, các trang liên quan phân cảnh cũng cần phân biệt rõ:

- Trang nào phụ trách chuẩn bị
- Trang nào phụ trách tạo

Nếu ranh giới hai lớp này không rõ, trang sẽ dễ mọc lại thành “trang lớn lai tạp, cái gì cũng làm được một chút”.

## Kết luận cốt lõi

Phân công trang hiện được khuyến nghị là:

```text
ChapterShotEditPage
  = Trang chuẩn bị phân cảnh

ChapterStudio
  = Bàn làm việc tạo phân cảnh
```

Tức là:

```text
Trang chỉnh sửa phân cảnh
→ Trích xuất, xác nhận, sửa chữa

Studio phân cảnh
→ Khung hình chính, ảnh tham chiếu, tham số video, tạo video
```

## `ChapterShotEditPage` Trách nhiệm của

Trang này phụ trách chuẩn bị phân cảnh đơn đến mức có thể vào giai đoạn tạo.

### Hành động nên giữ ở luồng chính

- Trích xuất và làm mới ứng viên
- Không cần trích xuất / khôi phục trích xuất
- Ứng viên tài nguyên: liên kết / tạo mới / bỏ qua
- Ứng viên thoại: chấp nhận / Bỏ qua / Chấp nhận hàng loạt / Bỏ qua hàng loạt
- Sửa thông tin cơ bản của phân cảnh đơn

### Mục tiêu của trang này

Hoàn tất:

- Xác nhận ứng viên tài nguyên
- Xác nhận ứng viên thoại
- `skip_extraction` v.v., quyết định chuẩn bị
- `shot.status = ready`

Có thể hiểu trang này như:

```text
Bàn chuẩn bị phân cảnh đơn / Bàn xác nhận cuối cùng
```

## Trách nhiệm của `ChapterStudio`

Trang này chịu trách nhiệm xử lý liên tục việc chuẩn bị tạo và thực thi phân cảnh trong chương.

### Hành động nên giữ ở luồng chính

- cảnh đơn và hàng loạt `video-readiness`
- Khung hình chính và ảnh tham chiếu
- Prompt video và tham số tạo
- Tạo video cho phân cảnh đơn
- Kiểm tra trước khi tạo hàng loạt
- Tạo hàng loạt

### Mục tiêu của trang này

Trả lời:

- Phân cảnh hiện tại có thể tạo video không
- Còn thiếu gì
- Trước nên bổ khung hình chính, ảnh tham chiếu hay tham số video
- Trong một chương, phân cảnh nào có thể thúc đẩy hàng loạt

Có thể hiểu trang này như:

```text
Bàn làm việc tạo trong chương
```

## Những hành động nào nên hạ cấp khỏi studio

Để tránh `ChapterStudio` thành “trang chỉnh sửa thứ hai”, những hành động dưới đây nên dần hạ cấp khỏi quy trình chính:

- Không cần trích xuất
- Bỏ qua ứng viên
- Chấp nhận / bỏ qua thoại
- Nhanh liên kết / tạo mới

Cách được khuyến nghị hơn là:

- Hiển thị kết quả chẩn đoán trong studio
- Hành động chính được thống nhất thành:
  - `Đi sửa và xác nhận phân cảnh`
  - `Đi sửa, xác nhận thoại phân cảnh`

## Luồng chính được khuyến nghị giữa hai trang

```text
ChapterShotEditPage
→ Trích xuất và xác nhận
→ shot.status = ready
→ Vào ChapterStudio
→ Xem video-readiness
→ Khung hình chính / Ảnh tham chiếu / Tham số video
→ Tạo video
```

Nếu trong `ChapterStudio` phát hiện:

- `shot.status = pending`
- `video-readiness.extraction_ready = false`

Thì nên đưa về lại:

```text
ChapterShotEditPage
```

Tiếp tục hoàn thành xác nhận trích xuất.

## Ranh giới trạng thái

Để sự phân công của các trang khớp với trạng thái phía backend, nên luôn tuân thủ quy tắc sau:

- `shot.status`
  - Chỉ thể hiện trạng thái xác nhận trích xuất thông tin
- `video-readiness`
  - Chỉ thể hiện điều kiện tiên quyết tạo video có đạt không
- runtime task
  - Chỉ thể hiện hiện có tác vụ tạo đang chạy không

Nói cách khác:

```text
Trạng thái chuẩn bị
≠
Trạng thái có thể tạo video
≠
Trạng thái đang tạo
```

Ba thứ này nên hiển thị riêng biệt, không nên trộn tiếp vào cùng một trường hay cùng một loại thông báo.
