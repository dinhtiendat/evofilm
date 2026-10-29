/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_ChapterRead_ } from '../models/ApiResponse_ChapterRead_';
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_ChapterRead__ } from '../models/ApiResponse_PaginatedData_ChapterRead__';
import type { ChapterCreate } from '../models/ChapterCreate';
import type { ChapterUpdate } from '../models/ChapterUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioChaptersService {
    /**
     * Danh sách chương (phân trang)
     * @returns ApiResponse_PaginatedData_ChapterRead__ Successful Response
     * @throws ApiError
     */
    public static listChaptersApiV1StudioChaptersGet({
        projectId,
        q,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * Lọc theo dự án
         */
        projectId?: (string | null),
        /**
         * từ khóa, lọc title/summary
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
    }): CancelablePromise<ApiResponse_PaginatedData_ChapterRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/chapters',
            query: {
                'project_id': projectId,
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
     * Tạo chương
     * @returns ApiResponse_ChapterRead_ Successful Response
     * @throws ApiError
     */
    public static createChapterApiV1StudioChaptersPost({
        requestBody,
    }: {
        requestBody: ChapterCreate,
    }): CancelablePromise<ApiResponse_ChapterRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/chapters',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy chương
     * @returns ApiResponse_ChapterRead_ Successful Response
     * @throws ApiError
     */
    public static getChapterApiV1StudioChaptersChapterIdGet({
        chapterId,
    }: {
        chapterId: string,
    }): CancelablePromise<ApiResponse_ChapterRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/chapters/{chapter_id}',
            path: {
                'chapter_id': chapterId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật chương
     * @returns ApiResponse_ChapterRead_ Successful Response
     * @throws ApiError
     */
    public static updateChapterApiV1StudioChaptersChapterIdPatch({
        chapterId,
        requestBody,
    }: {
        chapterId: string,
        requestBody: ChapterUpdate,
    }): CancelablePromise<ApiResponse_ChapterRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/chapters/{chapter_id}',
            path: {
                'chapter_id': chapterId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa chương
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteChapterApiV1StudioChaptersChapterIdDelete({
        chapterId,
    }: {
        chapterId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/studio/chapters/{chapter_id}',
            path: {
                'chapter_id': chapterId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
