/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DialogueLineMode } from './DialogueLineMode';
export type ShotDialogLineRead = {
    /**
     * ID dòng hội thoại
     */
    id: number;
    /**
     * chi tiết phân cảnh thuộc ID
     */
    shot_detail_id: string;
    /**
     * số dòng(thứ tự trong shot)
     */
    index?: number;
    /**
     * Nội dung lời thoại
     */
    text: string;
    /**
     * Chế độ lời thoại
     */
    line_mode?: DialogueLineMode;
    /**
     * ID nhân vật nói
     */
    speaker_character_id?: (string | null);
    /**
     * ID nhân vật người nghe
     */
    target_character_id?: (string | null);
    /**
     * Tên nhân vật nói (dùng để ghi ngược liên kết; null được)
     */
    speaker_name?: (string | null);
    /**
     * Tên nhân vật người nghe (dùng để ghi ngược liên kết; null được)
     */
    target_name?: (string | null);
};

