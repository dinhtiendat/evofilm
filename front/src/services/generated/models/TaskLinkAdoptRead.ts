/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Kết quả cập nhật trạng thái chấp nhận.。
 */
export type TaskLinkAdoptRead = {
    task_id: string;
    /**
     * project | chapter | shot
     */
    link_type: string;
    /**
     * ID dự án/chương/phân cảnh
     */
    entity_id: string;
    /**
     * liệu đã áp dụng hay không (chỉ được đổi thuận chiều sang true)
     */
    is_adopted: boolean;
};

