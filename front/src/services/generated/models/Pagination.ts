/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Thông tin phân trang.。
 */
export type Pagination = {
    /**
     * trang hiện tại, bắt đầu từ 1
     */
    page: number;
    /**
     * page_size: int = Field(..., description=số dòng mỗi trang)
     */
    page_size: number;
    /**
     * total: int = Field(..., description=tổng số dòng)
     */
    total: number;
    /**
     * max_page: int = Field(..., description=số trang tối đa)
     */
    max_page: number;
};

