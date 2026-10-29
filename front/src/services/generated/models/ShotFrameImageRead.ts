/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotFrameType } from './ShotFrameType';
export type ShotFrameImageRead = {
    /**
     * dòng hình ảnh ID
     */
    id: number;
    /**
     * chi tiết phân cảnh thuộc ID
     */
    shot_detail_id: string;
    /**
     * Loại khung hình: first/last/key
     */
    frame_type: ShotFrameType;
    /**
     * ID FileItem liên kết (có thể để trống, cho phép tạo giữ chỗ trước)
     */
    file_id?: (string | null);
    /**
     * Rộng(px)
     */
    width?: (number | null);
    /**
     * Cao(px)
     */
    height?: (number | null);
    /**
     * Định dạng
     */
    format?: string;
};

