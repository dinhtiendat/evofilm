/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StudioAssetDraft } from './StudioAssetDraft';
import type { StudioCharacterDraft } from './StudioCharacterDraft';
import type { StudioShotDraft } from './StudioShotDraft';
/**
 * Dùng để nhập bản nháp kết quả trích xuất của Studio (name-based).
 */
export type StudioScriptExtractionDraft = {
    /**
     * ID dự án (bắt buộc)
     */
    project_id: string;
    /**
     * ID chương (bắt buộc, dùng để tạo shots/links)
     */
    chapter_id: string;
    /**
     * Văn bản kịch bản (có thể là phiên bản đã tối ưu)
     */
    script_text: string;
    characters?: Array<StudioCharacterDraft>;
    scenes?: Array<StudioAssetDraft>;
    props?: Array<StudioAssetDraft>;
    costumes?: Array<StudioAssetDraft>;
    /**
     * shots: List[StudioShotDraft] = Field(default_factory=list, description=Danh sách bản nháp phân cảnh)
     */
    shots?: Array<StudioShotDraft>;
};

