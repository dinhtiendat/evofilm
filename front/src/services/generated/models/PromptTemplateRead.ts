/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCategory } from './PromptCategory';
/**
 * Đọc mẫu prompt (đủ mọi trường).
 */
export type PromptTemplateRead = {
    /**
     * ID mẫu
     */
    id: string;
    /**
     * Danh mục mẫu
     */
    category: PromptCategory;
    /**
     * Tên mẫu
     */
    name: string;
    /**
     * câu chữ preview
     */
    preview: string;
    /**
     * Nội dung mẫu
     */
    content: string;
    /**
     * Danh sách tên biến
     */
    variables: Array<string>;
    /**
     * Có phải là prompt mặc định
     */
    is_default: boolean;
    /**
     * Có phải do hệ thống cài đặt sẵn không
     */
    is_system: boolean;
    /**
     * Thời gian tạo
     */
    created_at: string;
    /**
     * Thời gian cập nhật cuối
     */
    updated_at: string;
};

