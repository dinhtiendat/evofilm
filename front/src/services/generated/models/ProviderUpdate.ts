/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProviderStatus } from './ProviderStatus';
/**
 * Trường tùy chọn khi cập nhật nhà cung cấp.。
 */
export type ProviderUpdate = {
    /**
     * name: str | None = Field(None, description=Tên nhà cung cấp)
     */
    name?: (string | null);
    /**
     * API Base URL cho văn bản / dùng chung
     */
    base_url?: (string | null);
    /**
     * Khả năng hình ảnh API Base URL(chép lên tùy chọn)
     */
    image_base_url?: (string | null);
    /**
     * Khả năng video API Base URL(chép lên tùy chọn)
     */
    video_base_url?: (string | null);
    /**
     * description: str | None = Field(None, description=Mô tả)
     */
    description?: (string | null);
    /**
     * description=Trạng thái:active/testing/disabled,：active/testing/disabled
     */
    status?: (ProviderStatus | null);
    /**
     * API Key (nhạy cảm, không hiển thị ngược trong response)
     */
    api_key?: (string | null);
    /**
     * API Secret (nhạy cảm, không hiển thị ngược trong response)
     */
    api_secret?: (string | null);
};

