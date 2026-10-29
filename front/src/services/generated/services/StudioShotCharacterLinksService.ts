/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_list_ShotCharacterLinkRead__ } from '../models/ApiResponse_list_ShotCharacterLinkRead__';
import type { ApiResponse_ShotCharacterLinkRead_ } from '../models/ApiResponse_ShotCharacterLinkRead_';
import type { ShotCharacterLinkCreate } from '../models/ShotCharacterLinkCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioShotCharacterLinksService {
    /**
     * Truy vấn danh sách liên kết nhân vật của phân cảnh (ShotCharacterLink)
     * @returns ApiResponse_list_ShotCharacterLinkRead__ Successful Response
     * @throws ApiError
     */
    public static listShotCharacterLinksApiV1StudioShotCharacterLinksGet({
        shotId,
    }: {
        /**
         * ID shot
         */
        shotId: string,
    }): CancelablePromise<ApiResponse_list_ShotCharacterLinkRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shot-character-links',
            query: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * tạo/cập nhật liên kết shot-nhân vật(ShotCharacterLink)
     * @returns ApiResponse_ShotCharacterLinkRead_ Successful Response
     * @throws ApiError
     */
    public static upsertShotCharacterLinkApiV1StudioShotCharacterLinksPost({
        requestBody,
    }: {
        requestBody: ShotCharacterLinkCreate,
    }): CancelablePromise<ApiResponse_ShotCharacterLinkRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/shot-character-links',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
