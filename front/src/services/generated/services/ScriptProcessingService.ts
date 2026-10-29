/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_AsyncTaskCreateRead_ } from '../models/ApiResponse_AsyncTaskCreateRead_';
import type { ApiResponse_CharacterPortraitAnalysisResult_ } from '../models/ApiResponse_CharacterPortraitAnalysisResult_';
import type { ApiResponse_CostumeInfoAnalysisResult_ } from '../models/ApiResponse_CostumeInfoAnalysisResult_';
import type { ApiResponse_EntityMergeResult_ } from '../models/ApiResponse_EntityMergeResult_';
import type { ApiResponse_PropInfoAnalysisResult_ } from '../models/ApiResponse_PropInfoAnalysisResult_';
import type { ApiResponse_SceneInfoAnalysisResult_ } from '../models/ApiResponse_SceneInfoAnalysisResult_';
import type { ApiResponse_ScriptConsistencyCheckResult_ } from '../models/ApiResponse_ScriptConsistencyCheckResult_';
import type { ApiResponse_ScriptDivisionResult_ } from '../models/ApiResponse_ScriptDivisionResult_';
import type { ApiResponse_ScriptOptimizationResult_ } from '../models/ApiResponse_ScriptOptimizationResult_';
import type { ApiResponse_ScriptSimplificationResult_ } from '../models/ApiResponse_ScriptSimplificationResult_';
import type { ApiResponse_StudioScriptExtractionDraft_ } from '../models/ApiResponse_StudioScriptExtractionDraft_';
import type { ApiResponse_VariantAnalysisResult_ } from '../models/ApiResponse_VariantAnalysisResult_';
import type { CharacterPortraitAnalysisRequest } from '../models/CharacterPortraitAnalysisRequest';
import type { CostumeInfoAnalysisRequest } from '../models/CostumeInfoAnalysisRequest';
import type { EntityMergerRequest } from '../models/EntityMergerRequest';
import type { PropInfoAnalysisRequest } from '../models/PropInfoAnalysisRequest';
import type { SceneInfoAnalysisRequest } from '../models/SceneInfoAnalysisRequest';
import type { ScriptConsistencyCheckRequest } from '../models/ScriptConsistencyCheckRequest';
import type { ScriptDividerRequest } from '../models/ScriptDividerRequest';
import type { ScriptExtractRequest } from '../models/ScriptExtractRequest';
import type { ScriptOptimizeRequest } from '../models/ScriptOptimizeRequest';
import type { ScriptSimplifyRequest } from '../models/ScriptSimplifyRequest';
import type { VariantAnalysisRequest } from '../models/VariantAnalysisRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ScriptProcessingService {
    /**
     * summary=Không đồng bộ tách kịch bản thành nhiều phân cảnh,
     * Tạo tác vụ trích xuất phân cảnh chương và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static divideScriptAsyncApiV1ScriptProcessingDivideAsyncPost({
        requestBody,
    }: {
        requestBody: ScriptDividerRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/divide-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Tách kịch bản thành nhiều phân cảnh
     * Nhập toàn bộ văn bản kịch bản, xuất danh sách phân cảnh (index/start_line/end_line/script_excerpt/shot_name/time_of_day).Lưu ý: giai đoạn này không ép ID ổn định, nhân vật xuất dưới dạng thông tin yếu (cách gọi/tên), ID ổn định được phân bổ thống nhất ở giai đoạn ghép.API đồng bộ hiện tại chủ yếu dùng để tương thích gọi cũ và điều phối; luồng chính của trang ưu tiên dùng divide-async.
     * @returns ApiResponse_ScriptDivisionResult_ Successful Response
     * @throws ApiError
     */
    public static divideScriptApiV1ScriptProcessingDividePost({
        requestBody,
    }: {
        requestBody: ScriptDividerRequest,
    }): CancelablePromise<ApiResponse_ScriptDivisionResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/divide',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Không đồng bộ gộp thông tin thực thể của nhiều phân cảnh
     * Tạo tác vụ gộp thực thể và trả về task_id ngay; hiện giữ làm năng lực dự bị, chưa có entry frontend thực nào.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static mergeEntitiesAsyncApiV1ScriptProcessingMergeEntitiesAsyncPost({
        requestBody,
    }: {
        requestBody: EntityMergerRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/merge-entities-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Gộp thông tin thực thể của nhiều phân cảnh,
     * Nhập toàn bộ kết quả trích xuất phân cảnh (có thể kèm phân cảnh kịch bản và kho thực thể lịch sử), xuất kho thực thể đã gộp:Kho nhân vật/kho địa điểm/kho bối cảnh/kho đạo cụ (hồ sơ tĩnh + danh sách biến thể).Bước này sẽ gán ID ổn định thống nhất (như char_001/loc_001/prop_001/scene_001).Khi được cung cấp previous_merge và conflict_resolutions, sẽ thực hiện gộp lại khi thử lại xung đột, ưu tiên giải tỏa conflicts và giữ ID ổn định chừng nào có thể.Giao diện hiện tại được giữ làm năng lực dự bị, chưa có lối vào phía trước thực tế.
     * @returns ApiResponse_EntityMergeResult_ Successful Response
     * @throws ApiError
     */
    public static mergeEntitiesApiV1ScriptProcessingMergeEntitiesPost({
        requestBody,
    }: {
        requestBody: EntityMergerRequest,
    }): CancelablePromise<ApiResponse_EntityMergeResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/merge-entities',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Phân tích biến thể trang phục/hình dáng không đồng bộ
     * Tạo tác vụ phân tích biến thể và trả về task_id ngay; hiện giữ làm năng lực dự bị, chưa có entry frontend thực nào.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static analyzeVariantsAsyncApiV1ScriptProcessingAnalyzeVariantsAsyncPost({
        requestBody,
    }: {
        requestBody: VariantAnalysisRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-variants-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Phân tích biến thể trang phục/hình dáng
     * Phát hiện thay đổi trang phục / ngoại hình của nhân vật, xây dựng trục thời gian biến đổi, tạo danh sách đề xuất biến thể chương và đề xuất biến thể. API hiện tại giữ làm năng lực dự bị, chưa có cổng frontend thực.
     * @returns ApiResponse_VariantAnalysisResult_ Successful Response
     * @throws ApiError
     */
    public static analyzeVariantsApiV1ScriptProcessingAnalyzeVariantsPost({
        requestBody,
    }: {
        requestBody: VariantAnalysisRequest,
    }): CancelablePromise<ApiResponse_VariantAnalysisResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-variants',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Kiểm tra nhất quán nhầm lẫn nhân vật bất đồng bộ (dựa trên nguyên văn)
     * Tạo tác vụ kiểm tra nhất quán và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static checkConsistencyAsyncApiV1ScriptProcessingCheckConsistencyAsyncPost({
        requestBody,
    }: {
        requestBody: ScriptConsistencyCheckRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/check-consistency-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Kiểm tra nhất quán nhầm lẫn nhân vật (dựa trên nguyên văn)
     * Phát hiện cùng một nhân vật bị gán thân phận / chủ thể hành vi khác nhau ở các đoạn / phân cảnh khác nhau gây nhầm lẫn, và đưa ra gợi ý chỉnh sửa. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng check-consistency-async.
     * @returns ApiResponse_ScriptConsistencyCheckResult_ Successful Response
     * @throws ApiError
     */
    public static checkConsistencyApiV1ScriptProcessingCheckConsistencyPost({
        requestBody,
    }: {
        requestBody: ScriptConsistencyCheckRequest,
    }): CancelablePromise<ApiResponse_ScriptConsistencyCheckResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/check-consistency',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Không đồng bộ phân tích thông tin thiếu trong chân dung nhân vật,
     * Tạo tác vụ phân tích chân dung nhân vật và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static analyzeCharacterPortraitAsyncApiV1ScriptProcessingAnalyzeCharacterPortraitAsyncPost({
        requestBody,
    }: {
        requestBody: CharacterPortraitAnalysisRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-character-portrait-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích thông tin thiếu của chân dung nhân vật,
     * Dựa trên ngữ cảnh nhân vật trong văn bản gốc và mô tả nhân vật, xác định đang thiếu thông tin quan trọng nào và đưa ra hồ sơ nhân vật sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-character-portrait-async.
     * @returns ApiResponse_CharacterPortraitAnalysisResult_ Successful Response
     * @throws ApiError
     */
    public static analyzeCharacterPortraitApiV1ScriptProcessingAnalyzeCharacterPortraitPost({
        requestBody,
    }: {
        requestBody: CharacterPortraitAnalysisRequest,
    }): CancelablePromise<ApiResponse_CharacterPortraitAnalysisResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-character-portrait',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin đạo cụ không đồng bộ,
     * Tạo tác vụ phân tích thông tin đạo cụ và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static analyzePropInfoAsyncApiV1ScriptProcessingAnalyzePropInfoAsyncPost({
        requestBody,
    }: {
        requestBody: PropInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-prop-info-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin đạo cụ,
     * Dựa trên ngữ cảnh đạo cụ trong văn bản gốc và mô tả đạo cụ, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả đạo cụ khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-prop-info-async.
     * @returns ApiResponse_PropInfoAnalysisResult_ Successful Response
     * @throws ApiError
     */
    public static analyzePropInfoApiV1ScriptProcessingAnalyzePropInfoPost({
        requestBody,
    }: {
        requestBody: PropInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_PropInfoAnalysisResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-prop-info',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin bối cảnh không đồng bộ,
     * Tạo tác vụ phân tích thông tin bối cảnh và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static analyzeSceneInfoAsyncApiV1ScriptProcessingAnalyzeSceneInfoAsyncPost({
        requestBody,
    }: {
        requestBody: SceneInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-scene-info-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin bối cảnh,
     * Dựa trên ngữ cảnh bối cảnh trong văn bản gốc và mô tả bối cảnh, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả bối cảnh khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-scene-info-async.
     * @returns ApiResponse_SceneInfoAnalysisResult_ Successful Response
     * @throws ApiError
     */
    public static analyzeSceneInfoApiV1ScriptProcessingAnalyzeSceneInfoPost({
        requestBody,
    }: {
        requestBody: SceneInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_SceneInfoAnalysisResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-scene-info',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin trang phục không đồng bộ,
     * Tạo tác vụ phân tích thông tin trang phục và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static analyzeCostumeInfoAsyncApiV1ScriptProcessingAnalyzeCostumeInfoAsyncPost({
        requestBody,
    }: {
        requestBody: CostumeInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-costume-info-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Phân tích mục thiếu thông tin trang phục,
     * Dựa trên ngữ cảnh trang phục trong văn bản gốc và mô tả trang phục, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả trang phục khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-costume-info-async.
     * @returns ApiResponse_CostumeInfoAnalysisResult_ Successful Response
     * @throws ApiError
     */
    public static analyzeCostumeInfoApiV1ScriptProcessingAnalyzeCostumeInfoPost({
        requestBody,
    }: {
        requestBody: CostumeInfoAnalysisRequest,
    }): CancelablePromise<ApiResponse_CostumeInfoAnalysisResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/analyze-costume-info',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Không đồng bộ tối ưu kịch bản dựa trên kiểm tra nhất quán,
     * Tạo tác vụ tối ưu kịch bản và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static optimizeScriptAsyncApiV1ScriptProcessingOptimizeScriptAsyncPost({
        requestBody,
    }: {
        requestBody: ScriptOptimizeRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/optimize-script-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Tối ưu kịch bản dựa trên kiểm tra tính nhất quán,
     * Lấy đầu vào là kết quả kiểm tra tính nhất quán và văn bản gốc, sinh kịch bản sau tối ưu (càng ít sửa càng tốt, chỉ sửa các đoạn liên quan đến issues nhầm lẫn nhân vật). API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng optimize-script-async.
     * @returns ApiResponse_ScriptOptimizationResult_ Successful Response
     * @throws ApiError
     */
    public static optimizeScriptApiV1ScriptProcessingOptimizeScriptPost({
        requestBody,
    }: {
        requestBody: ScriptOptimizeRequest,
    }): CancelablePromise<ApiResponse_ScriptOptimizationResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/optimize-script',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Rút gọn thông minh kịch bản,
     * Rút gọn văn bản kịch bản trong khi giữ nguyên nội dung cốt truyện và đảm bảo tính liên tục. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng simplify-script-async.
     * @returns ApiResponse_ScriptSimplificationResult_ Successful Response
     * @throws ApiError
     */
    public static simplifyScriptApiV1ScriptProcessingSimplifyScriptPost({
        requestBody,
    }: {
        requestBody: ScriptSimplifyRequest,
    }): CancelablePromise<ApiResponse_ScriptSimplificationResult_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/simplify-script',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * summary=Rút gọn kịch bản thông minh không đồng bộ,
     * Tạo tác vụ rút gọn kịch bản và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static simplifyScriptAsyncApiV1ScriptProcessingSimplifyScriptAsyncPost({
        requestBody,
    }: {
        requestBody: ScriptSimplifyRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/simplify-script-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Trích xuất thông tin cấp dự án không đồng bộ (đầu ra cuối)
     * Tạo tác vụ trích xuất thông tin cấp dự án và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.
     * @returns ApiResponse_AsyncTaskCreateRead_ Successful Response
     * @throws ApiError
     */
    public static extractScriptAsyncApiV1ScriptProcessingExtractAsyncPost({
        requestBody,
    }: {
        requestBody: ScriptExtractRequest,
    }): CancelablePromise<ApiResponse_AsyncTaskCreateRead_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/extract-async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Trích xuất thông tin cấp dự án (đầu ra cuối cùng)
     * Đầu vào là kết quả phân cảnh (có thể kèm kết quả kiểm tra tính nhất quán), đầu ra là cấu trúc bản nháp có thể nhập vào Studio (dựa theo name, ID do API nhập sinh ra). API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng extract-async.
     * @returns ApiResponse_StudioScriptExtractionDraft_ Successful Response
     * @throws ApiError
     */
    public static extractScriptApiV1ScriptProcessingExtractPost({
        requestBody,
    }: {
        requestBody: ScriptExtractRequest,
    }): CancelablePromise<ApiResponse_StudioScriptExtractionDraft_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/script-processing/extract',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
