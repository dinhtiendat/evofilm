/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DialogueLineMode } from './DialogueLineMode';
import type { ShotDialogueCandidateStatus } from './ShotDialogueCandidateStatus';
export type ShotExtractedDialogueCandidateRead = {
    /**
     * ID ứng viên thoại
     */
    id: number;
    /**
     * phân cảnh thuộc ID
     */
    shot_id: string;
    /**
     * thứ tự ứng viên thoại trong shot
     */
    index: number;
    /**
     * văn bản thoại đã trích xuất
     */
    text: string;
    /**
     * chế độ thoại
     */
    line_mode: DialogueLineMode;
    /**
     * tên nhân vật nói
     */
    speaker_name?: (string | null);
    /**
     * Tên nhân vật người nghe
     */
    target_name?: (string | null);
    /**
     * Trạng thái xác nhận ứng viên lời thoại
     */
    candidate_status: ShotDialogueCandidateStatus;
    /**
     * ID dòng thoại được liên kết sau khi chấp nhận
     */
    linked_dialog_line_id?: (number | null);
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

