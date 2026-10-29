/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActionBeatPhaseRead } from './ActionBeatPhaseRead';
import type { ShotPromptAssetRef } from './ShotPromptAssetRef';
import type { ShotPromptCameraInfo } from './ShotPromptCameraInfo';
/**
 * Gói ngữ cảnh chuẩn trước khi render prompt video.
 */
export type ShotVideoPromptPackRead = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * tiêu đề shot
     */
    title?: string;
    /**
     * Trích đoạn kịch bản
     */
    script_excerpt?: string;
    /**
     * Điểm chính của hành động/bối cảnh
     */
    action_beats?: Array<string>;
    /**
     * Kết quả suy luận giai đoạn của mốc hành động
     */
    action_beat_phases?: Array<ActionBeatPhaseRead>;
    /**
     * Tóm tắt phân cảnh trước, dùng cho ràng buộc liên tục của prompt
     */
    previous_shot_summary?: string;
    /**
     * mục tiêu phân cảnh tiếp theo, dùng cho ràng buộc liên tục của prompt
     */
    next_shot_goal?: string;
    /**
     * gợi ý tiếp nối giữa phân cảnh hiện tại và phân cảnh liền kề
     */
    continuity_guidance?: string;
    /**
     * gợi ý mỏ neo bố cục và không gian của phân cảnh hiện tại
     */
    composition_anchor?: string;
    /**
     * Gợi ý hướng nhìn, tầm mắt và trục trái-phải của nhân vật trong phân cảnh hiện tại
     */
    screen_direction_guidance?: string;
    /**
     * Tóm tắt thoại
     */
    dialogue_summary?: string;
    /**
     * Tham chiếu nhân vật
     */
    characters?: Array<ShotPromptAssetRef>;
    /**
     * tham chiếu bối cảnh
     */
    scene?: (ShotPromptAssetRef | null);
    /**
     * Tham chiếu đạo cụ
     */
    props?: Array<ShotPromptAssetRef>;
    /**
     * Tham chiếu trang phục
     */
    costumes?: Array<ShotPromptAssetRef>;
    /**
     * Ngôn ngữ điện ảnh
     */
    camera?: ShotPromptCameraInfo;
    /**
     * Mô tả không khí
     */
    atmosphere?: string;
    /**
     * Phong cách thị giác của dự án
     */
    visual_style?: string;
    /**
     * thể loại/phong cách dự án
     */
    style?: string;
    /**
     * Prompt tiêu cực mặc định
     */
    negative_prompt?: string;
};

