/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotCandidateStatus } from './ShotCandidateStatus';
import type { ShotCandidateType } from './ShotCandidateType';
export type ShotExtractedCandidateRead = {
    /**
     * ID mục ứng viên
     */
    id: number;
    /**
     * phân cảnh thuộc ID
     */
    shot_id: string;
    /**
     * loại ứng viên
     */
    candidate_type: ShotCandidateType;
    /**
     * Tên ứng viên đã trích xuất
     */
    candidate_name: string;
    /**
     * Trạng thái xác nhận ứng viên
     */
    candidate_status: ShotCandidateStatus;
    /**
     * ID thực thể đã liên kết
     */
    linked_entity_id?: (string | null);
    /**
     * nguồn ứng viên
     */
    source: string;
    /**
     * thông tin bổ trợ cho ứng viên
     */
    payload?: Record<string, any>;
    /**
     * Thời điểm xác nhận
     */
    confirmed_at?: (string | null);
    /**
     * Thời gian tạo
     */
    created_at: string;
    /**
     * Thời gian cập nhật
     */
    updated_at: string;
};

