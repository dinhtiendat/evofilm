---
title: "Tạo prompt cơ bản phân cảnh"
description: "giải thích ngữ cảnh sinh hiện tại và quy tắc kế thừa phong cách của prompt nền khung đầu, khung chính, khung cuối của shot."
weight: 9
---

> Bài này thuộc tài liệu "Kiến trúc hiện tại", mô tả các quy tắc tạo prompt cơ bản đang có hiệu lực.

## Kết luận cốt lõi

Kết quả AI tạo ra cho khung hình đầu, khung hình chính, khung hình cuối của phân cảnh, hiện được định nghĩa thống nhất là:

```text
Prompt cơ sở
```

Tức là:

- Chỉ mô tả bản thân khung hình
- Không chứa `Hình 1 / Hình 2`
- Không chứa `## Diễn giải nội dung hình ảnh`
- Không trực tiếp chịu trách nhiệm diễn giải ánh xạ ảnh cuối

Prompt cuối cùng gửi cho mô hình ảnh, do `frame-render-prompt` ở bước sau tiếp tục dựa trên:

- Prompt cơ sở
- Hướng dẫn trách nhiệm của khung hiện tại
- Thứ tự ảnh tham chiếu hiện tại

thực hiện kết xuất lần hai.

## Ngữ cảnh đầu vào hiện tại

Tác vụ prompt cơ bản hiện tổng hợp các thông tin sau:

- Tiêu đề phân cảnh
- Trích dẫn kịch bản
- Mô tả bổ sung phân cảnh
- Cận / góc máy / chuyển động máy / thời lượng
- Không khí / Nhãn cảm xúc / Diễn giải hiệu ứng đặc biệt
- Tóm tắt thoại
- Mốc hành động đã xác nhận (`action_beats`)
- `visual_style` cấp dự án
- `style` cấp dự án
- `unify_style` cấp dự án
- Nhân vật đã xác nhận của phân cảnh và mô tả của nó
- Bối cảnh đã xác nhận của phân cảnh và mô tả của nó
- Đạo cụ đã xác nhận của phân cảnh và mô tả của nó
- Trang phục đã xác nhận của phân cảnh và mô tả của nó
- Tiêu đề phân cảnh trước, trích đoạn kịch bản và bản tóm tắt trạng thái kết
- Tiêu đề phân cảnh sau, trích đoạn kịch bản và bản tóm tắt mục tiêu đầu
- Gợi ý tính liên tục giữa phân cảnh hiện tại và phân cảnh lân cận

Trong đó, ngữ cảnh nhân vật ngoài mô tả bản thân nhân vật còn cố gắng đưa thêm:

Hình tượng diễn viên gắn với nhân vật
- Trang phục mặc định của nhân vật

Dùng để tăng tính nhất quán giữa các phân cảnh.

## Quy tắc kế thừa phong cách cấp dự án

Khi tạo prompt nền tảng, phong cách cấp dự án không phải “gợi ý yếu” mà là ràng buộc tường minh:

- Bắt buộc kế thừa `visual_style` cấp dự án
- Phải kế thừa `style` cấp dự án
- Nếu `unify_style = true`
  - Khi thông tin phân cảnh thiếu, nên ưu tiên hội tụ về phong cách có sẵn của dự án
  - Không nên tự do phát tán sang phong cách thị giác khác

Điều này có nghĩa là:

```text
Phong cách dự án
→ Prompt cơ sở
→ Prompt kết xuất cuối cùng
→ Tạo hình ảnh
```

Là một đường dẫn liên tục.

## Vai trò của thực thể đã xác nhận

Tạo prompt nền không chỉ dựa vào mô tả ngôn ngữ tự nhiên trong trích đoạn kịch bản.

Hiện còn đọc rõ những gì phân cảnh đã xác nhận:

- Nhân vật
- Bối cảnh
- Đạo cụ
- Trang phục

Những tên thực thể này phải được giữ nguyên trong kết quả tạo, không được viết lại, dịch hoặc thay bằng từ đồng nghĩa.

nếu thông tin shot không đầy đủ, mô hình nên ưu tiên dùng các thực thể đã xác nhận này để bổ sung khung, không nên tự thêm chủ thể chính.

