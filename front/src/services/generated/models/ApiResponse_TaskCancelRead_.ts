/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskCancelRead } from './TaskCancelRead';
export type ApiResponse_TaskCancelRead_ = {
    /**
     * Khớp mã trạng thái HTTP
     */
    code?: number;
    /**
     * message: str = Field(success, description=Thông báo)
     */
    message?: string;
    /**
     * data: T | None = Field(None, description=dữ liệu thực)
     */
    data?: (TaskCancelRead | null);
    /**
     * meta: dict[str, Any] | None = Field(None, description=siêu dữ liệu đi kèm)
     */
    meta?: (Record<string, any> | null);
};

