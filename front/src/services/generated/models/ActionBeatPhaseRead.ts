/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Kết quả suy luận giai đoạn nhẹ của mốc hành động.
 */
export type ActionBeatPhaseRead = {
    /**
     * nguyên văn mốc hành động
     */
    text: string;
    /**
     * Giai đoạn suy luận: kích hoạt / đỉnh / khép lại
     */
    phase: 'trigger' | 'peak' | 'aftermath';
};

