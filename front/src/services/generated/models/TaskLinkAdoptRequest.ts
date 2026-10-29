/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu cập nhật trạng thái áp dụng: task_id + đối tượng liên kết chọn một trong ba (project_id/chapter_id/shot_id).
 */
export type TaskLinkAdoptRequest = {
    /**
     * ID dự án liên kết (tùy chọn)
     */
    project_id?: (string | null);
    /**
     * ID chương liên kết (tùy chọn)
     */
    chapter_id?: (string | null);
    /**
     * ID phân cảnh liên kết (tùy chọn)
     */
    shot_id?: (string | null);
    /**
     * task_id: str = Field(..., description=ID tác vụ) ID
     */
    task_id: string;
};

