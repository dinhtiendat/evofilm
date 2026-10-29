/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActionBeatPhaseRead } from './ActionBeatPhaseRead';
import type { ShotAssetsOverviewRead } from './ShotAssetsOverviewRead';
import type { ShotDialogLineRead } from './ShotDialogLineRead';
import type { ShotExtractedDialogueCandidateRead } from './ShotExtractedDialogueCandidateRead';
import type { ShotRead } from './ShotRead';
/**
 * Trạng thái tổng hợp trang chuẩn bị phân cảnh.
 */
export type ShotPreparationStateRead = {
    /**
     * Trạng thái mới nhất của phân cảnh hiện tại
     */
    shot: ShotRead;
    /**
     * Trạng thái tổng hợp khu vực xác nhận tài nguyên
     */
    assets_overview: ShotAssetsOverviewRead;
    /**
     * Ứng viên thoại đang chờ xử lý/đã tồn tại hiện tại
     */
    dialogue_candidates?: Array<ShotExtractedDialogueCandidateRead>;
    /**
     * Dòng lời thoại đã lưu hiện tại
     */
    saved_dialogue_lines?: Array<ShotDialogLineRead>;
    /**
     * Tổng số mục vẫn chờ xác nhận hiện tại (tài nguyên + thoại)
     */
    pending_confirm_count: number;
    /**
     * liệu tiêu đề và trích đoạn kịch bản đã được bổ sung đủ hay chưa
     */
    basic_info_ready: boolean;
    /**
     * Giá trị mặc định ngôn ngữ điện ảnh đã được xác nhận chưa
     */
    semantic_defaults_ready: boolean;
    /**
     * liệu mốc hành động đã được xác nhận hay chưa
     */
    action_beats_ready: boolean;
    /**
     * số mốc hành động đã xác nhận hiện tại
     */
    action_beats_count?: number;
    /**
     * Kết quả suy luận giai đoạn của mốc hành động hiện tại
     */
    action_beat_phases?: Array<ActionBeatPhaseRead>;
    /**
     * Phân cảnh hiện tại đã hoàn tất chuẩn bị, có thể vào khâu tạo tiếp theo chưa
     */
    ready_for_generation: boolean;
};

