/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân tích biến thể.。
 */
export type VariantAnalysisRequest = {
    /**
     * ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    project_id?: (string | null);
    /**
     * ID chương (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    chapter_id?: (string | null);
    /**
     * Thư viện thực thể đã gộp (dạng chuỗi hoá của EntityLibrary; lấy từ merged_library trong đầu ra của EntityMerger)
     */
    merged_library: Record<string, any>;
    /**
     * description=Kết quả trích xuất của mọi phân cảnh
     */
    all_shot_extractions: Array<Record<string, any>>;
    /**
     * kết quả phân cảnh kịch bản (tùy chọn; chuỗi hóa ScriptDivisionResult), dùng để nhóm chương/đoạn
     */
    script_division?: (Record<string, any> | null);
};

