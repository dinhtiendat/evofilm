/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Studio Bản nháp nhân vật Studio.。
 *
 * Import API không truyền id thì phía server sinh ra; khi ghi ngược chi tiết phân cảnh có thể kèm character_id.
 */
export type StudioCharacterDraft = {
    /**
     * ID nhân vật (nếu đã lưu CSDL thì ghi ngược character_id)
     */
    id?: (string | null);
    /**
     * tệp liên kết ID(để trống được)
     */
    file_id?: (string | null);
    /**
     * Đường dẫn tải ảnh thu nhỏ (để trống được)
     */
    thumbnail?: (string | null);
    /**
     * index: Optional[int] = Field(None, description=Thứ tự nhân vật trong phân cảnh (shot_character_links.index))（shot_character_links.index）
     */
    index?: (number | null);
    /**
     * Tên nhân vật (khuyến nghị duy nhất trong cùng dự án)
     */
    name: string;
    /**
     * description: str = Field(, description=Mô tả nhân vật)
     */
    description?: string;
    /**
     * Nhãn (tùy chọn)
     */
    tags?: Array<string>;
    /**
     * Tên trang phục (tùy chọn, ánh xạ sang costume_id khi nhập)
     */
    costume_name?: (string | null);
    /**
     * Danh sách tên đạo cụ thường dùng của nhân vật (tùy chọn)
     */
    prop_names?: Array<string>;
};

