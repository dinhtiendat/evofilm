/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from './Pagination';
import type { ShotLinkedAssetItem } from './ShotLinkedAssetItem';
export type PaginatedData_ShotLinkedAssetItem_ = {
    /**
     * items: list[T] = Field(..., description=dữ liệu trang hiện tại)
     */
    items: Array<ShotLinkedAssetItem>;
    /**
     * pagination: Pagination = Field(..., description=Thông tin phân trang)
     */
    pagination: Pagination;
};

