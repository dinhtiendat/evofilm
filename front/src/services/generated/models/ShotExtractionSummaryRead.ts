/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ShotExtractionSummaryRead = {
    /**
     * Tóm tắt trạng thái xác nhận trích xuất của phân cảnh
     */
    state: 'not_extracted' | 'extracted_empty' | 'extracted_pending' | 'extracted_resolved' | 'skipped';
    /**
     * Đã thực thi trích xuất chưa
     */
    has_extracted: boolean;
    /**
     * Thời điểm hoàn tất trích xuất gần nhất
     */
    last_extracted_at?: (string | null);
    /**
     * Tổng số ứng viên tài nguyên
     */
    asset_candidate_total?: number;
    /**
     * tổng số ứng viên thoại
     */
    dialogue_candidate_total?: number;
    /**
     * Số ứng viên tài nguyên chờ xác nhận
     */
    pending_asset_count?: number;
    /**
     * số ứng viên thoại chờ xác nhận
     */
    pending_dialogue_count?: number;
};

