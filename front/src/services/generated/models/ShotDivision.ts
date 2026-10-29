/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Thông tin một phân cảnh trong kịch bản phân cảnh: số dòng + văn bản xem trước (ngữ nghĩa yếu tùy chọn).
 */
export type ShotDivision = {
    /**
     * Số thứ tự phân cảnh (duy nhất trong chương)
     */
    index: number;
    /**
     * start_line: int = Field(..., ge=1, description=số dòng bắt đầu (1-based))（1-based）
     */
    start_line: number;
    /**
     * end_line: int = Field(..., ge=1, description=số dòng kết thúc (1-based))（1-based）
     */
    end_line: number;
    /**
     * trích đoạn kịch bản/văn bản tương ứng với phân cảnh
     */
    script_excerpt: string;
    /**
     * Tên phân cảnh (tên phân cảnh / tiêu đề phân cảnh)
     */
    shot_name?: string;
    /**
     * Thời điểm trong ngày (ban ngày/ban đêm/không rõ..., tùy chọn)
     */
    time_of_day?: ('DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNKNOWN' | '日' | '夜' | '黎明' | '黄昏' | '不明' | '未知' | null);
};

