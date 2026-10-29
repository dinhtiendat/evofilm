/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityLibrary } from './EntityLibrary';
/**
 * Kết quả gộp thực thể (trạng thái trung gian xử lý kịch bản).
 */
export type EntityMergeResult = {
    /**
     * merged_library: EntityLibrary = Field(..., description=thư viện thực thể sau khi gộp)
     */
    merged_library: EntityLibrary;
    /**
     * merge_stats: Dict[str, Any] = Field(default_factory=dict, description=Thông tin thống kê gộp)
     */
    merge_stats?: Record<string, any>;
    /**
     * Xung đột/mục đang chờ xử lý đã phát hiện
     */
    conflicts?: Array<string>;
    /**
     * notes: Optional[str] = Field(None, description=Mô tả gộp)
     */
    notes?: (string | null);
};

