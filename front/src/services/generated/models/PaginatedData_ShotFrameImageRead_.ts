/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from './Pagination';
import type { ShotFrameImageRead } from './ShotFrameImageRead';
export type PaginatedData_ShotFrameImageRead_ = {
    /**
     * items: list[T] = Field(..., description=dữ liệu trang hiện tại)
     */
    items: Array<ShotFrameImageRead>;
    /**
     * pagination: Pagination = Field(..., description=Thông tin phân trang)
     */
    pagination: Pagination;
};

