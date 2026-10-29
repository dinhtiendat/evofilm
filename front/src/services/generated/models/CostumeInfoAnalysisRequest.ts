/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân tích thiếu thông tin trang phục.。
 */
export type CostumeInfoAnalysisRequest = {
    /**
     * ID thực thể liên kết của tác vụ (tùy chọn khi khôi phục tác vụ ở trang tài nguyên)
     */
    relation_entity_id?: (string | null);
    /**
     * ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    project_id?: (string | null);
    /**
     * ID chương (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    chapter_id?: (string | null);
    /**
     * bối cảnh trang phục nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)
     */
    costume_context?: (string | null);
    /**
     * costume_description: str = Field(..., description=Mô tả trang phục trong nguyên văn, min_length=1)
     */
    costume_description: string;
};

