/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidenceSpan } from './EvidenceSpan';
/**
 * Gợi ý biến thể.。
 */
export type VariantSuggestion = {
    /**
     * entity_id: str = Field(..., description=ID thực thể)ID
     */
    entity_id: string;
    /**
     * entity_name: str = Field(..., description=tên thực thể)
     */
    entity_name: string;
    /**
     * entity_type: str = Field(..., description=Loại thực thể (character/scene/prop/location))（character/scene/prop/location）
     */
    entity_type: string;
    /**
     * suggestion: str = Field(..., description=Mô tả gợi ý biến thể)
     */
    suggestion: string;
    /**
     * affected_shots: List[int] = Field(default_factory=list, description=Các phân cảnh bị ảnh hưởng)
     */
    affected_shots?: Array<number>;
    /**
     * Bằng chứng từ nguyên văn (tùy chọn)
     */
    evidence?: Array<EvidenceSpan>;
};

