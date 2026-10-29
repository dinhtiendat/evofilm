/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
export type TaskStatusRead = {
    task_id: string;
    status: TaskStatus;
    progress: number;
    /**
     * cancel_requested: bool = Field(False, description=Đã yêu cầu hủy chưa)
     */
    cancel_requested?: boolean;
    /**
     * cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)
     */
    cancel_requested_at_ts?: (number | null);
    /**
     * started_at_ts: float | None = Field(None, description=Định thời gian bắt đầu thực thi tác vụ)
     */
    started_at_ts?: (number | null);
    /**
     * finished_at_ts: float | None = Field(None, description=Định thời gian kết thúc tác vụ)
     */
    finished_at_ts?: (number | null);
    /**
     * Tổng thời gian thực thi tác vụ ( mili giây)
     */
    elapsed_ms?: (number | null);
};

