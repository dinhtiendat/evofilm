/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * bằng chứng truy vết được:định vị nguyên văn (chunk + vị trí bắt đầu/kết thúc/trích đoạn), dùng cho kiểm duyệt và tra lại.
 */
export type EvidenceSpan = {
    /**
     * ID duy nhất của khối văn bản đầu vào (ví dụ chapter1_p03)
     */
    chunk_id: string;
    /**
     * Vị trí ký tự bắt đầu trong chunk này (tùy chọn)
     */
    start_char?: (number | null);
    /**
     * Vị trí ký tự kết thúc trong chunk đó (tùy chọn)
     */
    end_char?: (number | null);
    /**
     * Trích dẫn nguyên văn không quá 200 chữ (tùy chọn, tiện cho kiểm tra thủ công)
     */
    quote?: (string | null);
};

