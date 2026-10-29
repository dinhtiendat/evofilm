# Jellyfish Agent Guide

## Quy tắc mã nguồn

1. Sau khi thay đổi API, bắt buộc chạy `pnpm run openapi:update` để đồng bộ OpenAPI.
2. Khi frontend gọi API backend, thống nhất dùng OpenAPI generated client, không thêm service bọc thủ công mới.
3. Khi mức lặp lại style phía trước lớn hơn 1 lần, nên ưu tiên tách thành component tái sử dụng hoặc cấu trúc style dùng chung.
4. Backend phải phân định rõ ràng trách nhiệm giữa tầng `api` và tầng `service`:
   - Tầng `api` chịu trách nhiệm nhận tham số, xác thực, tổ chức phản hồi.
   - Tầng `service` chịu trách nhiệm logic nghiệp vụ, chu chuyển trạng thái, điều phối dữ liệu.
5. Khối mã như hàm, lớp bắt buộc thêm chú thích:
   - Đưa ra giới thiệu chức năng (nói rõ “làm gì” và “tồn tại vì sao”).
   - Hàm phức tạp cần bổ sung chú thích về tham số, giá trị trả về (nếu có) và logic bên trong chính.
   - Chú thích cần đồng bộ với thực hiện, tránh mô tả lỗi thời hoặc sáo rỗng.
6. Trong thư mục tài liệu `site`:
   - `site/content/blog` dùng để lưu release note.
   - Release note của phiên bản đã đóng băng, khi chưa được chỉ định rõ thì không được sửa.
7. Trách nhiệm các chuyên mục của `site/content/docs` phải được phân định rõ ràng:
   - `guide` = hướng dẫn phát triển / how-to, trả lời “làm thế nào”.
   - `architecture` = kiến trúc hiện tại, trả lời “bây giờ là gì”.
   - `plans` = kế hoạch tác vụ, trả lời “tiếp theo làm gì”.
   - `reference` = tài liệu tham khảo ổn định, trả lời “tra gì”.
8. Khi thêm hoặc điều chỉnh tài liệu, phải xác định trước nội dung thuộc về:
   - Thực tế hiện tại, ranh giới hiện tại, luân chuyển trạng thái hiện tại, đặt vào `architecture`.
   - Phương án cải tạo đang hoặc sẽ triển khai, phân rã tác vụ, kế hoạch từng giai đoạn, đặt vào `plans`.
   - Hướng dẫn thao tác, quy trình phát triển, cách kết nối, đặt vào `guide`.
9. Hợp đồng chung liên quan năng lực tạo (DTO vào/ra, cấu hình nhà cung cấp, v.v.) thống nhất đặt trong `app/core/contracts`:
   - `tasks` chỉ giữ đóng gói, điều phối và điều phối thực thi tác vụ, không định nghĩa DTO vượt tầng.
   - `integrations` chỉ phụ thuộc `contracts`, không phụ thuộc module type của `tasks`.

## Trách nhiệm trang phía trước

1. Trang chỉnh sửa phân cảnh = Chuẩn bị
   - Phụ trách trích xuất tài nguyên/lời thoại, xác nhận ứng viên, chỉnh sửa thông tin cơ bản.
   - Chịu trách nhiệm đẩy phân cảnh tới `ready`.
2. Studio phân cảnh = Tạo
   - Chịu trách nhiệm độ sẵn sàng tạo video, khung hình chính, ảnh, tham số video và tạo video.
   - Không nên chịu trách nhiệm chính về xác nhận trích xuất.
3. Trung tâm tác vụ = bảng trạng thái tác vụ dùng chung
   - Chỉ chịu trách nhiệm hiển thị thông tin tác vụ dùng chung, nhẹ, như trạng thái, tiến độ, thành công/thất bại, hủy và cổng quay lại.
   - Không mang tóm tắt ngữ cảnh nghiệp vụ riêng, không hiển thị ngữ cảnh gỡ lỗi prompt, chi tiết ánh xạ hình-văn và các thông tin nặng khác.
   - Chi tiết nghiệp vụ nên để trong panel nghiệp vụ tương ứng để hiển thị, ví dụ popup prompt, panel tạo, panel chẩn đoán.

## Quy ước ngữ nghĩa trạng thái

1. `shot.status` chỉ biểu thị **trạng thái xác nhận trích xuất thông tin**:
   - `pending` = phân cảnh hiện tại vẫn còn việc xác nhận trích xuất chưa hoàn tất.
   - `ready` = phân cảnh hiện tại đã hoàn tất xác nhận trích xuất, có thể vào bước chuẩn bị tạo.
