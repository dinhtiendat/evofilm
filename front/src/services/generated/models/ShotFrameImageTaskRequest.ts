/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotFrameType } from './ShotFrameType';
import type { ShotLinkedAssetItem } from './ShotLinkedAssetItem';
/**
 * Thân yêu cầu tạo ảnh khung hình phân cảnh: chỉ định vị ShotFrameImage dựa trên `shot_id + frame_type`.
 *
 * Dùng để thay thế cách truyền trực tiếp ShotFrameImage.id qua `image_id` trong giao diện cũ.
 */
export type ShotFrameImageTaskRequest = {
    /**
     * Mô hình tùy chọn ID(models.id); nếu không truyền sẽ dùng ModelSettings.default_image_model_id;Provider tra ngược từ liên kết của mô hình
     */
    model_id?: (string | null);
    /**
     * first | last | key
     */
    frame_type: ShotFrameType;
    /**
     * Prompt (do phía trước truyền vào, bắt buộc với interface tạo tác vụ).
     */
    prompt: string;
    /**
     * danh sách mục tài nguyên tham chiếu (nhiều ảnh, thứ tự có hiệu lực). Backend sẽ dùng item.file_id làm ảnh tham chiếu；Mục không hợp lệ sẽ bị bỏ qua.。
     */
    images?: Array<ShotLinkedAssetItem>;
    /**
     * tỷ lệ khung hình video đích；khung hình chính sẽ sinh theo khung hình này để tăng tính ổn định tham chiếu video sau
     */
    target_ratio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '3:2' | '2:3';
    /**
     * Hạng độ phân giải đầu ra khung hình chính, mặc định standard
     */
    resolution_profile?: ('standard' | 'high' | null);
};

