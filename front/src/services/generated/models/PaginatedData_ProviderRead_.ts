/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from './Pagination';
import type { ProviderRead } from './ProviderRead';
export type PaginatedData_ProviderRead_ = {
    /**
     * items: list[T] = Field(..., description=dữ liệu trang hiện tại)
     */
    items: Array<ProviderRead>;
    /**
     * pagination: Pagination = Field(..., description=Thông tin phân trang)
     */
    pagination: Pagination;
};

