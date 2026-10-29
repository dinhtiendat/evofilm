---
title: "Quy hoạch phát triển"
weight: 6
description: "Jellyfish Trọng tâm phát triển, thứ tự ưu tiên và hướng triển khai của giai đoạn tiếp theo."
---

của dự án hiện tại**quy trình cốt lõi**và**Kiến trúc dữ liệu**về cơ bản đã ổn định. Dù vẫn còn một số vấn đề chi tiết và bất nhất cục bộ, nhưng phương hướng tổng thể đã rõ ràng, đủ điều kiện bước sang giai đoạn tối ưu có hệ thống và đào sâu tính năng.

Giai đoạn tiếp theo sẽ xoay quanh “**củng cố cấu trúc trước, nâng trải nghiệm sau, rồi mới bù khả năng**”để đẩy tiến, thứ tự ưu tiên tổng thể như sau:

1. **Tối ưu cấu trúc dự án**
2. **Tối ưu tính tương tác**
3. **Tối ưu prompt**
4. **Hoàn thiện tính năng dựng phim**

## Mục tiêu giai đoạn

Trọng tâm phát triển tiếp theo không còn là tích hợp tính năng nhanh, mà chuyển sang các hướng:

- Nâng khả năng đọc và bảo trì mã nguồn
- Gộp mô hình dữ liệu và quy ước giao diện
- Tối ưu trải nghiệm tương tác trong quy trình quan trọng
- nâng cao đa Agent độ ổn định và chất lượng đầu ra của prompt trong các kịch bản đa Agent
- Trên tiền đề không thiết kế quá mức, từng bước bổ khả năng dựng phim

Nói cách khác, dự án về sau sẽ coi trọng hơn “**ổn định, rõ ràng, có thể phát triển lâu dài**”, chứ không đơn thuần là “tính năng hoạt động được”.

## Tổng quan mức ưu tiên phát triển

### 1. Tối ưu cấu trúc dự án

Đây là **ưu tiên cao nhất** của giai đoạn hiện tại.

Vì dự án chủ yếu do một người tự phát triển, nên có khá nhiều AI code do AI hỗ trợ. Cách làm này tuy tăng tốc độ phát triển giai đoạn đầu, nhưng cũng kéo theo một số vấn đề thường gặp:

- Khả năng tái sử dụng mã nguồn còn thiếu
- Đặt tên và ranh giới trách nhiệm chưa thống nhất
- Mã nguồn cục bộ khó đọc
- Một số tầng bị lẫn trách nhiệm
- Mối quan hệ dữ liệu hơi nhiều, chi phí bảo trì sau cao

Vì vậy, trước khi tiếp tục mở rộng tính năng, nhất thiết phải dọn rõ cấu trúc dự án trước.

#### Hướng tối ưu

**Chuẩn hóa mô hình dữ liệu**

- Sắp xếp mô hình dữ liệu hiện có
- Giảm mối liên kết không cần thiết
- Gộp trường trùng và ngữ nghĩa trùng
- Làm rõ hơn ranh giới đối tượng nghiệp vụ cốt lõi

**Chuẩn hóa tầng Service**

- Xác định rõ ranh giới trách nhiệm service
- Tránh để logic nghiệp vụ rải ở tầng API hay tầng mô hình
- Nâng khả năng tái sử dụng tầng service
- Cho quy trình phức tạp có nơi chứa ổn định

**Tối ưu tầng API**

- Chuẩn hóa tham số vào của giao diện
- Chuẩn hóa cấu trúc trả về của giao diện
- Thống nhất phản ứng lỗi và cách diễn đạt trạng thái
- Giảm vấn đề hành vi giao diện không nhất quán

**Sửa chữa cấu trúc thư mục**

- Xác định rõ phân công trách nhiệm của từng thư mục
- Giảm tình huống “không rõ tên là làm gì”
- Nâng hiệu suất định vị mã nguồn và hợp tác

