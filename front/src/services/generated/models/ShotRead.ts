/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotExtractionSummaryRead } from './ShotExtractionSummaryRead';
import type { ShotStatus } from './ShotStatus';
export type ShotRead = {
    /**
     * ID shot
     */
    id: string;
    /**
     * ID chương sở thuộc
     */
    chapter_id: string;
    /**
     * Thứ tự của phân cảnh (duy nhất trong chương)
     */
    index: number;
    /**
     * Tiêu đề phân cảnh
     */
    title: string;
    /**
     * Ảnh thu nhỏ URL/Đường
     */
    thumbnail?: string;
    /**
     * trạng thái phân cảnh
     */
    status?: ShotStatus;
    /**
     * liệu bỏ qua trích xuất thông tin hay không
     */
    skip_extraction?: boolean;
    /**
     * Trích đoạn kịch bản
     */
    script_excerpt?: string;
    /**
     * ID tệp liên kết video đã sinh(files.id, type=video)
     */
    generated_video_file_id?: (string | null);
    /**
     * Thời điểm gần nhất hoàn tất trích xuất thông tin
     */
    last_extracted_at?: (string | null);
    /**
     * Tóm tắt trạng thái trích xuất phân cảnh
     */
    extraction: ShotExtractionSummaryRead;
};

