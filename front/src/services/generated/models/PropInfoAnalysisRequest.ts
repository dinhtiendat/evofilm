/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân tích thiếu thông tin đạo cụ.。
 */
export type PropInfoAnalysisRequest = {
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
     * bối cảnh đạo cụ nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)
     */
    prop_context?: (string | null);
    /**
     * prop_description: str = Field(..., description=Mô tả đạo cụ trong nguyên văn, min_length=1)
     */
    prop_description: string;
};

