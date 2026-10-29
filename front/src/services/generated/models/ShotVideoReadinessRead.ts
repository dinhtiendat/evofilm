/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotVideoReadinessCheck } from './ShotVideoReadinessCheck';
/**
 * Độ sẵn sàng tạo video phân cảnh.
 */
export type ShotVideoReadinessRead = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * Chế độ tham chiếu
     */
    reference_mode: string;
    /**
     * Có thỏa điều kiện tạo video theo reference_mode hiện tại không
     */
    ready: boolean;
    /**
     * Mục kiểm tra độ sẵn sàng
     */
    checks?: Array<ShotVideoReadinessCheck>;
};

