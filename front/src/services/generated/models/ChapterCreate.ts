/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChapterStatus } from './ChapterStatus';
export type ChapterCreate = {
    /**
     * project_id: str = Field(..., description=dự án thuộc ID) ID
     */
    project_id: string;
    /**
     * Thứ tự của chương (duy nhất trong dự án)
     */
    index: number;
    /**
     * title: str = Field(..., description=tiêu đề chương)
     */
    title: string;
    /**
     * summary: str = Field(, description=tóm tắt chương)
     */
    summary?: string;
    /**
     * raw_text: str = Field(, description=nguyên văn chương)
     */
    raw_text?: string;
    /**
     * condensed_text: str = Field(, description=Bản nguyên văn rút gọn)
     */
    condensed_text?: string;
    /**
     * storyboard_count: int = Field(0, description=Số phân cảnh)
     */
    storyboard_count?: number;
    /**
     * status: ChapterStatus = Field(ChapterStatus.draft, description=Trạng thái chương)
     */
    status?: ChapterStatus;
    /**
     * id: str = Field(..., description=ID chương) ID
     */
    id: string;
};

