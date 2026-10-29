/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Kiểm tra hàng loạt tên tài nguyên trong dự án/toàn cục có tồn tại không (khớp mờ).
 */
export type EntityNameExistenceCheckRequest = {
    /**
     * ID dự án (bắt buộc)
     */
    project_id: string;
    /**
     * ID phân cảnh (tùy chọn; không truyền thì linked_to_shot luôn là false)
     */
    shot_id?: (string | null);
    /**
     * Danh sách tên nhân vật
     */
    character_names?: Array<string>;
    /**
     * Danh sách tên đạo cụ
     */
    prop_names?: Array<string>;
    /**
     * Danh sách tên bối cảnh
     */
    scene_names?: Array<string>;
    /**
     * Danh sách tên trang phục
     */
    costume_names?: Array<string>;
};

