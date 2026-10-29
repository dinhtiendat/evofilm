/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
export type TaskCancelRead = {
    task_id: string;
    status: TaskStatus;
    /**
     * cancel_requested: bool = Field(..., description=liệu yêu cầu hủy đã được đăng ký hay chưa)
     */
    cancel_requested: boolean;
    /**
     * cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)
     */
    cancel_requested_at_ts?: (number | null);
    /**
     * effective_immediately: bool = Field(False, description=Liệu đã hoàn tất hủy lập tức chưa)
     */
    effective_immediately?: boolean;
};

