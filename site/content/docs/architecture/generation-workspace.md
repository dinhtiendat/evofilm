# Kiến trúc chuẩn bị tạo

## Định vị

Jellyfish hiện đã dần thu hẹp nhiều chuỗi sinh về mô hình "chuẩn bị sinh" thống nhất, để giải quyết các vấn đề sau:

- Dùng lẫn giá trị thực cơ bản và nội dung cuối cùng
- Ngữ cảnh dùng cho xem trước và gửi không nhất quán
- trạng thái nội bộ trang phân tán, ngữ nghĩa `stale / loading / submit` hỗn loạn

Các chuỗi đã kết nối vào kiến trúc này gồm:

1. Tạo ảnh khung phân cảnh
2. Xem trước và gửi prompt video
3. Tạo hình ảnh tài nguyên (nhân vật / diễn viên / bối cảnh / đạo cụ / trang phục)

## Mô hình thống nhất

Hiện tại thống nhất dùng cấu trúc 4 lớp:

1. `Base Draft`
   - Giá trị thực nghiệp vụ có thể lưu và sửa
2. `Context`
   - Ngữ cảnh động mà lần tạo này phụ thuộc
3. `Derived Preview`
   - Dựa trên `Base Draft + Context` kết quả xem trước suy ra
4. `Submission Payload`
   - Tải vận hành cuối cùng gửi cho mô hình

## Cấu trúc phía sau hiện tại

Thư mục service thống nhất hiện tại nằm ở:

```text
backend/app/services/studio/generation/
├── shared/
├── frame/
├── video/
└── asset_image/
```

### `shared`

Chịu trách nhiệm đặt các kiểu dùng chung cho chuẩn bị tạo:

- `GenerationBaseDraft`
- `GenerationContext`
- `GenerationDerivedPreview`
- `GenerationSubmissionPayload`

### `frame`

Chuỗi ảnh khung hình chính hiện đã tách trách nhiệm như sau:

- `build_base`
- `build_context`
- `derive_preview`
- `build_submission`

API hiện vẫn giữ nguyên đường dẫn như cũ, nhưng bên trong đã bắt đầu gọi tầng dịch vụ này.

### `video`

Chuỗi video hiện đã bắt đầu dùng cùng cấu trúc bốn đoạn:

- `build_base`
- `build_context`
- `derive_preview`
- `build_submission`

Hiện `preview-prompt` và `create video task` đã dùng chung một ngữ cảnh `reference_mode + images` duy nhất.
Trong đó `film/tasks/video/preview-prompt` mà studio đang dùng hiện cũng sẽ trả về `pack` đầy đủ:

- `previous_shot_summary`
- `next_shot_goal`
- `continuity_guidance`
- `composition_anchor`
- `screen_direction_guidance`
- `action_beats`
- `action_beat_phases`

Do đó xem trước prompt video trong studio và pack nền tảng phía studio hiện giữ cùng nguồn, không còn phân kỳ API “prompt có giá trị nhưng ngữ cảnh liên tục luôn để trống”.

Tham số video hiện tại đã được thu gọn về `ratio` làm tham số nghiệp vụ chính duy nhất:

- Mặc định cấp dự án: `Project.default_video_ratio`
- ghi đè cấp phân cảnh:`ShotDetail.override_video_ratio`
- Frontend truyền explicit `ratio` đang hiệu lực cho lần này khi gửi tác vụ video
- Backend trực tiếp dùng `ratio` trong yêu cầu để tạo tác vụ
- Nếu một nhà cung cấp không hỗ trợ trực tiếp `ratio`, adapter của provider sẽ dẫn sinh `size` phụ trợ bên trong tầng thực thi
- enum tỷ lệ phía trước lấy từ capability trả về động của mô hình video mặc định hiện tại, không còn dùng hằng tĩnh
- Ảnh khung hình chính nếu dùng làm tham chiếu video, khi gửi sẽ kèm rõ `target_ratio + resolution_profile`
- Phía sau phân tích `size` tương ứng dựa trên năng lực của mô hình ảnh mặc định hiện tại, đảm bảo khung hình chính và tỷ lệ khung hình của video mục tiêu giữ nhất quán
- Studio hiển thị xem trước thông số khung hình chính hiện tại: `ratio + resolution_profile -> size`
- Xem trước prompt video hiện đang phơi thêm `action_beats / previous_shot_summary / next_shot_goal / continuity_guidance`
- Xem trước prompt video hiện tại sẽ lộ thêm `composition_anchor`
- preview prompt video hiện còn bộc lộ thêm `screen_direction_guidance`
- `action_beats` được chiết xuất theo quy tắc từ trích đoạn kịch bản của phân cảnh hiện tại, mô tả phân cảnh và thoại, dùng để giảm vấn đề "giống giải thích khung hình tĩnh"
- Trường continuity sinh từ tóm tắt phân cảnh liền kề, dùng để giảm cảm giác đột ngột khi chuyển phân cảnh
- `composition_anchor` được sinh có quy tắc từ cận, chuyển động máy, bối cảnh chính, nhân vật chính và quan hệ với phân cảnh lân cận, dùng để giảm sự đột biến của bố cục và trục kịch
- `screen_direction_guidance` được tạo bằng quy tắc từ góc máy, quan hệ thoại và tính liên tục bối cảnh giữa các phân cảnh lân cận, nhằm giảm hiện tượng nhân vật lật mặt và nhảy trục ở cảnh quay phản
- Nếu mẫu video không tiêu thụ các guidance này một cách rõ ràng, hệ thống sẽ tự động bổ sung một đoạn "ràng buộc thực thi phân cảnh" ổn định sau kết quả kết xuất mẫu, tránh trường hợp trường mới chỉ tồn tại trong preview pack
- Ngay cả khi video đi nhánh prompt thủ công, hiện hệ thống vẫn chèn thêm cùng tầng guidance để củng cố, tránh văn bản thủ công hoàn toàn bỏ qua ràng buộc liên tục và bố cục phân cảnh
- Khung phân cảnh `frame-render-prompt` hiện cũng ghép nhẹ `director_command_summary` và `continuity_guidance` cần thiết vào prompt ảnh cuối cùng
- Khung hình phân cảnh `frame-render-prompt` hiện cũng tự động đưa các `frame_specific_guidance` cần thiết dưới dạng ứng viên "nhiệm vụ khung hình hiện tại" vào prompt ảnh cuối cùng
- Khung phân cảnh `frame-render-prompt` hiện cũng bổ sung nhẹ `composition_anchor` vào prompt ảnh cuối cùng
- Khung phân cảnh `frame-render-prompt` hiện cũng đưa nhẹ `screen_direction_guidance` vào prompt ảnh cuối cùng
  - Vì vậy, ràng buộc đạo diễn ưu tiên cao nhìn thấy trong xem trước prompt khung hình chính không còn dừng lại ở hiển thị gỡ lỗi
  - render prompt cuối cùng gửi cho mô hình ảnh sẽ mang rõ ràng ràng buộc sau hội tụ này, trách nhiệm khung hình hiện tại, trọng tâm bố cục và yêu cầu hướng nhìn/ánh mắt
- Với khung hình đầu, hệ thống hiện ưu tiên nhấn mạnh diễn đạt "khoảnh khắc kích hoạt / phản ứng ban đầu / trạng thái chưa hoàn thành", tránh prompt rơi thẳng vào hành động hoàn thành sau đó hoặc tư thế cuối cùng
- Để tránh prompt phình, tầng này hiện giới hạn giữ tối đa 3 guidance
- Thứ tự ưu tiên mặc định hiện tại: `director_command_summary` > `continuity_guidance` > `screen_direction_guidance` > `composition_anchor`
- Mức ưu tiên này còn được tinh chỉnh động theo `frame_type`:
  - `first` thiên về giữ `composition_anchor` hơn
  - `key` / `last` nghiêng về giữ lại `screen_direction_guidance` hơn
  - Mục tiêu là phân cảnh thiết lập không gian ổn trước, phân cảnh đối đầu / cảnh phản / khép lại ổn ánh nhìn và trục trái-phải trước
