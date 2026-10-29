/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * thân yêu cầu tác vụ ảnh dùng riêng cho Studio:ID mô hình tùy chọn, không truyền thì dùng mô hình ảnh mặc định；provider được tra ngược từ mô hình.
 *
 * image_id là ID mô hình ảnh cụ thể, ví dụ:
 * - - Ảnh diễn viên: ActorImage.id：ActorImage.id
 * - - Ảnh bối cảnh: SceneImage.id：SceneImage.id
 * - - Ảnh đạo cụ: PropImage.id：PropImage.id
 * - - Ảnh trang phục: CostumeImage.id：CostumeImage.id
 * - - Ảnh nhân vật: CharacterImage.id：CharacterImage.id
 * - - Ảnh khung phân cảnh: ShotFrameImage.id：ShotFrameImage.id
 */
export type StudioImageTaskRequest = {
    /**
     * Mô hình tùy chọn ID(models.id); nếu không truyền sẽ dùng ModelSettings.default_image_model_id;Provider tra ngược từ liên kết của mô hình
     */
    model_id?: (string | null);
    /**
     * ID mô hình ảnh, như ActorImage.id / SceneImage.id / PropImage.id...; phải khớp với ID chủ thể của đường dẫn
     */
    image_id?: (number | null);
    /**
     * Prompt (do phía trước truyền). Giao diện tạo tác vụ bắt buộc phải truyền; giao diện render-prompt có thể không truyền
     */
    prompt?: (string | null);
    /**
     * Danh sách file_id của ảnh tham chiếu (nhiều ảnh, thứ tự có hiệu lực). API tạo tác vụ sẽ dựa vào file_id để phân tích thành ảnh tham chiếu từ dữ liệu
     */
    images?: Array<string>;
};