2. `shot.status` không dùng để diễn đạt trạng thái tạo ở runtime:
   - `generating` không còn được dùng làm `shot.status` chính thức.
   - Trạng thái đang chạy thống nhất lấy từ hệ thống tác vụ và runtime summary.
3. `video-readiness` riêng thể hiện **có đủ điều kiện tạo video hay không**:
   - Nó tách biệt với `shot.status`.
   - `shot.status = ready` không đồng nghĩa chắc chắn có thể tạo video ngay.
4. Khi hiển thị trang phải phân biệt rõ ba loại trạng thái:
   - Trạng thái xác nhận thông tin
   - Trạng thái tác vụ runtime
   - Độ sẵn sàng tạo video
5. Sau khi thay đổi ngữ nghĩa trạng thái, phải đồng bộ:
   - Triển khai phía sau
   - OpenAPI
   - Kiểu generated phía trước
   - Tài liệu phát triển / tài liệu mô tả

## Quy ước quy trình chính phân cảnh

1. Quy trình chính chuẩn là:
   - Trích xuất phân cảnh từ nội dung chương
   - Trang chỉnh sửa phân cảnh hoàn tất trích xuất và xác nhận các thông tin cơ bản như tài nguyên/lời thoại
   - Studio phân cảnh hoàn tất khung hình chính, ảnh tham chiếu, tham số video và kiểm tra độ sẵn sàng tạo video
   - Studio phân cảnh khởi động tạo video
2. Ranh giới trách nhiệm mặc định:
   - Trang chỉnh sửa phân cảnh phụ trách "trích xuất, xác nhận, chỉnh sửa".
   - Studio phân cảnh phụ trách “chuẩn bị tạo, thực thi tạo, xem kết quả”.
3. Nếu trong studio vẫn giữ các khả năng liên quan trích xuất:
   - Chỉ tồn tại với vai trò lối vào nhanh hoặc lối vào chẩn đoán.
   - Không nên trở lại làm lối vào chính xác nhận trích xuất.
4. Khi điều chỉnh tương tác trang, ưu tiên đảm bảo luồng này được duy trì:
   - Sau khi trang chỉnh sửa chuẩn bị xong, dẫn rõ ràng vào studio để tiếp tục tạo.
   - Khi studio phát hiện phân cảnh chưa ready, dẫn về trang chỉnh sửa để xác nhận một cách rõ ràng.

## Quy ước phối hợp

1. Sau khi sửa API, kiểu, mô hình trạng thái, ưu tiên đồng bộ:
   - Triển khai phía sau
   - OpenAPI
   - Kiểu generated phía trước
   - Tài liệu phát triển tương ứng
2. Khi điều chỉnh ranh giới trách nhiệm, ưu tiên giữ nguyên:
   - Trang chỉnh sửa phân cảnh phụ trách “chuẩn bị”
   - Studio phân cảnh phụ trách “tạo”
3. Khi chưa được yêu cầu rõ, không sửa release note lịch sử đã đóng băng.
4. khi liên quan điều chỉnh cấu trúc hệ thống, ngữ nghĩa trạng thái, ranh giới trách nhiệm trang, bắt buộc phải đồng bộ cập nhật tài liệu `site`:
   - quy tắc hiện đang hiệu lực, cập nhật vào `site/content/docs/architecture/`
   - các phương án đang triển khai, cập nhật vào `site/content/docs/plans/`
5. `architecture` và `plans` phải luôn cập nhật động, không được để trôi chậm lâu so với trạng thái mã thực tế:
   - Kiến trúc đã triển khai nhưng tài liệu chưa cập nhật được coi là chưa xong
   - Kế hoạch đã thay đổi nhưng tài liệu chưa cập nhật được coi là chưa xong
6. Khi điều chỉnh UI hệ thống tác vụ, ưu tiên giữ nguyên:
   - Trung tâm tác vụ chỉ hiển thị thông tin tác vụ dùng chung
   - Bối cảnh nghiệp vụ và thông tin gỡ lỗi giữ trong giao diện nghiệp vụ tương ứng
   - Không để trung tâm tác vụ biến thành trang chi tiết nghiệp vụ mới

## Quy ước cập nhật tài liệu

1. Nguyên tắc cập nhật tài liệu `architecture`:
   - Chỉ ghi lại phần triển khai hiện đang thực sự hiệu lực
   - Không trộn nội dung “sau này định sửa thế nào”
   - Khi hành vi mã, ngữ nghĩa trạng thái, trách nhiệm trang thay đổi, bắt buộc phải chỉnh sửa đồng bộ