- Xem trước prompt khung hình chính ở phía trước hiện hiển thị trực tiếp:
  - "cơ sở sinh prompt nền", dùng để giải thích guidance chủ yếu phục vụ trước tiên cho việc sinh prompt nền phía trên
  - "Kết quả hội tụ của prompt ảnh cuối cùng", dùng để giải thích chỉ một phần nhỏ guidance được điền lại vào prompt ảnh cuối cùng
  - render prompt cuối cùng thực sự đã giữ lại những guidance nào
  - guidance nào bị lược bỏ do chiến lược nén
  - Giải thích lý do từng guidance được giữ lại hay nén
  - đồng thời cung cấp `reason_tag` ngắn hơn, ví dụ `khung đầu giữ không gian`, `khung chính giữ trục`
  - như vậy có thể giải thích trực tiếp "vì sao preview có 4 quy tắc nhưng prompt cuối chỉ dùng 3"
- sau khi submit tác vụ ảnh, `render_context` hiện cũng giữ lại chi tiết quyết định guidance bộ này
  - Do đó, chuỗi tác vụ và chuỗi xem trước hiện chia sẻ chung cùng một ngữ cảnh "giữ lại / nén / lý do"
- Trích xuất thông tin cấp dự án hiện còn xuất gợi ý mặc định ngôn ngữ điện ảnh
  - `semantic_suggestion.camera_shot`
  - `semantic_suggestion.angle`
  - `semantic_suggestion.movement`
  - `semantic_suggestion.duration`
  - `semantic_suggestion.action_beats`
- `extract / extract-async` ngoài đồng bộ tài nguyên ứng viên và thoại ứng viên, còn ghi ngược các đề xuất mặc định nêu trên vào `ShotDetail` theo số thứ tự phân cảnh
  - Do đó `camera_shot / angle / movement / duration` không còn chỉ dựa vào giá trị ban đầu hardcode khi ghi phân cảnh vào CSDL
  - `action_beats` cũng được ghi ngược làm nguồn đúng của mốc hành động vào `ShotDetail`
  - Việc chỉnh tinh ngôn ngữ điện ảnh trong studio cũng sửa đúng nguồn chân lý `ShotDetail` này
- Trạng thái tổng hợp của trang chuẩn bị phân cảnh hiện cũng trả về rõ ràng:
  - `basic_info_ready`
  - `semantic_defaults_ready`
  - `action_beats_ready`
  - `action_beats_count`
  - `action_beat_phases`
  - `ready_for_generation`
  - Trong đó `ready_for_generation` biểu thị “góc nhìn trang chuẩn bị có thể vào khâu tạo”, không đồng nhất với đơn thuần `shot.status = ready`
- Chuỗi video hiện tại ưu tiên dùng `ShotDetail.action_beats`
  - Chỉ khi phân cảnh chưa xác nhận mốc hành động thì mới lùi về cách cô đọng theo quy tắc từ `script_excerpt + description + dialogue`
- Chuỗi khung hình chính hiện cũng ưu tiên dùng `ShotDetail.action_beats`
  - phía sau sẽ suy luận lớp nhẹ `trigger / peak / aftermath` cho mốc hành động trước
  - Khung hình đầu ưu tiên dùng mốc hành động giai đoạn kích hoạt
  - Khung hình chính ưu tiên dùng mốc hành động giai đoạn đỉnh
  - Khung hình cuối ưu tiên dùng mốc hành động giai đoạn khép lại
- Preview prompt video hiện cũng trực tiếp phơi bày kết quả suy luận giai đoạn ở tầng này
  - Do đó chuỗi video và chuỗi khung hình chính giờ dùng chung một bộ nhãn `trigger / peak / aftermath` để thể hiện quá trình hành động bên trong phân cảnh

### `asset_image`

Tạo ảnh tài nguyên hiện đã bắt đầu dịch chuyển sang:

- `build_base`
- `build_context`
- `derive_preview`
- `build_submission`

Hiện render / submit ảnh của actor / character / scene / prop / costume đã bắt đầu đi theo cấu trúc này.

