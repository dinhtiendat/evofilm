/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotVideoPromptPackRead } from './ShotVideoPromptPackRead';
/**
 * Kết quả xem trước prompt video.
 */
export type ShotVideoPromptPreviewRead = {
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * ID mẫu prompt đang sử dụng
     */
    template_id?: (string | null);
    /**
     * tên mẫu prompt đang sử dụng
     */
    template_name?: (string | null);
    /**
     * Prompt sau khi kết xuất
     */
    rendered_prompt: string;
    /**
     * gói ngữ cảnh kết xuất
     */
    pack: ShotVideoPromptPackRead;
    /**
     * Thông báo không chặn phát hiện khi kết xuất
     */
    warnings?: Array<string>;
};

