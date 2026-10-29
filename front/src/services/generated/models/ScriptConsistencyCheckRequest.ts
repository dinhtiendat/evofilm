/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu kiểm tra tính nhất quán (nhầm lẫn nhân vật).
 */
export type ScriptConsistencyCheckRequest = {
    /**
     * ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    project_id?: (string | null);
    /**
     * ID chương (tùy chọn: liên kết tác vụ không đồng bộ)
     */
    chapter_id?: (string | null);
    /**
     * script_text: str = Field(..., description=Văn bản kịch bản đầy đủ, min_length=1)
     */
    script_text: string;
};

