/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotFrameType } from './ShotFrameType';
import type { ShotLinkedAssetItem } from './ShotLinkedAssetItem';
/**
 * Body yêu cầu render prompt khung hình phân cảnh.。
 */
export type ShotFramePromptRenderRequest = {
    /**
     * first | last | key
     */
    frame_type: ShotFrameType;
    /**
     * prompt nền gốc. API render yêu cầu truyền rõ, dùng để sinh prompt cuối.
     */
    prompt: string;
    /**
     * Danh sách mục tài nguyên tham chiếu (nhiều mục, thứ tự có hiệu lực). Backend sẽ dùng item.file_id làm ảnh tham chiếu; các mục không hợp lệ sẽ bị bỏ qua.
     */
    images?: Array<ShotLinkedAssetItem>;
};

