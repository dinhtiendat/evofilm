/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModelCategoryKey } from './ModelCategoryKey';
/**
 * Thân yêu cầu tạo mô hình.。
 */
export type ModelCreate = {
    /**
     * name: str = Field(..., description=tên mô hình)
     */
    name: string;
    /**
     * category: ModelCategoryKey = Field(..., description=Hạng mục mô hình: text/image/video)：text/image/video
     */
    category: ModelCategoryKey;
    /**
     * provider_id: str = Field(..., description=ID nhà cung cấp sở thuộc) ID
     */
    provider_id: string;
    /**
     * params: dict[str, Any] = Field(default_factory=dict, description=Tham số mô hình (JSON))（JSON）
     */
    params?: Record<string, any>;
    /**
     * description: str = Field(, description=Mô tả)
     */
    description?: string;
    /**
     * created_by: str = Field(, description=Người tạo)
     */
    created_by?: string;
    /**
     * id: str = Field(..., description=mô hình ID) ID
     */
    id: string;
};