## Quy ước component kết xuất đáy

Tầng tương thích ảnh cũ hiện đã bị loại bỏ; chuỗi điều phối chuẩn bị tạo mới thống nhất dùng thư mục sau làm cửa ngõ chính:

- `generation/frame`
- `generation/video`
- `generation/asset_image`

Trong đó chỉ giữ lại `shot_video_prompt_pack` làm thành phần cơ sở cho video pack và kết xuất mẫu:

- Nó chịu trách nhiệm xây dựng `ShotVideoPromptPackRead`
- Nó chịu trách nhiệm các hàm nền tảng cần cho dựng mẫu
- Nó không còn đảm nhiệm vai trò lối vào điều phối chính của xem trước / gửi video

## Cấu trúc phía trước hiện tại

### `useGenerationDraft`

Phía trước hiện đã cung cấp hook thống nhất:

```text
front/src/pages/aiStudio/hooks/useGenerationDraft.ts
```

Hook này thống nhất quản lý:

- `base`
- `context`
- `derived`
- `state`
- `deriveNow`
- `submitNow`
- `hydrate`
- `resetDerived`

### Trang đã kết nối hiện tại

#### Studio phân cảnh

`ChapterStudio` hiện đã bắt đầu:

- Xem trước prompt khung hình chính
- Xem trước prompt video

Nối vào `useGenerationDraft`, dần thống nhất thành:

- Người dùng chỉnh sửa `base`
- Trang duy trì `context`
- Hệ thống hiển thị `derived`
- trước khi submit, `submitNow()` tự động đảm bảo `derived` là kết quả mới nhất

Hiện cả tạo ảnh khung hình chính và tạo video đều đã được đưa vào nghĩa của thao tác này:

- Nếu prompt nền tảng hoặc ngữ cảnh đã thay đổi, sẽ chạy lại `derive` trước
- Sau đó dùng kết quả `derived` mới nhất để gửi tác vụ
- Trang không còn duy trì riêng một bộ logic ngoài luồng “render thủ công trước khi gửi”

#### Trang chỉnh sửa tài nguyên

`AssetEditPageBase` hiện đã bắt đầu đưa xem trước và gửi prompt ảnh tài nguyên vào `useGenerationDraft`.

Vì vậy, các cổng vào chỉnh sửa tài nguyên như nhân vật, diễn viên, bối cảnh, đạo cụ, trang phục đã dùng chung một mô hình tâm chuẩn bị tạo.

Trong đó, trang chi tiết nhân vật cũng đã được gộp về cùng mô hình lối vào chỉnh sửa tài nguyên như diễn viên / bối cảnh / đạo cụ / trang phục, không còn duy trì riêng một bộ logic lối vào tạo ảnh nhân vật.

Việc gửi tạo ảnh tài nguyên hiện cũng đã thống nhất thành:

- Trang duy trì `base + context`
- `submitNow()` tự động đảm bảo `derived` mới nhất trước khi submit
- tạo tác vụ dùng `derived.prompt + derived.images` mới nhất
- Thông tin gỡ lỗi mặc định thu gọn, chỉ hiển thị ngữ cảnh và chi tiết kiểm tra chất lượng khi người dùng chủ động mở

## Ranh giới hiện tại

### Trung tâm tác vụ

Trung tâm tác vụ giữ nguyên tắc “dùng chung, nhẹ”:

- Hiển thị trạng thái tác vụ, tiến độ, thành công/thất bại, lối vào hủy và quay lại
- Không chứa bản tóm tắt ngữ cảnh cấp nghiệp vụ
- Không chứa chi tiết gỡ lỗi prompt

### Module không thuộc kiến trúc này

Các module dưới đây hiện không thuộc "kiến trúc chuẩn bị tạo":

1. Tác vụ xử lý kịch bản
2. Luồng xác nhận trích xuất thông tin của trang chỉnh sửa phân cảnh
3. Trung tâm tác vụ

Các module này có trách nhiệm độc lập, không tham gia việc hội tụ `Base Draft / Context / Derived Preview / Submission Payload` hiện tại.
