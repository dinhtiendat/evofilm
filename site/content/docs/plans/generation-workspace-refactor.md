# Kế hoạch tái cấu trúc kiến trúc chuẩn bị tạo

## Bối cảnh

Việc tạo hình ảnh, tạo video, tạo hình ảnh tài nguyên hiện đều dần phơi bày cùng một kiểu vấn đề:

- Dùng lẫn giá trị thực cơ bản và nội dung cuối cùng
- Ngữ cảnh dùng cho xem trước và gửi không hoàn toàn nhất quán
- trạng thái nội bộ trang phân tán, dễ xuất hiện hỗn loạn ngữ nghĩa `stale / loading / submit`

Để tránh sửa đi sửa lại cùng loại vấn đề ở nhiều cổng vào, chuỗi tạo cần hội tụ thống nhất về cùng một kiến trúc "chuẩn bị tạo".

## Mô hình mục tiêu

Thống nhất dùng mô hình 4 lớp:

1. `Base Draft`
   - Giá trị thực nghiệp vụ có thể lưu và sửa
2. `Context`
   - Ngữ cảnh động của lần tạo này
3. `Derived Preview`
   - Dựa trên `Base Draft + Context` kết quả xem trước suy ra
4. `Submission Payload`
   - Tải cuối cùng thực sự gửi cho mô hình

## Phạm vi

Phạm vi của kế hoạch lần này:

1. Chuỗi tạo ảnh khung phân cảnh
2. Chuỗi xem trước và gửi prompt video
3. Chuỗi tạo ảnh tài nguyên

Lần này không đưa vào:

1. Trung tâm tác vụ
2. Tác vụ xử lý kịch bản
3. Luồng xác nhận trích xuất trên trang chỉnh sửa phân cảnh

## Giai đoạn đã hoàn thành

### Phase 1: bộ mẫu shared + frame

- Thêm mới `studio/generation/shared`
- Thêm mới `studio/generation/frame`
- Đường link ảnh khung hình chính trước tiên tách theo `Base / Context / Derived / Submission`
- Giữ nguyên đường dẫn API cũ, thay trước các lượt gọi service nội bộ

### Phase 2: Hook draft thống nhất phía frontend

- Thêm mới `useGenerationDraft`
- Hộp thoại ảnh khung phân cảnh trước hết kết nối vào máy trạng thái thống nhất

### Giai đoạn 3: Di trú chuỗi tạo video

- Xem trước và gửi video thống nhất chuyển sang `derive -> submit`
- Đảm bảo readiness, preview, submit cùng dùng một bộ quy tắc ngữ cảnh

### Giai đoạn 4: Di trú chuỗi ảnh tài nguyên

- Tạo hình ảnh nhân vật / diễn viên / bối cảnh / đạo cụ / trang phục thống nhất hội tụ về một mối

## Tiến độ hiện tại

- Đã hoàn thành: chuỗi render prompt cuối cùng và submit ảnh khung hình chính được thống nhất qua một bước render dự phòng
- Đã hoàn thành: thiết lập thư mục dịch vụ `generation/shared + generation/frame`
- đã xong:trừu tượng `useGenerationDraft` phía trước, và nối vào chuỗi preview và submit prompt khung hình chính
- Đã hoàn thành: xây dựng thư mục service `generation/video`, video preview / submit dùng chung cùng một reference context
- Đã hoàn tất: dựng thư mục dịch vụ `generation/asset_image`, ảnh nhân vật / diễn viên / bối cảnh / đạo cụ / trang phục thống nhất tiếp nhận cấu trúc render / submit
- Đã hoàn thành: `AssetEditPageBase` nối vào `useGenerationDraft`, front-end ảnh tài nguyên đã thống nhất về ngữ nghĩa draft / context / derived / submit

## Dọn dẹp còn lại

Di trú chuỗi chính hiện đã hoàn tất, sau đó chỉ còn một số mục chốt quy mô nhỏ:

1. Tiếp tục nén logic phụ trợ cục bộ xung quanh khung hình chính / bản nháp video bên trong `ChapterStudio`
2. Xử lý các vấn đề tồn đọng về kiểu frontend hiện có trong repo vào thời điểm phù hợp sau này
3. Kết hợp yêu cầu tiếp theo để đánh giá xem có cần tiếp tục tách ra các thành phần UI tạo chung dụng hơn
