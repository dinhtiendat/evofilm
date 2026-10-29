/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotDivision } from './ShotDivision';
/**
 * Kết quả phân cảnh kịch bản: danh sách phân cảnh (số dòng bắt đầu/kết thúc mỗi cảnh + văn bản xem trước).
 */
export type ScriptDivisionResult = {
    /**
     * shots: List[ShotDivision] = Field(default_factory=list, description=Danh sách phân cảnh)
     */
    shots?: Array<ShotDivision>;
    /**
     * total_shots: int = Field(..., ge=0, description=Tổng số phân cảnh)
     */
    total_shots: number;
    /**
     * giải thích hoặc gợi ý tách (tùy chọn)
     */
    notes?: (string | null);
};

