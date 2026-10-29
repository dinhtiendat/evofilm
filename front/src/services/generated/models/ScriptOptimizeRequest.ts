/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu tối ưu kịch bản (dựa trên kết quả kiểm tra nhất quán).
 */
export type ScriptOptimizeRequest = {
    /**
     * ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    project_id?: (string | null);
    /**
     * ID chương (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    chapter_id?: (string | null);
    /**
     * script_text: str = Field(..., description=Văn bản kịch bản gốc, min_length=1)
     */
    script_text: string;
    /**
     * Đầu ra kiểm tra tính nhất quán (ScriptConsistencyCheckResult dạng serialized)
     */
    consistency: Record<string, any>;
};

