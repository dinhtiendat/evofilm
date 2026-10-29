/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CostumeTimeline } from './CostumeTimeline';
import type { VariantSuggestion } from './VariantSuggestion';
/**
 * Kết quả phân tích biến thể.。
 */
export type VariantAnalysisResult = {
    /**
     * costume_timelines: List[CostumeTimeline] = Field(default_factory=list, description=Trục thời gian biến đổi trang phục của từng nhân vật)
     */
    costume_timelines?: Array<CostumeTimeline>;
    /**
     * variant_suggestions: List[VariantSuggestion] = Field(default_factory=list, description=Danh sách gợi ý biến thể)
     */
    variant_suggestions?: Array<VariantSuggestion>;
    /**
     * chapter_variants: Dict[str, List[str]] = Field(default_factory=dict, description=Gợi ý biến thể theo chương)
     */
    chapter_variants?: Record<string, Array<string>>;
    /**
     * notes: Optional[str] = Field(None, description=Mô tả phân tích)
     */
    notes?: (string | null);
};

