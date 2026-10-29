/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Tham chiếu tài nguyên của phân cảnh dùng cho render prompt.
 */
export type ShotPromptAssetRef = {
    /**
     * Loại tài nguyên
     */
    type: 'character' | 'prop' | 'scene' | 'costume';
    /**
     * Tên tài nguyên
     */
    name: string;
    /**
     * Mô tả tài nguyên hoặc mô tả ứng viên trích xuất
     */
    description?: string;
    /**
     * ID tệp có thể dùng làm ảnh tham chiếu
     */
    file_id?: (string | null);
    /**
     * Ảnh thu nhỏ
     */
    thumbnail?: (string | null);
};

