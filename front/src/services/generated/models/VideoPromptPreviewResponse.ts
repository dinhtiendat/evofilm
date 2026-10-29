/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotVideoPromptPackRead } from './ShotVideoPromptPackRead';
export type VideoPromptPreviewResponse = {
    /**
     * Prompt cuối cùng dùng để tạo video
     */
    prompt: string;
    /**
     * Danh sách file_id ảnh tham chiếu liên kết
     */
    images?: Array<string>;
    /**
     * Gói ngữ cảnh xem trước prompt video
     */
    pack?: (ShotVideoPromptPackRead | null);
};

