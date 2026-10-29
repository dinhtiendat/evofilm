/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_RenderedPromptResponse_ } from '../models/ApiResponse_RenderedPromptResponse_';
import type { ApiResponse_RenderedShotFramePromptRead_ } from '../models/ApiResponse_RenderedShotFramePromptRead_';
import type { ApiResponse_TaskCreated_ } from '../models/ApiResponse_TaskCreated_';
import type { ShotFrameImageTaskRequest } from '../models/ShotFrameImageTaskRequest';
import type { ShotFramePromptRenderRequest } from '../models/ShotFramePromptRenderRequest';
import type { StudioImageTaskRequest } from '../models/StudioImageTaskRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioImageTasksService {
    /**
     * Tạo ảnh diễn viên (phiên bản tác vụ)
     * tạo tác vụ sinh ảnh cho diễn viên được chỉ định, và liên kết qua `GenerationTaskLink`.
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createActorImageGenerationTaskApiV1StudioImageTasksActorsActorIdImageTasksPost({
        actorId,
        requestBody,
    }: {
        actorId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/actors/{actor_id}/image-tasks',
            path: {
                'actor_id': actorId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Render prompt ảnh diễn viên,
     * @returns ApiResponse_RenderedPromptResponse_ Successful Response
     * @throws ApiError
     */
    public static renderActorImagePromptApiV1StudioImageTasksActorsActorIdRenderPromptPost({
        actorId,
        requestBody,
    }: {
        actorId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_RenderedPromptResponse_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/actors/{actor_id}/render-prompt',
            path: {
                'actor_id': actorId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo hình ảnh đạo cụ/bối cảnh/trang phục (phiên bản tác vụ)
     * Tạo tác vụ tạo ảnh cho đạo cụ/bối cảnh/trang phục.
     *
     * - asset_type: prop / scene / costume
     * - Tham số path asset_id là ID tài nguyên tương ứng
     * - body.image_id - body.image_id phải là ID của bản ghi tương ứng trong bảng hình ảnh dưới tài nguyên (PropImage/SceneImage/CostumeImage) ID（PropImage/SceneImage/CostumeImage）
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createAssetImageGenerationTaskApiV1StudioImageTasksAssetsAssetTypeAssetIdImageTasksPost({
        assetType,
        assetId,
        requestBody,
    }: {
        assetType: string,
        assetId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/assets/{asset_type}/{asset_id}/image-tasks',
            path: {
                'asset_type': assetType,
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Kết xuất prompt ảnh đạo cụ/bối cảnh/trang phục
     * @returns ApiResponse_RenderedPromptResponse_ Successful Response
     * @throws ApiError
     */
    public static renderAssetImagePromptApiV1StudioImageTasksAssetsAssetTypeAssetIdRenderPromptPost({
        assetType,
        assetId,
        requestBody,
    }: {
        assetType: string,
        assetId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_RenderedPromptResponse_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/assets/{asset_type}/{asset_id}/render-prompt',
            path: {
                'asset_type': assetType,
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo ảnh nhân vật (phiên bản tác vụ)
     * Tạo tác vụ tạo ảnh cho nhân vật (tương ứng nghiệp vụ CharacterImage)."
     *
     * - tham số path character_id là Character.id
     * - body.image_id - body.image_id phải là CharacterImage.id dưới nhân vật này CharacterImage.id
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createCharacterImageGenerationTaskApiV1StudioImageTasksCharactersCharacterIdImageTasksPost({
        characterId,
        requestBody,
    }: {
        characterId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/characters/{character_id}/image-tasks',
            path: {
                'character_id': characterId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Render prompt ảnh nhân vật,
     * @returns ApiResponse_RenderedPromptResponse_ Successful Response
     * @throws ApiError
     */
    public static renderCharacterImagePromptApiV1StudioImageTasksCharactersCharacterIdRenderPromptPost({
        characterId,
        requestBody,
    }: {
        characterId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_RenderedPromptResponse_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/characters/{character_id}/render-prompt',
            path: {
                'character_id': characterId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tạo ảnh khung phân cảnh của phân cảnh (phiên bản tác vụ)
     * Tạo tác vụ cho ảnh khung hình phân cảnh (tự định vị dữ liệu dựa trên `shot_id + frame_type`).
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createShotFrameImageGenerationTaskApiV1StudioImageTasksShotShotIdFrameImageTasksPost({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotFrameImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/shot/{shot_id}/frame-image-tasks',
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
     * summary=Render prompt khung hình phân cảnh,
     * @returns ApiResponse_RenderedShotFramePromptRead_ Successful Response
     * @throws ApiError
     */
    public static renderShotFramePromptApiV1StudioImageTasksShotShotIdFrameRenderPromptPost({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotFramePromptRenderRequest,
    }): CancelablePromise<ApiResponse_RenderedShotFramePromptRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/shot/{shot_id}/frame-render-prompt',
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
}
