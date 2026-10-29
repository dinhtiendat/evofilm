/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Cập nhật cục bộ mẫu prompt. Không gồm id / is_system.
 */
export type PromptTemplateUpdate = {
    /**
     * Tên mẫu
     */
    name?: (string | null);
    /**
     * Nội dung mẫu
     */
    content?: (string | null);
    /**
     * Mô tả xem trước
     */
    preview?: (string | null);
    /**
     * Danh sách tên biến (thay thế toàn bộ)
     */
    variables?: (Array<string> | null);
    /**
     * liệu là prompt mặc định hay không
     */
    is_default?: (boolean | null);
};

