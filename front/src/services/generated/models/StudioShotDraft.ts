/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotSemanticSuggestion } from './ShotSemanticSuggestion';
import type { StudioShotDraftDialogueLine } from './StudioShotDraftDialogueLine';
/**
 * nháp shot:không chứa shot_id, do API import sinh；thực thể tham chiếu dùng name.
 */
export type StudioShotDraft = {
    /**
     * Số thứ tự phân cảnh (duy nhất trong chương)
     */
    index: number;
    /**
     * title: str = Field(..., description=Tiêu đề phân cảnh)
     */
    title: string;
    /**
     * script_excerpt: str = Field(, description=Trích đoạn kịch bản)
     */
    script_excerpt?: string;
    /**
     * tên bối cảnh (tùy chọn)
     */
    scene_name?: (string | null);
    /**
     * character_names: List[str] = Field(default_factory=list, description=Danh sách tên nhân vật xuất hiện trong phân cảnh này)
     */
    character_names?: Array<string>;
    /**
     * prop_names: List[str] = Field(default_factory=list, description=Danh sách tên đạo cụ quan trọng của phân cảnh này)
     */
    prop_names?: Array<string>;
    /**
     * costume_names: List[str] = Field(default_factory=list, description=Danh sách tên trang phục của phân cảnh này)
     */
    costume_names?: Array<string>;
    /**
     * dialogue_lines: List[StudioShotDraftDialogueLine] = Field(default_factory=list, description=Danh sách thoại)
     */
    dialogue_lines?: Array<StudioShotDraftDialogueLine>;
    /**
     * Mô tả hành động/bối cảnh
     */
    actions?: Array<string>;
    /**
     * description=Gợi ý mặc định ngôn ngữ phân cảnh và ứng viên mốc hành động,
     */
    semantic_suggestion?: (ShotSemanticSuggestion | null);
};

