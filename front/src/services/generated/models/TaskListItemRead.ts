/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
export type TaskListItemRead = {
    task_id: string;
    /**
     * task_kind: str = Field(..., description=Loại tác vụ nghiệp vụ)
     */
    task_kind: string;
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
    /**
     * created_at_ts: float | None = Field(None, description=dấu thời gian tạo tác vụ)
     */
    created_at_ts?: (number | null);
    /**
     * updated_at_ts: float | None = Field(None, description=dấu thời gian cập nhật tác vụ)
     */
    updated_at_ts?: (number | null);
    /**
     * Loại executor, ví dụ celery
     */
    executor_type?: (string | null);
    /**
     * executor_task_id: str | None = Field(None, description=ID tác vụ phía executor) ID
     */
    executor_task_id?: (string | null);
    /**
     * relation_type: str | None = Field(None, description=loại liên kết nghiệp vụ)
     */
    relation_type?: (string | null);
    /**
     * relation_entity_id: str | None = Field(None, description=thực thể liên kết nghiệp vụ ID) ID
     */
    relation_entity_id?: (string | null);
    /**
     * resource_type: str | None = Field(None, description=Loại tài nguyên)
     */
    resource_type?: (string | null);
    /**
     * navigate_relation_type: str | None = Field(None, description=Loại liên kết chuyển hướng mặc định phía frontend)
     */
    navigate_relation_type?: (string | null);
    /**
     * navigate_relation_entity_id: str | None = Field(None, description=ID thực thể liên kết để phía trước chuyển hướng mặc định) ID
     */
    navigate_relation_entity_id?: (string | null);
};

