/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModelCategoryKey } from './ModelCategoryKey';
/**
 * Body yêu cầu cập nhật mô hình (tất cả tùy chọn).
 */
export type ModelUpdate = {
    /**
     * name: str | None = Field(None, description=Tên mô hình)
     */
    name?: (string | null);
    /**
     * category: ModelCategoryKey | None = Field(None, description=Hạng mục mô hình)
     */
    category?: (ModelCategoryKey | null);
    /**
     * provider_id: str | None = Field(None, description=ID nhà cung cấp sở hữu) ID
     */
    provider_id?: (string | null);
    /**
     * params: dict[str, Any] | None = Field(None, description=Tham số mô hình (JSON))（JSON）
     */
    params?: (Record<string, any> | null);
    /**
     * description: str | None = Field(None, description=Mô tả)
     */
    description?: (string | null);
};

