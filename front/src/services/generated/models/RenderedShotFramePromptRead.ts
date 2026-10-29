/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FrameGuidanceDecisionRead } from './FrameGuidanceDecisionRead';
import type { ShotFramePromptMappingRead } from './ShotFramePromptMappingRead';
/**
 * Kết quả render prompt tạo cuối cùng của khung hình chính.
 */
export type RenderedShotFramePromptRead = {
    /**
     * prompt cơ sở gốc (không bao gồm diễn giải ánh xạ hình ảnh)
     */
    base_prompt: string;
    /**
     * Prompt cuối cùng gửi cho mô hình (kèm giải thích ánh xạ hình ảnh)
     */
    rendered_prompt: string;
    /**
     * Danh sách guidance thực sự giữ lại trong prompt cuối cùng
     */
    selected_guidance?: Array<string>;
    /**
     * Danh sách guidance bị nén bớt trong lần kết xuất này
     */
    dropped_guidance?: Array<string>;
    /**
     * Chi tiết quyết định của guidance giữ lại cuối cùng
     */
    selected_guidance_details?: Array<FrameGuidanceDecisionRead>;
    /**
     * Chi tiết quyết định của guidance bị nén bớt
     */
    dropped_guidance_details?: Array<FrameGuidanceDecisionRead>;
    /**
     * Danh sách file_id ảnh tham chiếu cuối cùng, thứ tự khớp với mappings
     */
    images?: Array<string>;
    /**
     * quan hệ ánh xạ giữa ảnh và tên thực thể, thứ tự hoàn toàn nhất quán với images
     */
    mappings?: Array<ShotFramePromptMappingRead>;
};

