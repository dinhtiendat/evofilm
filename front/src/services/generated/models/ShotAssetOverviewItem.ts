/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotCandidateStatus } from './ShotCandidateStatus';
/**
 * Mục tổng quan tài nguyên phân cảnh: thống nhất trả về view hợp nhất của tài nguyên đã liên kết và ứng viên trích xuất.
 */
export type ShotAssetOverviewItem = {
    /**
     * Khóa gộp: type:name
     */
    key: string;
    /**
     * Loại thực thể: character/prop/scene/costume
     */
    type: 'character' | 'prop' | 'scene' | 'costume';
    /**
     * Tên tài nguyên
     */
    name: string;
    /**
     * Mô tả ứng viên (lấy từ payload trích xuất)
     */
    description?: (string | null);
    /**
     * Ảnh thu nhỏ
     */
    thumbnail?: (string | null);
    /**
     * ID tệp ảnh thu nhỏ hoặc ảnh tham chiếu
     */
    file_id?: (string | null);
    /**
     * Nguồn: linked/candidate/both
     */
    source: 'linked' | 'candidate' | 'both';
    /**
     * ID ứng viên
     */
    candidate_id?: (number | null);
    /**
     * Trạng thái xác nhận ứng viên
     */
    candidate_status?: (ShotCandidateStatus | null);
    /**
     * ID thực thể đã liên kết hiện tại
     */
    linked_entity_id?: (string | null);
    /**
     * ID dòng image của thực thể đã liên kết hiện tại
     */
    linked_image_id?: (number | null);
    /**
     * Hiện tại đã được liên kết tới phân cảnh chưa
     */
    is_linked: boolean;
};

