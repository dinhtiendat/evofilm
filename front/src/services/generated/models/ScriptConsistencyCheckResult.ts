/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ScriptConsistencyIssue } from './ScriptConsistencyIssue';
/**
 * Kết quả kiểm tra nhất quán dựa trên nguyên văn (tập trung vào nhầm lẫn nhân vật).
 */
export type ScriptConsistencyCheckResult = {
    /**
     * issues: List[ScriptConsistencyIssue] = Field(default_factory=list, description=Danh sách vấn đề)
     */
    issues?: Array<ScriptConsistencyIssue>;
    /**
     * has_issues: bool = Field(..., description=Có phát hiện vấn đề không)
     */
    has_issues: boolean;
    /**
     * Tóm tắt (tùy chọn)
     */
    summary?: (string | null);
};

