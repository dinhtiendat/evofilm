/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Tuỳ chọn spec khung hình chính tương ứng với mô hình ảnh mặc định hiện tại.。
 */
export type ImageGenerationOptionsRead = {
    /**
     * provider: str = Field(..., description=khóa ổn định của nhà cung cấp)
     */
    provider: string;
    /**
     * model_id: str = Field(..., description=ID mô hình ảnh mặc định) ID
     */
    model_id: string;
    /**
     * model_name: str = Field(..., description=Tên mô hình ảnh mặc định)
     */
    model_name: string;
    /**
     * supported_ratios: list[str] = Field(default_factory=list, description=Tỷ lệ đích được hỗ trợ bởi mô hình hiện tại)
     */
    supported_ratios?: Array<string>;
    /**
     * default_resolution_profile: str = Field(..., description=Hạng phân giải mặc định của mô hình hiện tại)
     */
    default_resolution_profile: string;
    /**
     * description=Kích thước pixel thu được từ ánh xạ theo tỉ lệ và bậc độ phân giải,
     */
    ratio_size_profiles?: Record<string, Record<string, string>>;
};