**Dọn mã nguồn vô dụng**

- Dọn triển khai thử nghiệm còn lại
- Xóa logic trùng và mã tương thích giá trị thấp
- Giảm tải bảo trì

### 2. Tối ưu tính tương tác

Tối ưu tương tác là ưu tiên thứ hai.

Dự án hiện tại về quy trình chính đã “sử dụng được cơ bản”, nhưng tương tác ở một số bước quan trọng vẫn chưa đủ trực quan, nhất là:

#### Quy trình trích xuất thông tin tài nguyên kịch bản

Bước trích xuất thông tin tài nguyên như nhân vật, bối cảnh, trang phục, đạo cụ từ kịch bản hiện dù đã dùng được nhưng trải nghiệm tổng thể vẫn khá gượng, các vấn đề chính gồm:

- Quy trình trích xuất thông tin chưa đủ rõ
- Người dùng khó nhanh quyết kết quả trích xuất có tin cậy không
- Chuỗi sửa, xác nhận, hiệu chỉnh chưa đủ mượt
- Sự nối tiếp giữa kết quả với các phân cảnh sau và quản lý tài nguyên vẫn có thể tự nhiên hơn

#### Trọng tâm tối ưu tiếp theo

- Nâng mức trực quan hóa quy trình trích xuất tài nguyên
- Tối ưu cách hiển thị kết quả trích xuất
- Tăng tiện ích xác nhận và sửa thủ công
- Tăng cường trải nghiệm liên kết giữa kết quả trích xuất và trang tiếp theo

Mục tiêu của phần này không đơn thuần là “đẹp hơn”, mà là giúp các bước nghiệp vụ quan trọng trở nên**hiểu được, xác nhận được, thao tác được**.

### 3. Tối ưu prompt

Tối ưu prompt là ưu tiên hạng ba, nhưng ảnh hưởng rất lớn đến chất lượng đầu ra của dự án.

Dự án hiện tại đã bao gồm nhiều Agent, khác Agent mỗi cái đảm nhận các tác vụ như xử lý kịch bản, trích xuất tài nguyên, tạo hình ảnh, tạo khung hình chính. Giai đoạn tiếp theo cần tối ưu hóa có hệ thống các prompt này, để nâng cao:

- Độ ổn định đầu ra
- Tính nhất quán kết quả
- Khả năng kiểm soát
- Mức độ phù hợp với quy trình nghiệp vụ

#### Phạm vi tối ưu trọng điểm

**Prompt liên quan tạo ảnh**

- Prompt tạo ảnh diễn viên
- Prompt tạo ảnh bối cảnh
- Prompt tạo ảnh trang phục
- Prompt tạo ảnh đạo cụ
- Prompt tạo ảnh nhân vật

**Prompt liên quan khung hình chính**

- Prompt văn bản ảnh khung hình chính đầu/cuối
- Prompt tạo ảnh khung hình chính đầu/cuối

**Prompt liên quan xử lý kịch bản**

- Prompt tối ưu kịch bản
- Prompt trích xuất thông tin tài nguyên kịch bản

#### Mục tiêu tối ưu

- Làm prompt gần hơn với bối cảnh nghiệp vụ thực tế của dự án
- Nâng tính nhất quán kết quả tạo trong cùng dự án
- Giảm đầu ra vô hiệu và lạc đề
- để Agent sự nối tiếp ngữ cảnh giữa các phần ổn định hơn

Trọng tâm giai đoạn này không phải là làm cho prompt phức tạp hơn, mà là để prompt thực sự phục vụ quy trình sản phẩm.

### 4. Tính năng dựng phim

Tính năng dựng phim có ưu tiên thấp nhất.

Nguyên nhân khá rõ ràng:

