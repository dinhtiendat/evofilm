/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotPreparationLinkEntityType } from './ShotPreparationLinkEntityType';
export type ShotPreparationLinkRequest = {
    /**
     * ID dự án
     */
    project_id: string;
    /**
     * ID chương
     */
    chapter_id: string;
    /**
     * Loại thực thể liên kết của trang chuẩn bị
     */
    entity_type: ShotPreparationLinkEntityType;
    /**
     * ID thực thể cần liên kết
     */
    linked_entity_id: string;
};

