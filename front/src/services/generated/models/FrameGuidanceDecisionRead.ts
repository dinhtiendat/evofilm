/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Kết quả quyết định giữ lại/nén guidance của khung hình phân cảnh.
 */
export type FrameGuidanceDecisionRead = {
    /**
     * Nguyên văn guidance
     */
    text: string;
    /**
     * Hạng mục guidance, ví dụ summary / continuity / composition / screen
     */
    category: string;
    /**
     * nhãn lý do ngắn gọn, như Giữ không gian ở khung đầu / Giữ trục kịch ở khung chính
     */
    reason_tag?: string;
    /**
     * giải thích lý do guidance này được giữ lại hay nén
     */
    reason: string;
};

