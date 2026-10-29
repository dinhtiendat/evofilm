/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotAssetOverviewItem } from './ShotAssetOverviewItem';
import type { ShotAssetsOverviewSummary } from './ShotAssetsOverviewSummary';
import type { ShotStatus } from './ShotStatus';
export type ShotAssetsOverviewRead = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * Có rõ ràng bỏ qua trích xuất không
     */
    skip_extraction: boolean;
    /**
     * Trạng thái quy trình của phân cảnh
     */
    status: ShotStatus;
    /**
     * Thống kê tổng quan
     */
    summary: ShotAssetsOverviewSummary;
    /**
     * Mục tổng quan tài nguyên
     */
    items?: Array<ShotAssetOverviewItem>;
};

