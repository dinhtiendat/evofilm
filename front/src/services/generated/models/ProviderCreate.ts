/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProviderStatus } from './ProviderStatus';
/**
 * Body yêu cầu khi tạo nhà cung cấp, cho phép điền trường nhạy cảm.
 */
export type ProviderCreate = {
    /**
     * name: str = Field(..., description=tên nhà cung cấp)
     */
    name: string;
    /**
     * Base URL API văn bản/thông dụng
     */
    base_url: string;
    /**
     * Khả năng hình ảnh API Base URL(chép lên tùy chọn)
     */
    image_base_url?: (string | null);
    /**
     * Khả năng video API Base URL(chép lên tùy chọn)
     */
    video_base_url?: (string | null);
    /**
     * description: str = Field(, description=Mô tả)
     */
    description?: string;
    /**
     * description=Trạng thái:active/testing/disabled,：active/testing/disabled
     */
    status?: ProviderStatus;
    /**
     * created_by: str = Field(, description=Người tạo)
     */
    created_by?: string;
    /**
     * id: str = Field(..., description=nhà cung cấp ID) ID
     */
    id: string;
    /**
     * API Key (nhạy cảm, không trả lại trong phản hồi)
     */
    api_key?: string;
    /**
     * API Secret (nhạy cảm, không hiển thị lại trong phản hồi)
     */
    api_secret?: string;
};

