/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidenceSpan } from './EvidenceSpan';
/**
 * vấn đề nhất quán loại nhầm lẫn nhân vật:cùng một nhân vật ở các shot khác nhau được gán thân phận/chủ thể hành động khác nhau gây nhầm lẫn.
 */
export type ScriptConsistencyIssue = {
    /**
     * issue_type: Literal[character_confusion] = Field(character_confusion, description=Cố định là vấn đề nhầm lẫn nhân vật)
     */
    issue_type?: string;
    /**
     * Ứng viên nhân vật liên quan (tên / cách gọi / ID đều được, ưu tiên dùng cách gọi trong văn bản gốc)
     */
    character_candidates?: Array<string>;
    /**
     * Mô tả vấn đề (tại sao bị nhầm lẫn)
     */
    description: string;
    /**
     * Gợi ý sửa đổi (viết lại như thế nào để loại bỏ nhầm lẫn)
     */
    suggestion: string;
    /**
     * Khoảng số dòng bị ảnh hưởng, dạng {start_line: x, end_line: y}
     */
    affected_lines?: (Record<string, number> | null);
    /**
     * Bằng chứng từ nguyên văn (tùy chọn)
     */
    evidence?: Array<EvidenceSpan>;
};

