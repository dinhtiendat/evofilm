/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Đầu ra tối ưu kịch bản: chỉ dùng khi phát hiện vấn đề nhầm lẫn nhân vật.
 */
export type ScriptOptimizationResult = {
    /**
     * optimized_script_text: str = Field(..., description=văn bản kịch bản đã tối ưu)
     */
    optimized_script_text: string;
    /**
     * tóm tắt thay đổi (chỉ xoay quanh issues)
     */
    change_summary: string;
};

