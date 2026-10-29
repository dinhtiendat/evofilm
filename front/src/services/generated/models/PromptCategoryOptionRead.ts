/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCategory } from './PromptCategory';
/**
 * Tùy chọn hạng mục prompt (giá trị enum + nhãn tiếng Trung + mô tả ngắn).
 */
export type PromptCategoryOptionRead = {
    /**
     * Giá trị mã hạng mục
     */
    value: PromptCategory;
    /**
     * tên tiếng Việt
     */
    label: string;
    /**
     * giới thiệu hạng mục
     */
    description?: string;
};

