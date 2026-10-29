/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Yêu cầu phân cảnh kịch bản.。
 */
export type ScriptDividerRequest = {
    /**
     * script_text: str = Field(..., description=Văn bản kịch bản đầy đủ, min_length=1)
     */
    script_text: string;
    /**
     * Có ghi phân cảnh vào cơ sở dữ liệu (bảng shots của AI Studio) hay không
     */
    write_to_db?: boolean;
    /**
     * ID chương(bắt buộc khi write_to_db=true)
     */
    chapter_id?: (string | null);
};

