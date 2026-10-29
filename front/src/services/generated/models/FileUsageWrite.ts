/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * thông tin liên kết ghi vào file_usages (submit cùng với FileItem).
 */
export type FileUsageWrite = {
    /**
     * ID dự án
     */
    project_id: string;
    /**
     * ID chương
     */
    chapter_id?: (string | null);
    /**
     * ID phân cảnh
     */
    shot_id?: (string | null);
    /**
     * Mục đích: shot_frame / generated_video / character_image / asset_image / upload / api v.v.
     */
    usage_kind: string;
    /**
     * Chìa idempotent (tùy chọn)
     */
    source_ref?: (string | null);
};

