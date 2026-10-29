/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Thân trả về liên kết tác vụ tạo.。
 */
export type GenerationTaskLinkRead = {
    /**
     * task_id: str = Field(..., description=tác vụ tạo ID) ID
     */
    task_id: string;
    /**
     * Loại tài nguyên tạo (như image/video/text/task_link)
     */
    resource_type: string;
    /**
     * loại nghiệp vụ (như prop/costume/scene v.v.)
     */
    relation_type: string;
    /**
     * relation_entity_id: str = Field(..., description=thực thể liên kết ID) ID
     */
    relation_entity_id: string;
    /**
     * ID tệp sản phẩm liên kết (files.id; áp dụng cho ảnh/âm thanh/video)
     */
    file_id?: (string | null);
    /**
     * Trạng thái liên kết: accepted=đã dùng, todo=đang chờ thao tác, rejected=chưa dùng
     */
    status: string;
    /**
     * id: int = Field(..., description=ID hàng liên kết) ID
     */
    id: number;
};

