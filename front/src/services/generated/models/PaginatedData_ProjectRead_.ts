/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from './Pagination';
import type { ProjectRead } from './ProjectRead';
export type PaginatedData_ProjectRead_ = {
    /**
     * items: list[T] = Field(..., description=dữ liệu trang hiện tại)
     */
    items: Array<ProjectRead>;
    /**
     * pagination: Pagination = Field(..., description=Thông tin phân trang)
     */
    pagination: Pagination;
};

