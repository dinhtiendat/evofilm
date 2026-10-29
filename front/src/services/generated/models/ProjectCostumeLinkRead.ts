/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProjectCostumeLinkRead = {
    /**
     * ID hàng liên kết
     */
    id: number;
    /**
     * ID dự án
     */
    project_id: string;
    /**
     * ID chương (để trống được)
     */
    chapter_id?: (string | null);
    /**
     * ID phân cảnh (có thể để trống)
     */
    shot_id?: (string | null);
    costume_id: string;
    /**
     * URL tải về ảnh thu nhỏ trang phục
     */
    thumbnail?: string;
};

