/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCategory } from './PromptCategory';
/**
 * tạo mẫu prompt. id do phía sau tự động sinh；is_system không do client đặt.
 */
export type PromptTemplateCreate = {
    /**
     * Danh mục mẫu
     */
    category: PromptCategory;
    /**
     * Tên mẫu
     */
    name: string;
    /**
     * Nội dung mẫu
     */
    content: string;
    /**
     * câu chữ preview
     */
    preview?: string;
    /**
     * Danh sách tên biến
     */
    variables?: Array<string>;
    /**
     * Có phải là prompt mặc định
     */
    is_default?: boolean;
};

