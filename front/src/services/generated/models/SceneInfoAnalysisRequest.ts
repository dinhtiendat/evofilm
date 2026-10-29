/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân tích thiếu thông tin bối cảnh.。
 */
export type SceneInfoAnalysisRequest = {
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
     * bối cảnh bối cảnh nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)
     */
    scene_context?: (string | null);
    /**
     * scene_description: str = Field(..., description=Mô tả bối cảnh trong nguyên văn, min_length=1)
     */
    scene_description: string;
};

