/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Studio Bản nháp tài nguyên của Studio (Scene/Prop/Costume).（Scene/Prop/Costume）。
 *
 * Khi API import không truyền id, phía server sẽ tạo; khi điền ngược chi tiết phân cảnh có thể kèm scene_id/prop_id/costume_id.
 */
export type StudioAssetDraft = {
    /**
     * ID tài nguyên (truyền ngược sau khi đã lưu CSDL, ví dụ scene_id / prop_id / costume_id)
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
     * Tên (khuyến nghị duy nhất trong cùng dự án)
     */
    name: string;
    /**
     * description: str = Field(, description=Mô tả)
     */
    description?: string;
    /**
     * tags: List[str] = Field(default_factory=list, description=nhãn)
     */
    tags?: Array<string>;
    /**
     * ID mẫu prompt (để trống được)
     */
    prompt_template_id?: (string | null);
    /**
     * view_count: int = Field(1, ge=1, description=Số ảnh góc nhìn dự kiến tạo)
     */
    view_count?: number;
};

