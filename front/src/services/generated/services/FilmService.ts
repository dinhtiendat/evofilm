/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_GenerationTaskLinkRead_ } from '../models/ApiResponse_GenerationTaskLinkRead_';
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_GenerationTaskLinkRead__ } from '../models/ApiResponse_PaginatedData_GenerationTaskLinkRead__';
import type { ApiResponse_PaginatedData_TaskListItemRead__ } from '../models/ApiResponse_PaginatedData_TaskListItemRead__';
import type { ApiResponse_TaskCancelRead_ } from '../models/ApiResponse_TaskCancelRead_';
import type { ApiResponse_TaskCreated_ } from '../models/ApiResponse_TaskCreated_';
import type { ApiResponse_TaskLinkAdoptRead_ } from '../models/ApiResponse_TaskLinkAdoptRead_';
import type { ApiResponse_TaskResultRead_ } from '../models/ApiResponse_TaskResultRead_';
import type { ApiResponse_TaskStatusRead_ } from '../models/ApiResponse_TaskStatusRead_';
import type { ApiResponse_VideoPromptPreviewResponse_ } from '../models/ApiResponse_VideoPromptPreviewResponse_';
import type { GenerationTaskLinkCreate } from '../models/GenerationTaskLinkCreate';
import type { GenerationTaskLinkUpdate } from '../models/GenerationTaskLinkUpdate';
import type { ShotFramePromptRequest } from '../models/ShotFramePromptRequest';
import type { TaskCancelRequest } from '../models/TaskCancelRequest';
import type { TaskLinkAdoptRequest } from '../models/TaskLinkAdoptRequest';
import type { TaskStatus } from '../models/TaskStatus';
import type { VideoGenerationTaskRequest } from '../models/VideoGenerationTaskRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FilmService {
    /**
     * Xem trước prompt video
     * Xem trước prompt tạo video và tự động liên kết ảnh tham chiếu.
     * @returns ApiResponse_VideoPromptPreviewResponse_ Successful Response
     * @throws ApiError
     */
    public static previewVideoGenerationPromptApiV1FilmTasksVideoPreviewPromptPost({
        requestBody,
    }: {
        requestBody: VideoGenerationTaskRequest,
    }): CancelablePromise<ApiResponse_VideoPromptPreviewResponse_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/film/tasks/video/preview-prompt',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo video (phiên bản tác vụ)
     * Tạo tác vụ tạo video và thực thi ở nền, kết quả nhận qua /tasks/{task_id}/result.
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createVideoGenerationTaskApiV1FilmTasksVideoPost({
        requestBody,
    }: {
        requestBody: VideoGenerationTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/film/tasks/video',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo prompt khung phân cảnh của phân cảnh (phiên bản tác vụ)
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createShotFramePromptTaskApiV1FilmTasksShotFramePromptsPost({
        requestBody,
    }: {
        requestBody: ShotFramePromptRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/film/tasks/shot-frame-prompts',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Danh sách tác vụ toàn cục (trung tâm tác vụ)
     * @returns ApiResponse_PaginatedData_TaskListItemRead__ Successful Response
     * @throws ApiError
     */
    public static listTasksApiV1FilmTasksGet({
        statuses,
        taskKind,
        relationType,
        relationEntityId,
        recentSeconds = 300,
        page = 1,
        pageSize = 20,
    }: {
        /**
         * Lọc theo trạng thái tác vụ, được chọn nhiều
         */
        statuses?: (Array<TaskStatus> | null),
        /**
         * lọc theo task_kind
         */
        taskKind?: (string | null),
        /**
         * theo relation_type lọc
         */
        relationType?: (string | null),
        /**
         * theo relation_entity_id lọc
         */
        relationEntityId?: (string | null),
        /**
         * Cửa sổ thời gian (giây) mặc định trả về các tác vụ vừa kết thúc gần nhất
         */
        recentSeconds?: number,
        /**
         * page: int = Query(1, ge=1, description=Số trang),
         */
        page?: number,
        /**
         * page_size: int = Query(20, ge=1, le=100, description=số dòng mỗi trang),
         */
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_TaskListItemRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/film/tasks',
            query: {
                'statuses': statuses,
                'task_kind': taskKind,
                'relation_type': relationType,
                'relation_entity_id': relationEntityId,
                'recent_seconds': recentSeconds,
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Truy vấn trạng thái/tiến độ tác vụ (truy vấn lặp)
     * @returns ApiResponse_TaskStatusRead_ Successful Response
     * @throws ApiError
     */
    public static getTaskStatusApiV1FilmTasksTaskIdStatusGet({
        taskId,
    }: {
        taskId: string,
    }): CancelablePromise<ApiResponse_TaskStatusRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/film/tasks/{task_id}/status',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Lấy kết quả tác vụ,
     * @returns ApiResponse_TaskResultRead_ Successful Response
     * @throws ApiError
     */
    public static getTaskResultApiV1FilmTasksTaskIdResultGet({
        taskId,
    }: {
        taskId: string,
    }): CancelablePromise<ApiResponse_TaskResultRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/film/tasks/{task_id}/result',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Yêu cầu hủy tác vụ,
     * @returns ApiResponse_TaskCancelRead_ Successful Response
     * @throws ApiError
     */
    public static cancelTaskApiV1FilmTasksTaskIdCancelPost({
        taskId,
        requestBody,
    }: {
        taskId: string,
        requestBody: TaskCancelRequest,
    }): CancelablePromise<ApiResponse_TaskCancelRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/film/tasks/{task_id}/cancel',
            path: {
                'task_id': taskId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật trạng thái áp dụng liên quan tác vụ (chỉ cho phép chuyển theo chiều tiến)
     * đặt trạng thái liên kết tác vụ được chỉ định thành accepted；đã áp dụng thì không đổi lại chưa áp dụng.
     * @returns ApiResponse_TaskLinkAdoptRead_ Successful Response
     * @throws ApiError
     */
    public static adoptTaskLinkApiV1FilmTaskLinksAdoptPatch({
        requestBody,
    }: {
        requestBody: TaskLinkAdoptRequest,
    }): CancelablePromise<ApiResponse_TaskLinkAdoptRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/film/task-links/adopt',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Danh sách liên kết tác vụ tạo (phân trang, hỗ trợ lọc đa điều kiện)
     * @returns ApiResponse_PaginatedData_GenerationTaskLinkRead__ Successful Response
     * @throws ApiError
     */
    public static listTaskLinksApiV1FilmTaskLinksGet({
        resourceType,
        relationType,
        relationEntityId,
        status,
        taskId,
        order,
        isDesc = true,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * Lọc theo resource_type
         */
        resourceType?: (string | null),
        /**
         * theo relation_type lọc
         */
        relationType?: (string | null),
        /**
         * theo relation_entity_id lọc
         */
        relationEntityId?: (string | null),
        /**
         * status: str | None = Query(None, description=Lọc theo trạng thái liên kết (accepted/todo/rejected)),（accepted/todo/rejected）
         */
        status?: (string | null),
        /**
         * lọc theo task_id
         */
        taskId?: (string | null),
        /**
         * order: str | None = Query(None, description=Trường sắp xếp: updated_at/created_at/id/status),：updated_at/created_at/id/status
         */
        order?: (string | null),
        /**
         * Có sắp giảm dần; mặc định true
         */
        isDesc?: boolean,
        /**
         * page: int = Query(1, ge=1, description=Số trang),
         */
        page?: number,
        /**
         * page_size: int = Query(10, ge=1, le=100, description=số dòng mỗi trang),
         */
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_GenerationTaskLinkRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/film/task-links',
            query: {
                'resource_type': resourceType,
                'relation_type': relationType,
                'relation_entity_id': relationEntityId,
                'status': status,
                'task_id': taskId,
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
     * summary=Tạo liên kết tác vụ tạo,
     * @returns ApiResponse_GenerationTaskLinkRead_ Successful Response
     * @throws ApiError
     */
    public static createTaskLinkApiV1FilmTaskLinksPost({
        requestBody,
    }: {
        requestBody: GenerationTaskLinkCreate,
    }): CancelablePromise<ApiResponse_GenerationTaskLinkRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/film/task-links',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Lấy chi tiết liên kết tác vụ tạo,
     * @returns ApiResponse_GenerationTaskLinkRead_ Successful Response
     * @throws ApiError
     */
    public static getTaskLinkApiV1FilmTaskLinksLinkIdGet({
        linkId,
    }: {
        linkId: number,
    }): CancelablePromise<ApiResponse_GenerationTaskLinkRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/film/task-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật liên kết của tác vụ tạo (không hỗ trợ sửa trực tiếp is_adopted)
     * @returns ApiResponse_GenerationTaskLinkRead_ Successful Response
     * @throws ApiError
     */
    public static updateTaskLinkApiV1FilmTaskLinksLinkIdPatch({
        linkId,
        requestBody,
    }: {
        linkId: number,
        requestBody: GenerationTaskLinkUpdate,
    }): CancelablePromise<ApiResponse_GenerationTaskLinkRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/film/task-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Xóa liên kết tác vụ tạo,
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteTaskLinkApiV1FilmTaskLinksLinkIdDelete({
        linkId,
    }: {
        linkId: number,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/film/task-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
