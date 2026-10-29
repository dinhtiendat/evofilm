/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_ShotDetailRead__ } from '../models/ApiResponse_PaginatedData_ShotDetailRead__';
import type { ApiResponse_ShotDetailRead_ } from '../models/ApiResponse_ShotDetailRead_';
import type { ShotDetailCreate } from '../models/ShotDetailCreate';
import type { ShotDetailUpdate } from '../models/ShotDetailUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioShotDetailsService {
    /**
     * Danh sách chi tiết phân cảnh (phân trang)
     * @returns ApiResponse_PaginatedData_ShotDetailRead__ Successful Response
     * @throws ApiError
     */
    public static listShotDetailsApiV1StudioShotDetailsGet({
        shotId,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * Lọc theo phân cảnh (id trùng shot_id)
         */
        shotId?: (string | null),
        order?: (string | null),
        isDesc?: boolean,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ShotDetailRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shot-details',
            query: {
                'shot_id': shotId,
                'order': order,
                'is_desc': isDesc,
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo chi tiết phân cảnh
     * @returns ApiResponse_ShotDetailRead_ Successful Response
     * @throws ApiError
     */
    public static createShotDetailApiV1StudioShotDetailsPost({
        requestBody,
    }: {
        requestBody: ShotDetailCreate,
    }): CancelablePromise<ApiResponse_ShotDetailRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/shot-details',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy chi tiết phân cảnh
     * @returns ApiResponse_ShotDetailRead_ Successful Response
     * @throws ApiError
     */
    public static getShotDetailApiV1StudioShotDetailsShotIdGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_ShotDetailRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shot-details/{shot_id}',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật chi tiết phân cảnh
     * @returns ApiResponse_ShotDetailRead_ Successful Response
     * @throws ApiError
     */
    public static updateShotDetailApiV1StudioShotDetailsShotIdPatch({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotDetailUpdate,
    }): CancelablePromise<ApiResponse_ShotDetailRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shot-details/{shot_id}',
            path: {
                'shot_id': shotId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa chi tiết phân cảnh
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteShotDetailApiV1StudioShotDetailsShotIdDelete({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/studio/shot-details/{shot_id}',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
