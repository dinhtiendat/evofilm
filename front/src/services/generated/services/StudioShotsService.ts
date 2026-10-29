/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_list_ShotExtractedCandidateRead__ } from '../models/ApiResponse_list_ShotExtractedCandidateRead__';
import type { ApiResponse_list_ShotExtractedDialogueCandidateRead__ } from '../models/ApiResponse_list_ShotExtractedDialogueCandidateRead__';
import type { ApiResponse_list_ShotRuntimeSummaryRead__ } from '../models/ApiResponse_list_ShotRuntimeSummaryRead__';
import type { ApiResponse_NoneType_ } from '../models/ApiResponse_NoneType_';
import type { ApiResponse_PaginatedData_ShotLinkedAssetItem__ } from '../models/ApiResponse_PaginatedData_ShotLinkedAssetItem__';
import type { ApiResponse_PaginatedData_ShotRead__ } from '../models/ApiResponse_PaginatedData_ShotRead__';
import type { ApiResponse_ShotAssetsOverviewRead_ } from '../models/ApiResponse_ShotAssetsOverviewRead_';
import type { ApiResponse_ShotPreparationMutationResultRead_ } from '../models/ApiResponse_ShotPreparationMutationResultRead_';
import type { ApiResponse_ShotPreparationStateRead_ } from '../models/ApiResponse_ShotPreparationStateRead_';
import type { ApiResponse_ShotRead_ } from '../models/ApiResponse_ShotRead_';
import type { ApiResponse_ShotVideoPromptPreviewRead_ } from '../models/ApiResponse_ShotVideoPromptPreviewRead_';
import type { ApiResponse_ShotVideoReadinessRead_ } from '../models/ApiResponse_ShotVideoReadinessRead_';
import type { ApiResponse_StudioScriptExtractionDraft_ } from '../models/ApiResponse_StudioScriptExtractionDraft_';
import type { ShotCreate } from '../models/ShotCreate';
import type { ShotExtractedCandidateLinkRequest } from '../models/ShotExtractedCandidateLinkRequest';
import type { ShotExtractedDialogueCandidateAcceptRequest } from '../models/ShotExtractedDialogueCandidateAcceptRequest';
import type { ShotPreparationLinkRequest } from '../models/ShotPreparationLinkRequest';
import type { ShotSkipExtractionUpdate } from '../models/ShotSkipExtractionUpdate';
import type { ShotUpdate } from '../models/ShotUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioShotsService {
    /**
     * Danh sách phân cảnh (phân trang)
     * @returns ApiResponse_PaginatedData_ShotRead__ Successful Response
     * @throws ApiError
     */
    public static listShotsApiV1StudioShotsGet({
        chapterId,
        q,
        order,
        isDesc = false,
        page = 1,
        pageSize = 10,
    }: {
        /**
         * Lọc theo chương
         */
        chapterId?: (string | null),
        /**
         * Từ khóa, lọc title/script_excerpt
         */
        q?: (string | null),
        order?: (string | null),
        isDesc?: boolean,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ShotRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots',
            query: {
                'chapter_id': chapterId,
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
     * Tạo phân cảnh
     * @returns ApiResponse_ShotRead_ Successful Response
     * @throws ApiError
     */
    public static createShotApiV1StudioShotsPost({
        requestBody,
    }: {
        requestBody: ShotCreate,
    }): CancelablePromise<ApiResponse_ShotRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/shots',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy tóm tắt trạng thái tác vụ runtime của phân cảnh theo chương
     * @returns ApiResponse_list_ShotRuntimeSummaryRead__ Successful Response
     * @throws ApiError
     */
    public static listShotRuntimeSummaryApiV1StudioShotsRuntimeSummaryGet({
        chapterId,
    }: {
        /**
         * ID chương
         */
        chapterId: string,
    }): CancelablePromise<ApiResponse_list_ShotRuntimeSummaryRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/runtime-summary',
            query: {
                'chapter_id': chapterId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Chi tiết phân cảnh: lắp ráp StudioScriptExtractionDraft theo phân cảnh liên kết
     * @returns ApiResponse_StudioScriptExtractionDraft_ Successful Response
     * @throws ApiError
     */
    public static getShotExtractionDraftApiV1StudioShotsShotIdExtractionDraftGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_StudioScriptExtractionDraft_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/extraction-draft',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy ứng viên trích xuất của phân cảnh
     * @returns ApiResponse_list_ShotExtractedCandidateRead__ Successful Response
     * @throws ApiError
     */
    public static getShotExtractedCandidatesApiV1StudioShotsShotIdExtractedCandidatesGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_list_ShotExtractedCandidateRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/extracted-candidates',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy ứng viên thoại trích xuất của phân cảnh
     * @returns ApiResponse_list_ShotExtractedDialogueCandidateRead__ Successful Response
     * @throws ApiError
     */
    public static getShotExtractedDialogueCandidatesApiV1StudioShotsShotIdExtractedDialogueCandidatesGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_list_ShotExtractedDialogueCandidateRead__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/extracted-dialogue-candidates',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy tổng quan tài nguyên của phân cảnh (tài nguyên đã liên kết + ứng viên trích xuất)
     * @returns ApiResponse_ShotAssetsOverviewRead_ Successful Response
     * @throws ApiError
     */
    public static getShotAssetsOverviewApiApiV1StudioShotsShotIdAssetsOverviewGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_ShotAssetsOverviewRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/assets-overview',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy trạng thái tổng hợp trang chuẩn bị của phân cảnh
     * @returns ApiResponse_ShotPreparationStateRead_ Successful Response
     * @throws ApiError
     */
    public static getShotPreparationStateApiApiV1StudioShotsShotIdPreparationStateGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_ShotPreparationStateRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/preparation-state',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Trang chuẩn bị liên kết thực thể có sẵn và trả về trạng thái tổng hợp mới nhất
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static linkExistingAssetForPreparationApiApiV1StudioShotsShotIdPreparationLinkPost({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotPreparationLinkRequest,
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/shots/{shot_id}/preparation-link',
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
     * Xem trước prompt video phân cảnh
     * @returns ApiResponse_ShotVideoPromptPreviewRead_ Successful Response
     * @throws ApiError
     */
    public static previewShotVideoPromptApiV1StudioShotsShotIdVideoPromptPreviewGet({
        shotId,
        templateId,
    }: {
        shotId: string,
        /**
         * Chỉ định ID mẫu prompt video; không truyền thì dùng mẫu mặc định
         */
        templateId?: (string | null),
    }): CancelablePromise<ApiResponse_ShotVideoPromptPreviewRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/video-prompt-preview',
            path: {
                'shot_id': shotId,
            },
            query: {
                'template_id': templateId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy độ sẵn sàng tạo video của phân cảnh
     * @returns ApiResponse_ShotVideoReadinessRead_ Successful Response
     * @throws ApiError
     */
    public static getShotVideoReadinessApiApiV1StudioShotsShotIdVideoReadinessGet({
        shotId,
        referenceMode = 'text_only',
    }: {
        shotId: string,
        /**
         * Chế độ tham chiếu: first/last/key/first_last/first_last_key/text_only
         */
        referenceMode?: string,
    }): CancelablePromise<ApiResponse_ShotVideoReadinessRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/video-readiness',
            path: {
                'shot_id': shotId,
            },
            query: {
                'reference_mode': referenceMode,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Đặt có bỏ qua trích xuất thông tin phân cảnh hay không
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static updateShotSkipExtractionApiV1StudioShotsShotIdSkipExtractionPatch({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotSkipExtractionUpdate,
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/{shot_id}/skip-extraction',
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
     * Xác nhận và liên kết ứng viên trích xuất của phân cảnh
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static linkExtractedCandidateApiV1StudioShotsExtractedCandidatesCandidateIdLinkPatch({
        candidateId,
        requestBody,
    }: {
        candidateId: number,
        requestBody: ShotExtractedCandidateLinkRequest,
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/extracted-candidates/{candidate_id}/link',
            path: {
                'candidate_id': candidateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bỏ qua ứng viên trích xuất của phân cảnh
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static ignoreExtractedCandidateApiV1StudioShotsExtractedCandidatesCandidateIdIgnorePatch({
        candidateId,
    }: {
        candidateId: number,
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/extracted-candidates/{candidate_id}/ignore',
            path: {
                'candidate_id': candidateId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Chấp nhận ứng viên thoại trích xuất của phân cảnh
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static acceptExtractedDialogueCandidateApiV1StudioShotsExtractedDialogueCandidatesCandidateIdAcceptPatch({
        candidateId,
        requestBody,
    }: {
        candidateId: number,
        requestBody?: (ShotExtractedDialogueCandidateAcceptRequest | null),
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/accept',
            path: {
                'candidate_id': candidateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bỏ qua ứng viên thoại trích xuất của phân cảnh
     * @returns ApiResponse_ShotPreparationMutationResultRead_ Successful Response
     * @throws ApiError
     */
    public static ignoreExtractedDialogueCandidateApiV1StudioShotsExtractedDialogueCandidatesCandidateIdIgnorePatch({
        candidateId,
    }: {
        candidateId: number,
    }): CancelablePromise<ApiResponse_ShotPreparationMutationResultRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/extracted-dialogue-candidates/{candidate_id}/ignore',
            path: {
                'candidate_id': candidateId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy phân cảnh
     * @returns ApiResponse_ShotRead_ Successful Response
     * @throws ApiError
     */
    public static getShotApiV1StudioShotsShotIdGet({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_ShotRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cập nhật phân cảnh
     * @returns ApiResponse_ShotRead_ Successful Response
     * @throws ApiError
     */
    public static updateShotApiV1StudioShotsShotIdPatch({
        shotId,
        requestBody,
    }: {
        shotId: string,
        requestBody: ShotUpdate,
    }): CancelablePromise<ApiResponse_ShotRead_> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/studio/shots/{shot_id}',
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
     * Xóa phân cảnh
     * @returns ApiResponse_NoneType_ Successful Response
     * @throws ApiError
     */
    public static deleteShotApiV1StudioShotsShotIdDelete({
        shotId,
    }: {
        shotId: string,
    }): CancelablePromise<ApiResponse_NoneType_> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/studio/shots/{shot_id}',
            path: {
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Lấy nhân vật/đạo cụ/bối cảnh/trang phục liên kết với phân cảnh (phân trang)
     * @returns ApiResponse_PaginatedData_ShotLinkedAssetItem__ Successful Response
     * @throws ApiError
     */
    public static listShotLinkedAssetsApiV1StudioShotsShotIdLinkedAssetsGet({
        shotId,
        page = 1,
        pageSize = 10,
    }: {
        shotId: string,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<ApiResponse_PaginatedData_ShotLinkedAssetItem__> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/shots/{shot_id}/linked-assets',
            path: {
                'shot_id': shotId,
            },
            query: {
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