- Bản thân dựng phim thiên về khả năng phía trước
- Khả năng dựng phim phức tạp khó vượt phần mềm chỉnh sửa chuyên nghiệp
- Dự án hiện tại đã có khả năng xuất
- Xem từ giá trị sản phẩm tổng thể, biên tập không phải điểm khác biệt cốt lõi nhất ở giai đoạn hiện tại

Vì vậy, đầu tư cho tính năng biên tập ở các bước sau sẽ giữ chừng mực, thiên về đáp ứng “**đủ dùng, trôi chảy, nối được với xuất**”nhằm mục tiêu này, chứ không phải tiến theo hướng trình biên tập video chuyên nghiệp.

#### Đánh giá hiện tại

Tính năng biên tập vẫn được giữ và hoàn thiện dần, nhưng không trở thành trọng điểm phát triển chính trong thời gian tới.

#### Hướng tiếp theo

- Tối ưu trải nghiệm cơ bản của quy trình dựng phim có sẵn
- Đảm bảo liên kết ổn định với nguyên liệu, trục thời gian, chuỗi xuất
- Kiểm soát ranh giới tính năng, tránh đổ quá nhiều vào cuộc đua với khả năng biên tập chuyên nghiệp

## Chiến lược phát triển tổng thể

Phát triển tiếp sẽ tuân theo các nguyên tắc sau:

### Trước tiên sửa chữa, sau đó mở rộng

Trước khi cấu trúc được sắp xếp rõ, không vội tăng tính năng phức tạp.

### Trước chuẩn hóa, sau tối ưu trải nghiệm

API, mô hình dữ liệu, service phân lớp trước khi thu hẹp, tối ưu tương tác mới dễ áp dụng ổn định hơn.

### Tối ưu prompt phục vụ nghiệp vụ, không tồn tại độc lập

Prompt sẽ không được đẩy theo hướng riêng như “mục nghiên cứu”, mà được tối ưu dần quanh các điểm nghiệp vụ cụ thể.

### Tính năng dựng phim giữ ý thức ranh giới

Giữ vững “thực dụng trước”, tránh bỏ quá nhiều công sức sao chép khả năng của phần mềm chuyên nghiệp.

## Gợi ý mốc theo giai đoạn

### Giai đoạn 1: Sửa chữa cấu trúc

- Chuẩn hóa mô hình dữ liệu
- Chuẩn hóa giá trị trả về của giao diện
- Chuẩn hóa tầng service
- Sắp xếp cấu trúc thư mục
- Dọn mã nguồn vô dụng

### Giai đoạn 2: Tối ưu trải nghiệm quy trình

- Tối ưu tương tác quy trình trích xuất tài nguyên
- Nâng tổ chức thông tin và trải nghiệm thao tác trang quan trọng
- Gộp các nút dễ lẫn trong luồng chính

### Giai đoạn 3: Tối ưu chuyên sâu prompt

- Sắp xếp trách nhiệm prompt nhiều Agent
- Tối ưu prompt liên quan ảnh, khung hình chính, kịch bản theo từng module
- Nâng tính ổn định và nhất quán của kết quả

### Giai đoạn 4: Bổ sung khả năng dựng phim

- Bổ sung khả năng cơ bản có thể dùng
- Tối ưu trải nghiệm trước khi xuất
- Giữ nhẹ gọn và ranh giới rõ ràng

## Tổng kết

Dự án đã đi từ “xây dựng nhanh nguyên mẫu” sang giai đoạn “giũa có hệ thống”.

Trọng tâm tiếp theo không phải tiếp tục mở rộng vô thứ tự, mà là đẩy lùi theo các trục sau:

- **Sửa chữa cấu trúc**
- **Làm mượt quy trình**
- **Làm ổn định prompt**
- **Làm dựng phim thành khả năng hỗ trợ đủ dùng**

Điều này sẽ giúp dự án tiến dần từ “chạy được” sang “ổn định hơn, rõ ràng hơn, phù hợp phát triển dài hạn hơn”.
