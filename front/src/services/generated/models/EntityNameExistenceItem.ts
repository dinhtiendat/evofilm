/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Kết quả tồn tại của một tên.
 */
export type EntityNameExistenceItem = {
    /**
     * tên đầu vào (trả nguyên như vậy)
     */
    name: string;
    /**
     * Có tồn tại trong cơ sở dữ liệu không (trùng khớp mơ hồ)
     */
    exists: boolean;
    /**
     * Đã liên kết tới dự án này chưa (đối với nhân vật tương đương với exists)
     */
    linked_to_project: boolean;
    /**
     * Có liên kết với shot trong yêu cầu không (false nếu chưa truyền shot_id)
     */
    linked_to_shot?: boolean;
    /**
     * ID tài nguyên khớp (ví dụ prop_id/scene_id/costume_id/character_id)
     */
    asset_id?: (string | null);
    /**
     * Nếu đã liên kết tới dự án, là id tương ứng của Project*Link; nếu không thì để trống
     */
    link_id?: (number | null);
};

