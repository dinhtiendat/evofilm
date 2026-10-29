/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu gộp thực thể.。
 */
export type EntityMergerRequest = {
    /**
     * ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    project_id?: (string | null);
    /**
     * ID chương (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    chapter_id?: (string | null);
    /**
     * Kết quả trích xuất của tất cả phân cảnh (dạng serialize của ShotElementExtractionResult)
     */
    all_shot_extractions: Array<Record<string, any>>;
    /**
     * Kho thực thể lịch sử (tùy chọn, dùng cho hợp nhất tăng phân)
     */
    historical_library?: (Record<string, any> | null);
    /**
     * Kết quả phân cảnh của kịch bản (tùy chọn; serialize của ScriptDivisionResult), dùng để định vị và thống kê
     */
    script_division?: (Record<string, any> | null);
    /**
     * Kết quả gộp trước (tùy chọn; EntityMergeResult đã serialize), dùng để thử lại gộp khi xung đột
     */
    previous_merge?: (Record<string, any> | null);
    /**
     * Danh sách gợi ý giải quyết xung đột (tùy chọn; dùng cho gộp lại khi thử lại xung đột)
     */
    conflict_resolutions?: null;
};

