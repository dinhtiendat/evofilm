/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_dict_ } from '../models/ApiResponse_dict_';
import type { ApiResponse_FileDetailRead_ } from '../models/ApiResponse_FileDetailRead_';
import type { ApiResponse_FileRead_ } from '../models/ApiResponse_FileRead_';
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_FileRead__ } from '../models/ApiResponse_PaginatedData_FileRead__';
import type { Body_upload_file_api_api_v1_studio_files_upload_post } from '../models/Body_upload_file_api_api_v1_studio_files_upload_post';
import type { FileUpdate } from '../models/FileUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioFilesService {
    /**
     * Danh sách tệp (phân trang)
     * @returns ApiResponse_PaginatedData_FileRead__ Successful Response
     * @throws ApiError
     */
    public static listFilesApiApiV1StudioFilesGet({
        q,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
        projectId,
        chapterTitle,
        shotTitle,
    }: {
        /**
         * từ khóa, lọc name
         */
        q?: (string | null),
        order?: (string | null),
        isDesc?: boolean,
        page?: number,
        pageSize?: number,
        /**
         * Giới hạn dự án theo file_usages; khi truyền chỉ trả về tệp có bản ghi liên kết trong dự án đó
         */
        projectId?: (string | null),
        /**
         * Tiêu đề chương (khớp chính xác, dùng cùng project_id)
         */
        chapterTitle?: (string | null),
        /**
         * Tiêu đề phân cảnh (khớp chính xác, dùng cùng project_id)
         */
        shotTitle?: (string | null),
    }): CancelablePromise<ApiResponse_PaginatedData_FileRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/files',
            query: {
                'q': q,
                'order': order,
                'is_desc': isDesc,
                'page': page,
                'page_size': pageSize,
                'project_id': projectId,
                'chapter_title': chapterTitle,
                'shot_title': shotTitle,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tải tệp lên và tạo bản ghi FileItem
     * @returns ApiResponse_FileRead_ Successful Response
     * @throws ApiError
     */
    public static uploadFileApiApiV1StudioFilesUploadPost({
        formData,
        name,
    }: {
        formData: Body_upload_file_api_api_v1_studio_files_upload_post,
        name?: (string | null),
    }): CancelablePromise<ApiResponse_FileRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/files/upload',
            query: {
                'name': name,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Tải xuống nội dung nhị phân của tệp,
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadFileApiApiV1StudioFilesFileIdDownloadGet({
        fileId,
    }: {
        fileId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/files/{file_id}/download',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Lấy chi tiết object storage (head_object),（head_object）
     * @returns ApiResponse_dict_ Successful Response
     * @throws ApiError
     */
    public static getFileStorageInfoApiApiV1StudioFilesFileIdStorageInfoGet({
        fileId,
    }: {
        fileId: string,
    }): CancelablePromise<ApiResponse_dict_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/files/{file_id}/storage-info',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy chi tiết tệp (siêu dữ liệu + file_usages)
     * @returns ApiResponse_FileDetailRead_ Successful Response
     * @throws ApiError
     */
    public static getFileDetailApiV1StudioFilesFileIdGet({
        fileId,
    }: {
        fileId: string,
    }): CancelablePromise<ApiResponse_FileDetailRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Cập nhật siêu dữ liệu tệp,
     * @returns ApiResponse_FileRead_ Successful Response
     * @throws ApiError
     */
    public static updateFileMetaApiV1StudioFilesFileIdPatch({
        fileId,
        requestBody,
    }: {
        fileId: string,
        requestBody: FileUpdate,
    }): CancelablePromise<ApiResponse_FileRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa tệp (bản ghi + đối tượng lưu trữ)
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteFileApiApiV1StudioFilesFileIdDelete({
        fileId,
    }: {
        fileId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/studio/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
