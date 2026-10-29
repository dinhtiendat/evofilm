/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_ImageGenerationOptionsRead_ } from '../models/ApiResponse_ImageGenerationOptionsRead_';
import type { ApiResponse_list_ProviderSupportedRead__ } from '../models/ApiResponse_list_ProviderSupportedRead__';
import type { ApiResponse_ModelRead_ } from '../models/ApiResponse_ModelRead_';
import type { ApiResponse_ModelSettingsRead_ } from '../models/ApiResponse_ModelSettingsRead_';
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_ModelRead__ } from '../models/ApiResponse_PaginatedData_ModelRead__';
import type { ApiResponse_PaginatedData_ProviderRead__ } from '../models/ApiResponse_PaginatedData_ProviderRead__';
import type { ApiResponse_ProviderRead_ } from '../models/ApiResponse_ProviderRead_';
import type { ApiResponse_VideoGenerationOptionsRead_ } from '../models/ApiResponse_VideoGenerationOptionsRead_';
import type { ModelCategoryKey } from '../models/ModelCategoryKey';
import type { ModelCreate } from '../models/ModelCreate';
import type { ModelSettingsUpdate } from '../models/ModelSettingsUpdate';
import type { ModelUpdate } from '../models/ModelUpdate';
import type { ProviderCreate } from '../models/ProviderCreate';
import type { ProviderUpdate } from '../models/ProviderUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LlmService {
    /**
     * Liệt kê nhà cung cấp mô hình (phân trang)
     * @returns ApiResponse_PaginatedData_ProviderRead__ Successful Response
     * @throws ApiError
     */
    public static listProvidersApiV1LlmProvidersGet({
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
         * Trường sắp xếp: name, created_at, updated_at
         */
        order?: (string | null),
        /**
         * Sắp xếp giảm dần hay không
         */
        isDesc?: boolean,
        /**
         * Số trang
         */
        page?: number,
        /**
         * Số mục mỗi trang
         */
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ProviderRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/providers',
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
     * Tạo nhà cung cấp mô hình
     * @returns ApiResponse_ProviderRead_ Successful Response
     * @throws ApiError
     */
    public static createProviderApiV1LlmProvidersPost({
        requestBody,
    }: {
        requestBody: ProviderCreate,
    }): CancelablePromise<ApiResponse_ProviderRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/llm/providers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Liệt kê năng lực nhà cung cấp được hệ thống hỗ trợ
     * @returns ApiResponse_list_ProviderSupportedRead__ Successful Response
     * @throws ApiError
     */
    public static listSupportedProvidersApiV1LlmProvidersSupportedGet({
        category,
    }: {
        /**
         * Lọc theo hạng mục mô hình: text/image/video
         */
        category?: (ModelCategoryKey | null),
    }): CancelablePromise<ApiResponse_list_ProviderSupportedRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/providers/supported',
            query: {
                'category': category,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy tùy chọn quy cách khung hình chính của mô hình hình ảnh mặc định hiện tại
     * @returns ApiResponse_ImageGenerationOptionsRead_ Successful Response
     * @throws ApiError
     */
    public static getImageGenerationOptionsApiV1LlmImageGenerationOptionsGet(): CancelablePromise<ApiResponse_ImageGenerationOptionsRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/image-generation-options',
        });
    }
    /**
     * Lấy tùy chọn tỉ lệ động của mô hình video mặc định hiện tại
     * @returns ApiResponse_VideoGenerationOptionsRead_ Successful Response
     * @throws ApiError
     */
    public static getVideoGenerationOptionsApiV1LlmVideoGenerationOptionsGet(): CancelablePromise<ApiResponse_VideoGenerationOptionsRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/video-generation-options',
        });
    }
    /**
     * Lấy một nhà cung cấp mô hình
     * @returns ApiResponse_ProviderRead_ Successful Response
     * @throws ApiError
     */
    public static getProviderApiV1LlmProvidersProviderIdGet({
        providerId,
    }: {
        providerId: string,
    }): CancelablePromise<ApiResponse_ProviderRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/providers/{provider_id}',
            path: {
                'provider_id': providerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật nhà cung cấp mô hình
     * @returns ApiResponse_ProviderRead_ Successful Response
     * @throws ApiError
     */
    public static updateProviderApiV1LlmProvidersProviderIdPatch({
        providerId,
        requestBody,
    }: {
        providerId: string,
        requestBody: ProviderUpdate,
    }): CancelablePromise<ApiResponse_ProviderRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/llm/providers/{provider_id}',
            path: {
                'provider_id': providerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa nhà cung cấp mô hình
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteProviderApiV1LlmProvidersProviderIdDelete({
        providerId,
    }: {
        providerId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/llm/providers/{provider_id}',
            path: {
                'provider_id': providerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Liệt kê mô hình (phân trang)
     * @returns ApiResponse_PaginatedData_ModelRead__ Successful Response
     * @throws ApiError
     */
    public static listModelsApiV1LlmModelsGet({
        providerId,
        category,
        q,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * lọc theo nhà cung cấp
         */
        providerId?: (string | null),
        /**
         * Lọc theo hạng mục mô hình
         */
        category?: (ModelCategoryKey | null),
        /**
         * Từ khóa, lọc theo name/description
         */
        q?: (string | null),
        /**
         * Trường sắp xếp: name, category, created_at, updated_at
         */
        order?: (string | null),
        /**
         * Sắp xếp giảm dần hay không
         */
        isDesc?: boolean,
        /**
         * Số trang
         */
        page?: number,
        /**
         * Số mục mỗi trang
         */
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ModelRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/models',
            query: {
                'provider_id': providerId,
                'category': category,
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
     * Tạo mô hình
     * @returns ApiResponse_ModelRead_ Successful Response
     * @throws ApiError
     */
    public static createModelApiV1LlmModelsPost({
        requestBody,
    }: {
        requestBody: ModelCreate,
    }): CancelablePromise<ApiResponse_ModelRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/llm/models',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy một mô hình
     * @returns ApiResponse_ModelRead_ Successful Response
     * @throws ApiError
     */
    public static getModelApiV1LlmModelsModelIdGet({
        modelId,
    }: {
        modelId: string,
    }): CancelablePromise<ApiResponse_ModelRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/models/{model_id}',
            path: {
                'model_id': modelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật mô hình
     * @returns ApiResponse_ModelRead_ Successful Response
     * @throws ApiError
     */
    public static updateModelApiV1LlmModelsModelIdPatch({
        modelId,
        requestBody,
    }: {
        modelId: string,
        requestBody: ModelUpdate,
    }): CancelablePromise<ApiResponse_ModelRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/llm/models/{model_id}',
            path: {
                'model_id': modelId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Xóa mô hình
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteModelApiV1LlmModelsModelIdDelete({
        modelId,
    }: {
        modelId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/llm/models/{model_id}',
            path: {
                'model_id': modelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy cài đặt toàn cục của mô hình (đơn lệ)
     * @returns ApiResponse_ModelSettingsRead_ Successful Response
     * @throws ApiError
     */
    public static getModelSettingsApiV1LlmModelSettingsGet(): CancelablePromise<ApiResponse_ModelSettingsRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/llm/model-settings',
        });
    }
    /**
     * Cập nhật cài đặt toàn cục của mô hình (đơn lệ)
     * @returns ApiResponse_ModelSettingsRead_ Successful Response
     * @throws ApiError
     */
    public static updateModelSettingsApiV1LlmModelSettingsPut({
        requestBody,
    }: {
        requestBody: ModelSettingsUpdate,
    }): CancelablePromise<ApiResponse_ModelSettingsRead_> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/llm/model-settings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
