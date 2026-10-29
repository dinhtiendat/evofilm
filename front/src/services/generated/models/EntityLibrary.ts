/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityEntry } from './EntityEntry';
/**
 * Thư viện thực thể đã gộp (trạng thái trung gian xử lý kịch bản).
 */
export type EntityLibrary = {
    /**
     * characters: List[EntityEntry] = Field(default_factory=list, description=Thư viện nhân vật)
     */
    characters?: Array<EntityEntry>;
    /**
     * locations: List[EntityEntry] = Field(default_factory=list, description=Thư viện địa điểm)
     */
    locations?: Array<EntityEntry>;
    /**
     * scenes: List[EntityEntry] = Field(default_factory=list, description=Thư viện bối cảnh)
     */
    scenes?: Array<EntityEntry>;
    /**
     * props: List[EntityEntry] = Field(default_factory=list, description=Thư viện đạo cụ)
     */
    props?: Array<EntityEntry>;
    /**
     * total_entries: int = Field(..., ge=0, description=Tổng số thực thể)
     */
    total_entries: number;
};

