/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShotPreparationMutationAction } from './ShotPreparationMutationAction';
import type { ShotPreparationStateRead } from './ShotPreparationStateRead';
/**
 * Phản hồi thống nhất sau khi thực thi lệnh của trang chuẩn bị.
 */
export type ShotPreparationMutationResultRead = {
    /**
     * Thao tác trang chuẩn bị được thực thi lần này
     */
    action: ShotPreparationMutationAction;
    /**
     * Trạng thái tổng hợp mới nhất của trang chuẩn bị sau khi thao tác hoàn tất
     */
    state: ShotPreparationStateRead;
};

