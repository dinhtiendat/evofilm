/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileRead } from './FileRead';
import type { Pagination } from './Pagination';
export type PaginatedData_FileRead_ = {
    /**
     * items: list[T] = Field(..., description=dữ liệu trang hiện tại)
     */
    items: Array<FileRead>;
    /**
     * pagination: Pagination = Field(..., description=Thông tin phân trang)
     */
    pagination: Pagination;
};

