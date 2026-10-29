/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Tuỳ chọn tham số tạo tương ứng với mô hình video mặc định hiện tại.。
 */
export type VideoGenerationOptionsRead = {
    /**
     * provider: str = Field(..., description=khóa ổn định của nhà cung cấp)
     */
    provider: string;
    /**
     * model_id: str = Field(..., description=ID mô hình video mặc định) ID
     */
    model_id: string;
    /**
     * model_name: str = Field(..., description=Tên mô hình video mặc định)
     */
    model_name: string;
    /**
     * allowed_ratios: list[str] = Field(default_factory=list, description=Các lựa chọn tỷ lệ được phép của mô hình hiện tại)
     */
    allowed_ratios?: Array<string>;
    /**
     * default_ratio: str = Field(..., description=Tỷ lệ mặc định của mô hình hiện tại)
     */
    default_ratio: string;
};