2. Nguyên tắc cập nhật tài liệu `plans`:
   - Ghi lại các kế hoạch, tác vụ theo giai đoạn và phương án đang triển khai
   - Khi phạm vi kế hoạch, mức ưu tiên, đường thực thi thay đổi, phải cập nhật đồng bộ
   - sau khi một kế hoạch ổn định triển khai, nên tích lũy vào `architecture` hoặc phát hành lên `blog`
3. Nếu cùng một chủ đề liên quan cả “thực tế hiện tại” lẫn “kế hoạch tương lai”:
   - Viết thực tế hiện tại vào `architecture`
   - Thực thi tương lai ghi vào `plans`
   - Không được viết lẫn trong cùng một bài how-to
4. quy phạm định dạng và văn phong release note(`site/content/blog`):
   - Bắt buộc dùng cấu trúc mục ổn định (cắt tỉa theo nhu cầu, nhưng giữ nguyên thứ tự):
     - `Highlights`
     - `Added` / `Changed` / `Fixed`
     - `Breaking Changes` (bắt buộc ghi nếu có thay đổi hành vi hoặc hợp đồng)
     - `Deprecations` (nếu có đường loại bỏ thì phải ghi)
     - `Security`
     - `Known Issues`
     - `Migration Guide`
     - `Rollback Notes`
     - `Compatibility Matrix`
     - `Validation Commands`
     - `Upgrade Checklist`
     - `References`
     - `Notes for Contributors`
     - `Acknowledgements`
   - Bắt buộc phải có frontmatter: `title`, `date`, `description`, `tags`, `authors`.
   - Yêu cầu văn phong:
     - Dùng “giọng văn phát hành của người bảo trì”, ưu tiên kết luận và thông tin có thể thực thi, tránh kể lể dài dòng.
     - Thuật ngữ phải ổn định, nhất quán (như `shot.status`, runtime task status, `video-readiness`).
     - Các bước nâng cấp, hoàn tác, lệnh xác thực phải thực thi được trực tiếp, tránh mô tả mơ hồ.
   - Yêu cầu dễ đọc bên ngoài:
     - Ưu tiên đoạn ngắn và cách diễn đạt dạng danh sách; tránh giải thích cùng một sự thật nhiều lần.
     - Phân biệt rõ “năng lực mới”, “thay đổi hành vi”, “rủi ro tương thích”, “vấn đề đã biết”.

## Trạng thái hoàn thành chuẩn

Các trường hợp dưới đây trong điều kiện mặc định, đạt đủ mọi điều kiện mới được coi là “hoàn thành”:

1. Mã thực hiện hoàn thành:
   - Mã tính năng đã triển khai xong
   - Không có mã giữ chỗ (placeholder) rõ ràng còn sót
   - Không còn mã tương thích vô hiệu tồn đọng
   - Các khối mã hàm, class thêm mới hoặc thay đổi đã bổ sung chú thích cần thiết và nhất quán với triển khai
2. Hoàn thành giao diện/ký hiệu:
   - nếu API phía sau có thay đổi, đã chạy `pnpm run openapi:update`
   - generated types phía frontend đã được đồng bộ
   - Các cuộc gọi frontend đã chuyển sang OpenAPI generated client
3. Hoàn thành tài liệu:
   - Nếu ảnh hưởng hành vi hệ thống hiện tại, đã cập nhật `architecture`
   - Nếu ảnh hưởng kế hoạch thực thi tiếp theo, đã cập nhật `plans`
   - Nếu là ghi chú phát hành, cập nhật `blog` khi cần
4. Hoàn thành trách nhiệm trang:
   - Trang chỉnh sửa phân cảnh tiếp tục giữ định vị “chuẩn bị”
   - Studio phân cảnh tiếp tục giữ định vị “tạo”
   - Không đưa nhầm lẫn trách nhiệm mới vào
5. Hoàn thành xác minh:
   - Sau khi sửa phía trước, tối thiểu phải qua `pnpm exec tsc --noEmit`
   - Sau khi sửa backend, tối thiểu phải qua các kiểm thử liên quan hoặc xác thực cú pháp/import ở mức tối thiểu
6. Hoàn thành báo cáo kết quả:
   - Nêu rõ đã thay đổi gì
   - Nêu rõ kết quả xác minh
   - Nếu có mục chưa hoàn thành hoặc đề xuất tiếp theo, cần nêu riêng
