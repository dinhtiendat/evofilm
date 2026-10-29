/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
export type AsyncTaskCreateRead = {
    /**
     * task_id: str = Field(..., description=ID tác vụ) ID
     */
    task_id: string;
    /**
     * status: TaskStatus = Field(..., description=Trạng thái tác vụ)
     */
    status: TaskStatus;
    /**
     * reused: bool = Field(False, description=liệu đã tái sử dụng tác vụ đang hoạt động có sẵn của thực thể nghiệp vụ hiện tại hay chưa)
     */
    reused?: boolean;
    /**
     * relation_type: str | None = Field(None, description=loại liên kết nghiệp vụ)
     */
    relation_type?: (string | null);
    /**
     * relation_entity_id: str | None = Field(None, description=thực thể liên kết nghiệp vụ ID) ID
     */
    relation_entity_id?: (string | null);
};

