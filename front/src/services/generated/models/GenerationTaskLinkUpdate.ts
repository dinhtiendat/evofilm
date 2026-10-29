/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * thân yêu cầu cập nhật liên kết tác vụ sinh (không chứa is_adopted, trạng thái áp dụng thay đổi một chiều bằng API riêng).
 */
export type GenerationTaskLinkUpdate = {
    /**
     * Loại tài nguyên tạo dựng (ví dụ image/video/text/task_link)
     */
    resource_type?: (string | null);
    /**
     * Loại nghiệp vụ (như prop/costume/scene...)
     */
    relation_type?: (string | null);
    /**
     * relation_entity_id: str | None = Field(None, description=ID thực thể nghiệp vụ liên kết) ID
     */
    relation_entity_id?: (string | null);
    /**
     * ID tệp sản phẩm liên kết (files.id; áp dụng cho ảnh/âm thanh/video)
     */
    file_id?: (string | null);
    /**
     * Trạng thái liên kết: accepted=đã áp dụng, todo=chưa thao tác, rejected=không áp dụng
     */
    status?: (string | null);
};

