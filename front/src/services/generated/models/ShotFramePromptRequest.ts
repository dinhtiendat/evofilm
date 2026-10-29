/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu tác vụ tạo prompt khung hình phân cảnh.。
 */
export type ShotFramePromptRequest = {
    /**
     * shot_id: str = Field(..., description=ID phân cảnh) ID
     */
    shot_id: string;
    /**
     * first | last | key
     */
    frame_type: string;
};

