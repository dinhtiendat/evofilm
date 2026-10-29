---
title: "Ghi chú phát hành v0.1.0-alpha"
date: 2026-04-02
description: "Ranh giới năng lực của phiên bản alpha đầu tiên của Jellyfish, trọng điểm hiện tại và hướng tiếp theo."
tags:
  - release
  - alpha
  - jellyfish
authors:
  - Jellyfish Team
---

Jellyfish `v0.1.0-alpha` là phiên bản alpha đầu tiên sau khi dự án bước vào giai đoạn có thể trải nghiệm công khai.

Trọng điểm của phiên bản này không phải "hoàn tất toàn bộ tính năng", mà là dựng trước khung xương chính của **bàn làm việc sản xuất kịch ngắn AI**, để dự án, chương, phân cảnh, tài nguyên, mô hình và chuỗi tạo có một nền tảng rõ ràng, có thể tiếp tục phát triển.

## Bản này bao gồm gì

### 1. Khung sườn bàn làm việc chính Studio

Phiên bản hiện tại đã có cấu trúc cơ bản để tổ chức trang và dữ liệu xoay quanh sản xuất kịch ngắn, gồm:

- Danh sách dự án và không gian làm việc dự án
- Các trang liên quan chương
- Các trang liên quan danh sách và chỉnh sửa phân cảnh
- Cổng vào quản lý tài nguyên
- Trang quản lý tệp, mô hình, Agent,...

Điều này có nghĩa là đường chính của sản phẩm không còn là những trang rời rạc, mà đã là một cấu trúc Studio tương đối hoàn chỉnh.

### 2. Chuỗi hợp tác frontend-backend tách biệt với OpenAPI

Frontend dựa trên React + Vite, backend dựa trên FastAPI.

Ở phiên bản này, frontend và backend đã xây dựng được cách hợp tác khá rõ ràng:

- Backend cung cấp các API route `studio / llm / film / script-processing`
- Frontend hợp tác với backend thông qua client OpenAPI sinh ra
- Luồng chạy thử cục bộ và đồng bộ giao diện đã chạy thông

Điều này rất quan trọng với việc lặp tính năng sau này, vì nó quyết định dự án có thể mở rộng ổn định liên tục hay không.

### 3. Phân tầng nền tảng để tích hợp năng lực AI

mặc dù phiên bản alpha này chưa phải trạng thái hoàn thành cuối, nhưng phân tầng năng lực liên quan AI đã có phôi hình:

- `chains/`: tiếp nhận điều phối Prompt, Agent và quy trình
- `services/`: tiếp nhận logic kết nối giữa nghiệp vụ và AI
- `core/tasks/`: tiếp nhận năng lực tầng tác vụ hình ảnh / video

diều này khiến Jellyfish không chỉ là một quản trị backend, mà là một hệ thống thực sự được thiết kế xung quanh sản xuất nội dung AI.

### 4. Khả năng cơ bản phát triển và triển khai cục bộ

Bản hiện tại đã hỗ trợ:

- Chạy cục bộ riêng rẽ phía trước và phía sau
- Cập nhật sinh OpenAPI
- khởi động phía trước, phía sau, MySQL và RustFS bằng Docker Compose

Nói cách khác, `v0.1.0-alpha` đã có cửa vào phát triển và trải nghiệm khá rõ ràng.

## Phần hiện vẫn thuộc alpha

Phiên bản này vẫn là alpha chứ chưa phải beta, nguyên nhân chính cũng rất rõ ràng:

- Quy trình chỉnh sửa và tạo phân cảnh vẫn đang tiếp tục làm sâu
- Năng lực prompt nâng cao và điền thông minh chưa hoàn thiện hẳn
- Chuỗi tác vụ ảnh / video vẫn còn chỗ để mài giũa tiếp
- Trải nghiệm trục thời gian và xuất cuối vẫn cần hoàn thiện thêm

Nói cách khác, `v0.1.0-alpha` giống hơn là:

**Kiến trúc chính đã được dựng, quy trình cốt lõi đã hình thành, nhưng nhiều chi tiết vẫn đang lặp nhanh.**

## Ai nên bắt đầu quan tâm bây giờ

Phiên bản này đã phù hợp cho những đối tượng sau bắt đầu tìm hiểu và dùng thử:

- Lập trình viên muốn nghiên cứu cấu trúc hệ thống sản xuất kịch ngắn AI
- Lập trình viên phía trước/sau muốn tham gia phối hợp mã nguồn mở
- Người quan tâm đến luồng phân cảnh, tài nguyên và tính nhất quán
- Đội muốn tiếp tục mở rộng khả năng dựa trên khung hiện có

Nếu bạn kỳ vọng một công cụ thành phẩm đã được tinh chỉnh hoàn hảo, thì hiện tại vẫn chưa phải hình thái cuối cùng.
nếu bạn quan tâm **phương hướng sản phẩm, cấu trúc kỹ thuật và thiết kế workflow**, phiên bản này đã đáng để bắt đầu theo dõi.

## Tiếp theo sẽ tiếp tục triển khai gì

Quanh phiên bản alpha này, trọng tâm các bước sau vẫn đặt vào:

- Sâu hóa đường dẫn chỉnh sửa và tạo phân cảnh
- Nâng cấp mẫu prompt và điền thông minh
- Hoàn thiện quản lý trạng thái và kết quả tác vụ
- Tối ưu tài liệu, trang web chính và trải nghiệm phối hợp

## Lời cảm ơn

Xin gửi lời cảm ơn tới tất cả những bạn đang quan tâm, thử dùng và tham gia Jellyfish.

`v0.1.0-alpha` không phải điểm kết, mà là điểm khởi đầu để dự án này thực sự vào giai đoạn tiến hóa mở.
