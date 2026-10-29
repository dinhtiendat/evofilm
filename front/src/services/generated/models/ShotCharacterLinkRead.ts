/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ShotCharacterLinkRead = {
    /**
     * ID hàng liên kết
     */
    id: number;
    /**
     * ID phân cảnh
     */
    shot_id: string;
    /**
     * Nhân vật ID
     */
    character_id: string;
    /**
     * thứ tự nhân vật trong shot
     */
    index?: number;
    /**
     * Ghi chú
     */
    note?: string;
};

