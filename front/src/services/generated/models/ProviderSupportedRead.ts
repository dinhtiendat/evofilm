/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModelCategoryKey } from './ModelCategoryKey';
/**
 * Danh sách khả năng nhà cung cấp do hệ thống hỗ trợ.。
 */
export type ProviderSupportedRead = {
    /**
     * key: str = Field(..., description=khóa ổn định của nhà cung cấp)
     */
    key: string;
    /**
     * display_name: str = Field(..., description=Tên hiển thị của nhà cung cấp)
     */
    display_name: string;
    /**
     * aliases: list[str] = Field(default_factory=list, description=Biệt danh có thể nhận diện)
     */
    aliases?: Array<string>;
    /**
     * description=Hạng mục mô hình được hỗ trợ,
     */
    supported_categories?: Array<ModelCategoryKey>;
    /**
     * default_base_url: str | None = Field(None, description=API Base URL mặc định) API Base URL
     */
    default_base_url?: (string | null);
    /**
     * requires_api_key: bool = Field(True, description=liệu yêu cầu api_key hay không) api_key
     */
    requires_api_key?: boolean;
    /**
     * requires_api_secret: bool = Field(False, description=Có yêu cầu api_secret không) api_secret
     */
    requires_api_secret?: boolean;
    /**
     * is_experimental: bool = Field(False, description=liệu là nhà cung cấp thử nghiệm hay không)
     */
    is_experimental?: boolean;
};

