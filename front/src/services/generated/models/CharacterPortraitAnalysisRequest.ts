/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân tích thông tin thiếu của chân dung nhân vật.。
 */
export type CharacterPortraitAnalysisRequest = {
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
     * bối cảnh nhân vật nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)
     */
    character_context?: (string | null);
    /**
     * character_description: str = Field(..., description=Mô tả nhân vật trong nguyên văn, min_length=1)
     */
    character_description: string;
};

