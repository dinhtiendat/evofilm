/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CostumeTimelineEntry } from './CostumeTimelineEntry';
/**
 * Trục thời gian biến đổi trang phục của một nhân vật.。
 */
export type CostumeTimeline = {
    /**
     * character_id: str = Field(..., description=ID ổn định của nhân vật)ID
     */
    character_id: string;
    /**
     * character_name: str = Field(..., description=Tên nhân vật)
     */
    character_name: string;
    /**
     * timeline_entries: List[CostumeTimelineEntry] = Field(default_factory=list, description=Mục trên trục thời gian)
     */
    timeline_entries?: Array<CostumeTimelineEntry>;
};