## Khẩu độ đầu ra

Mục tiêu của prompt nền tảng hiện tại là giữ cấu trúc mô tả thống nhất, ưu tiên tổ chức theo thứ tự sau:

1. Cận / Góc máy / Chuyển động máy
2. Môi trường bối cảnh
3. Nhân vật chính hoặc đối tượng then chốt
4. Hành động và trạng thái
5. Không khí và cảm xúc
6. Khép lại phong cách cần thiết

Tiêu chí này dùng để giảm trôi dạt prompt giữa các phân cảnh khác nhau trong cùng dự án.

Hệ thống hiện tại còn thêm vào prompt nền một lớp “ràng buộc liên tục”:

- Nếu có phân cảnh trước đó, hình ảnh hiện tại nên ưu tiên tiếp nối hành động, ánh mắt, cảm xúc hoặc hướng không gian của phân cảnh trước
- Nếu có phân cảnh tiếp theo, khung hình hiện tại nên tạo thành trạng thái khép lại có thể chuyển tự nhiên sang phân cảnh tiếp theo
- Cố gắng làm rõ vị trí, hướng và đỉnh hành động của chủ thể, giảm cảm giác đột ngột khi chuyển phân cảnh

Hệ thống hiện còn bổ sung "gợi ý bố cục và mỏ neo không gian":

- Căn cứ cận và chuyển động máy hiện tại để xác định nên làm nổi chủ thể hay bối cảnh trước
- Các phân cảnh liên tiếp cùng bối cảnh ưu tiên giữ ổn định trục không gian và hướng nhân vật
- Nếu có bối cảnh chính và nhân vật chính, sẽ tường minh nhắc mô hình khóa mỏ neo bối cảnh và logic hướng nhìn chủ thể

Hệ thống hiện còn bổ sung "gợi ý hướng nhìn và ánh mắt":

- Trong cảnh trò chuyện hoặc đối diện, ưu tiên giữ quan hệ đường nhìn giữa người nói và người nghe liên tục
- Phân cảnh lân cận cùng bối cảnh ưu tiên giữ ổn định hướng trái/phải của nhân vật, giảm nhảy trục cảnh phản
- Phân cảnh over-the-shoulder ưu tiên giữ ổn định vị trí vai ở tiền cảnh và hướng của đối tượng được nhìn

Đồng thời, hệ thống sẽ cung cấp thêm cho mô hình một "gợi ý độ ưu tiên chủ thể", giúp mô hình tránh dàn đều mọi thông tin:

- Ưu tiên viết nhân vật chính
- Ưu tiên xây dựng bối cảnh chính
- Đạo cụ chỉ được ghi trọng điểm khi vào hành động chính hoặc điểm trọng tâm bố cục
- Trang phục chủ yếu dùng để đảm bảo nhất quán ngoại hình nhân vật, không yêu cầu lần nào cũng là trung tâm khung hình

Hệ thống hiện còn bổ sung gợi ý chuyên biệt theo loại khung hình:

- Khung hình đầu: ưu tiên thiết lập không gian, vị trí đứng ban đầu của chủ thể và ấn tượng thị giác khoảnh khắc đầu; nếu kịch bản có chuỗi phản ứng liên tục, ưu tiên dùng cách diễn đạt chưa hoàn tất "vừa bắt đầu / chưa hoàn tất / bị ngắt ngang", không viết trực tiếp thành hành động hoàn tất phía sau hoặc tư thế cuối cùng
- Khung hình chính: ưu tiên khóa khoảnh khắc đỉnh hành động, điểm bùng nổ cảm xúc hoặc mật độ thông tin cao nhất
- Khung hình cuối: ưu tiên nhấn mạnh khép lại hành động, dư âm cảm xúc và điểm dừng để phân cảnh tiếp theo có thể tiếp nối

nếu shot đã xác nhận `action_beats` ở giai đoạn chuẩn bị, chuỗi hiện tại sẽ ưu tiên tiêu thụ bộ mốc hành động này:

- Khung hình đầu ưu tiên bố trí hình ảnh quanh mốc `trigger` (kích hoạt / phản ứng khởi đầu)
- Khung hình chính ưu tiên bố trí hình ảnh quanh mốc `peak` (đỉnh hành động / giai đoạn căng thẳng kịch tính cao nhất)
- Khung hình cuối ưu tiên bố trí hình ảnh quanh mốc `aftermath` (trạng thái kết quả / giai đoạn khép lại)

hiện lớp này vẫn là heuristic nhẹ, không yêu cầu `action_beats` phải lưu thành đối tượng có cấu trúc trước:

- Tiếp tục dùng `list[str]`
- phía sau sẽ suy luận `trigger / peak / aftermath` dựa trên từ khóa và vị trí tương đối
- Vì vậy khung hình đầu, khung hình chính, khung hình cuối nay sẽ dùng ổn định hơn cùng một nhóm mốc hành động, nhưng mỗi loại lấy một giai đoạn khác
- bộ thông tin giai đoạn này hiện cũng đi vào `debug_context` của tác vụ prompt nền khung hình chính
  - Preview khung hình chính ở frontend sẽ hiển thị trực tiếp “giai đoạn mốc hành động” và “khung hình hiện tại được tiêu thụ ưu tiên”
  - Do đó nhãn giai đoạn mà trang chỉnh sửa nhìn thấy và thông tin giai đoạn mà chuỗi khung hình chính thực sự dùng giờ đã khớp nhau

Chỉ khi phân cảnh chưa xác nhận `action_beats`, hệ thống mới tiếp tục chủ yếu dựa vào lát cắt ngôn ngữ tự nhiên của `script_excerpt + shot_description`.

Trong đó khung hình đầu hiện còn một lớp suy đoán nhẹ:

- Nếu trong `script_excerpt + shot_description` xuất hiện đồng thời từ khóa chuỗi phản ứng liên tiếp rõ ràng
  - Ví dụ: `đột ngột / bản năng / rớt khỏi tay / khụy xuống / quay người / quay đầu lại`
- Hệ thống sẽ bổ sung thêm ràng buộc lát cắt thời gian cứng hơn
- Mục tiêu là để khung hình đầu rơi ổn định hơn vào "thời điểm nhìn thấy sớm nhất sau kích hoạt", thay vì rơi thẳng vào trạng thái phản ứng hoàn thành

Hệ thống hiện tại còn thu gọn guidance nói trên thành `director_command_summary`:

- Không phải nối ghép đơn thuần, mà sẽ sắp xếp lại theo loại khung hình
- Nếu phân cảnh có quan hệ liên tiếp cùng bối cảnh, lời thoại hoặc rủi ro đối diện rõ ràng
  - `screen_direction_guidance` sẽ được tự động nâng lên
  - Sớm hơn đi vào ràng buộc cấp `bắt buộc`
- Do đó tóm tắt “bắt buộc / ưu tiên” mà khung hình đầu, khung hình chính, khung hình cuối nhìn thấy không hoàn toàn giống nhau
- Mục tiêu là để mô hình trước tiên giữ vững các việc dễ gây cảm giác đứt gãy nhất, ví dụ:
  - Trục kịch trái/phải của các phân cảnh cùng bối cảnh
  - Tính liên tục của ánh mắt trong mối quan hệ thoại
  - Trọng tâm bố cục của phân cảnh đang tiến hành

## Quan sát được kết quả tác vụ

Tác vụ prompt cơ bản sau khi thành công, ngoài trả về `prompt` cuối cùng, còn đính kèm trong kết quả tác vụ:

- `debug_context`
- `quality_checks`

Trong đó có những thứ lần tạo này thực sự dùng đến:

- Trường phong cách dự án
- Trường ngôn ngữ điện ảnh
- Ngữ cảnh thực thể đã xác nhận

Dùng để gỡ lỗi loại vấn đề "tại sao tạo ra thành thế này".

Chuỗi thực hiện tác vụ hiện còn có thêm một lớp cổng chất lượng nhẹ:

- Nếu kết quả lẫn `hình 1 / hình 2` hoặc `## Diễn giải nội dung hình ảnh`
- Nếu kết quả thiếu tên nhân vật chính

Hệ thống trước hết tự động thử lại một lần kèm yêu cầu sửa, rồi mới quyết định kết quả ghi vào DB cuối cùng.
