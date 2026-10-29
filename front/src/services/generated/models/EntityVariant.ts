/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidenceSpan } from './EvidenceSpan';
/**
 * Mục biến thể thực thể (cấu trúc tối thiểu dùng được, thuận tiện cho diễn biến trang phục/ngoại hình).
 */
export type EntityVariant = {
    /**
     * Khóa biến thể (ví dụ outfit_v1, wounded_state...)
     */
    variant_key: string;
    /**
     * mô tả biến thể (ngắn gọn)
     */
    description?: (string | null);
    /**
     * affected_shots: List[int] = Field(default_factory=list, description=Số thứ tự phân cảnh bị ảnh hưởng)
     */
    affected_shots?: Array<number>;
    /**
     * Bằng chứng từ nguyên văn (tùy chọn)
     */
    evidence?: Array<EvidenceSpan>;
};

