/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Quan hệ ánh xạ ảnh sau khi render prompt khung hình chính.
 */
export type ShotFramePromptMappingRead = {
    /**
     * token giữ chỗ cho ảnh trong prompt, như 图1 / 图2
     */
    token: string;
    /**
     * Loại thực thể: character/prop/scene/costume
     */
    type: 'character' | 'prop' | 'scene' | 'costume';
    /**
     * thực thể ID( character_id/prop_id/scene_id/costume_id)
     */
    id: string;
    /**
     * Tên thực thể
     */
    name: string;
    /**
     * File ID dùng cho lần kết xuất và tạo này
     */
    file_id: string;
};

