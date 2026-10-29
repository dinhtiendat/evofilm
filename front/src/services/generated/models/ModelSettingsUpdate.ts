/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LogLevel } from './LogLevel';
/**
 * Body yêu cầu cập nhật hoặc lưu cấu hình toàn cục của mô hình.。
 */
export type ModelSettingsUpdate = {
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
};

