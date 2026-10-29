/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidenceSpan } from './EvidenceSpan';
/**
 * Mục trục thời gian tiến hóa trang phục của một nhân vật.。
 */
export type CostumeTimelineEntry = {
    /**
     * shot_index: int = Field(..., ge=1, description=Thứ tự của phân cảnh)
     */
    shot_index: number;
    /**
     * Tùy chọn: ID ổn định của bối cảnh sở hữu (nếu đã suy ra được)
     */
    scene_id?: (string | null);
    /**
     * Điểm chính trang phục / ngoại hình (ngắn)
     */
    costume_note?: (string | null);
    /**
     * changes: List[str] = Field(default_factory=list, description=Điểm thay đổi so với mục trước đó)
     */
    changes?: Array<string>;
    /**
     * Bằng chứng từ nguyên văn (tùy chọn)
     */
    evidence?: Array<EvidenceSpan>;
};

