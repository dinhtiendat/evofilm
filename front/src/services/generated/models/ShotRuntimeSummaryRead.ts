/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ShotRuntimeSummaryRead = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * liệu có tác vụ liên kết đang thực hiện hay không
     */
    has_active_tasks: boolean;
    /**
     * Có tồn tại tác vụ video đang chạy không
     */
    has_active_video_tasks: boolean;
    /**
     * Có tồn tại tác vụ prompt đang chạy không
     */
    has_active_prompt_tasks: boolean;
    /**
     * Có tồn tại tác vụ ảnh khung phân cảnh đang chạy không
     */
    has_active_frame_tasks: boolean;
    /**
     * Số tác vụ duy nhất đang chạy
     */
    active_task_count: number;
};

