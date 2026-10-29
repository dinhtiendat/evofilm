/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_ProjectRead__ } from '../models/ApiResponse_PaginatedData_ProjectRead__';
import type { ApiResponse_ProjectRead_ } from '../models/ApiResponse_ProjectRead_';
import type { ApiResponse_ProjectStyleOptionsRead_ } from '../models/ApiResponse_ProjectStyleOptionsRead_';
import type { ProjectCreate } from '../models/ProjectCreate';
import type { ProjectUpdate } from '../models/ProjectUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioProjectsService {
    /**
     * Lấy ứng viên phong cách của dự án
     * @returns ApiResponse_ProjectStyleOptionsRead_ Successful Response
     * @throws ApiError
     */
    public static getProjectStyleOptionsApiV1StudioProjectsStyleOptionsGet(): CancelablePromise<ApiResponse_ProjectStyleOptionsRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/projects/style-options',
        });
    }
    /**
     * Danh sách dự án (phân trang)
     * @returns ApiResponse_PaginatedData_ProjectRead__ Successful Response
     * @throws ApiError
     */
    public static listProjectsApiV1StudioProjectsGet({
        q,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * Từ khóa, lọc theo name/description
         */
        q?: (string | null),
        /**
         * Trường sắp xếp
         */
        order?: (string | null),
        /**
         * Sắp xếp giảm dần hay không
         */
        isDesc?: boolean,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ProjectRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/projects',
            query: {
                'q': q,
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
     * Tạo dự án
     * @returns ApiResponse_ProjectRead_ Successful Response
     * @throws ApiError
     */
    public static createProjectApiV1StudioProjectsPost({
        requestBody,
    }: {
        requestBody: ProjectCreate,
    }): CancelablePromise<ApiResponse_ProjectRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/projects',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy dự án
     * @returns ApiResponse_ProjectRead_ Successful Response
     * @throws ApiError
     */
    public static getProjectApiV1StudioProjectsProjectIdGet({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ApiResponse_ProjectRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/projects/{project_id}',
            path: {
                'project_id': projectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật dự án
     * @returns ApiResponse_ProjectRead_ Successful Response
     * @throws ApiError
     */
    public static updateProjectApiV1StudioProjectsProjectIdPatch({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: ProjectUpdate,
    }): CancelablePromise<ApiResponse_ProjectRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/projects/{project_id}',
            path: {
                'project_id': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa dự án
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteProjectApiV1StudioProjectsProjectIdDelete({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/studio/projects/{project_id}',
            path: {
                'project_id': projectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
