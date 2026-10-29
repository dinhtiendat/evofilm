/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu trích xuất thông tin cấp dự án (đầu ra cuối cùng).
 */
export type ScriptExtractRequest = {
    /**
     * project_id: str = Field(..., description=ID dự án, min_length=1) ID
     */
    project_id: string;
    /**
     * chapter_id: str = Field(..., description=ID chương, min_length=1) ID
     */
    chapter_id: string;
    /**
     * Kết quả chia phân cảnh (ScriptDivisionResult dạng serialized)
     */
    script_division: Record<string, any>;
    /**
     * Kết quả kiểm tra tính nhất quán (tùy chọn; ScriptConsistencyCheckResult dạng serialized)
     */
    consistency?: (Record<string, any> | null);
    /**
     * refresh_cache: bool = Field(False, description=liệu bỏ qua bộ đệm phía sau và buộc trích xuất lại hay không)
     */
    refresh_cache?: boolean;
};

