/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LogLevel } from './LogLevel';
/**
 * Cài đặt toàn cục mô hình trả về phía ngoài.。
 */
export type ModelSettingsRead = {
    /**
     * default_text_model_id: str | None = Field(None, description=ID mô hình văn bản mặc định) ID
     */
    default_text_model_id?: (string | null);
    /**
     * default_image_model_id: str | None = Field(None, description=ID mô hình ảnh mặc định) ID
     */
    default_image_model_id?: (string | null);
    /**
     * default_video_model_id: str | None = Field(None, description=ID mô hình video mặc định) ID
     */
    default_video_model_id?: (string | null);
    /**
     * API timeout (giây)
     */
    api_timeout?: number;
    /**
     * log_level: LogLevel = Field(LogLevel.info, description=cấp nhật ký)
     */
    log_level?: LogLevel;
    /**
     * ID dòng cấu hình (thường là 1)
     */
    id: number;
};

