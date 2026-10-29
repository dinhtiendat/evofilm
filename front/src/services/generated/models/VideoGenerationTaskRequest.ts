/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu tác vụ tạo video.
 */
export type VideoGenerationTaskRequest = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * Chế độ tham chiếu: first | last | key | first_last | first_last_key | text_only
     */
    reference_mode: 'first' | 'last' | 'key' | 'first_last' | 'first_last_key' | 'text_only';
    /**
     * Prompt video (bắt buộc khi text_only)
     */
    prompt?: (string | null);
    /**
     * Danh sách file_id của ảnh tham chiếu, số lượng phải khớp nghiêm ngặt với reference_mode
     */
    images?: Array<string>;
    /**
     * tỷ lệ khung hình video, như 16:9 / 9:16
     */
    ratio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
};

