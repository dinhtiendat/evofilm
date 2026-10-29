/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DialogueLineMode } from './DialogueLineMode';
export type ShotExtractedDialogueCandidateAcceptRequest = {
    /**
     * Thứ tự dùng khi ghi dòng thoại; để trống thì dùng thứ tự ứng viên
     */
    index?: (number | null);
    /**
     * Khi chấp nhận có thể ghi đè văn bản thoại
     */
    text?: (string | null);
    /**
     * Có thể ghi đè chế độ thoại khi chấp nhận
     */
    line_mode?: (DialogueLineMode | null);
    /**
     * khi chấp nhận có thể ghi đè tên nhân vật nói
     */
    speaker_name?: (string | null);
    /**
     * khi chấp nhận có thể ghi đè tên nhân vật nghe
     */
    target_name?: (string | null);
};

