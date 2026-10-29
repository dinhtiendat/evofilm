"""API xử lý kịch bản:phân cảnh, trích xuất thông tin, ghép thực thể, phân tích biến thể, kiểm tra nhất quán, biên dịch xuất."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.chains.agents import (
    CharacterPortraitAnalysisAgent,
    CostumeInfoAnalysisAgent,
    ScriptDividerAgent,
    ElementExtractorAgent,
    EntityMergerAgent,
    VariantAnalyzerAgent,
    ConsistencyCheckerAgent,
    PropInfoAnalysisAgent,
    SceneInfoAnalysisAgent,
    ScriptOptimizerAgent,
    ScriptSimplifierAgent,
)
from app.chains.agents.script_processing_agents import (
    ScriptDivisionResult,
    EntityMergeResult,
    VariantAnalysisResult,
    ScriptConsistencyCheckResult,
    ScriptOptimizationResult,
    ScriptSimplificationResult,
    StudioScriptExtractionDraft,
)
from app.dependencies import get_db, get_llm, get_nothinking_llm
from app.schemas.common import ApiResponse, success_response
from app.schemas.skills.character_portrait import CharacterPortraitAnalysisResult
from app.schemas.skills.costume_info_analysis import CostumeInfoAnalysisResult
from app.schemas.skills.prop_info_analysis import PropInfoAnalysisResult
from app.schemas.skills.scene_info_analysis import SceneInfoAnalysisResult
from app.services.common import required_field
from app.services.script_processing_tasks import (
    create_consistency_task,
    create_costume_info_task,
    create_divide_task,
    create_extract_task,
    create_character_portrait_task,
    create_merge_task,
    create_prop_info_task,
    create_scene_info_task,
    create_script_optimization_task,
    create_script_simplification_task,
    create_variant_task,
    pick_consistency_relation_entity_id,
    pick_merge_relation_entity_id,
    pick_analysis_relation_entity_id,
    pick_variant_relation_entity_id,
    spawn_consistency_task,
    spawn_costume_info_task,
    spawn_divide_task,
    spawn_extract_task,
    spawn_character_portrait_task,
    spawn_merge_task,
    spawn_prop_info_task,
    spawn_scene_info_task,
    spawn_script_optimization_task,
    spawn_script_simplification_task,
    spawn_variant_task,
)
from app.services.script_extraction_cache import (
    build_script_extract_cache_key,
    get_cached_script_extract,
    set_cached_script_extract,
)
from app.services.studio.script_division import write_division_result_to_chapter
from app.services.studio import (
    sync_shot_extracted_candidates_from_draft,
    sync_shot_extracted_dialogue_candidates_from_draft,
)
from app.services.studio.shot_semantic_defaults import apply_shot_semantic_defaults_from_draft
from app.api.v1.routes.film.common import AsyncTaskCreateRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/script-processing", tags=["script-processing"])


# ============================================================================
# 1. ScriptDividerAgent - # 1. ScriptDividerAgent - phân cảnh kịch bản
# ============================================================================

class ScriptDividerRequest(BaseModel):
    """Yêu cầu phân cảnh kịch bản.。"""
    script_text: str = Field(..., description="script_text: str = Field(..., description=Văn bản kịch bản đầy đủ, min_length=1)", min_length=1)
    write_to_db: bool = Field(False, description="Có ghi phân cảnh vào cơ sở dữ liệu (bảng shots của AI Studio) hay không")
    chapter_id: str | None = Field(
        None,
        description="ID chương(bắt buộc khi write_to_db=true)",
        min_length=1,
    )


@router.post(
    "/divide-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Không đồng bộ tách kịch bản thành nhiều phân cảnh,",
    description="Tạo tác vụ trích xuất phân cảnh chương và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def divide_script_async(
    request: ScriptDividerRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    if not request.chapter_id:
        raise HTTPException(status_code=400, detail=required_field("chapter_id", when="divide-async"))

    task_info = await create_divide_task(
        db,
        chapter_id=request.chapter_id,
        script_text=request.script_text,
        write_to_db=request.write_to_db,
    )
    await db.commit()
    if not task_info.reused:
        spawn_divide_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/divide",
    response_model=ApiResponse[ScriptDivisionResult],
    summary="Tách kịch bản thành nhiều phân cảnh",
    description=(
        "Nhập toàn bộ văn bản kịch bản, xuất danh sách phân cảnh (index/start_line/end_line/script_excerpt/"
        "shot_name/time_of_day)."
        "Lưu ý: giai đoạn này không ép ID ổn định, nhân vật xuất dưới dạng thông tin yếu (cách gọi/tên), ID ổn định được phân bổ thống nhất ở giai đoạn ghép."
        "API đồng bộ hiện tại chủ yếu dùng để tương thích gọi cũ và điều phối; luồng chính của trang ưu tiên dùng divide-async."
    )
)
async def divide_script(
    request: ScriptDividerRequest,
    llm: BaseChatModel = Depends(get_nothinking_llm),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ScriptDivisionResult]:
    """
    Tự động chia văn bản kịch bản hoàn chỉnh thành nhiều phân cảnh.。
    
    Thân yêu cầu:：
    - script_text: - script_text: Văn bản kịch bản đầy đủ
    
    Trả về: ScriptDivisionResult：ScriptDivisionResult
    - shots: danh sách phân cảnh, gồm index của từng phân cảnh, số dòng đầu/cuối, shot_name, script_excerpt, time_of_day
    - total_shots: - total_shots: Tổng số phân cảnh
    - notes: Giải thích tách (tùy chọn)
    """
    try:
        agent = ScriptDividerAgent(llm)
        result = agent.divide_script(script_text=request.script_text)

        if request.write_to_db:
            if not request.chapter_id:
                raise HTTPException(status_code=400, detail=required_field("chapter_id", when="write_to_db=true"))
            await write_division_result_to_chapter(
                db,
                chapter_id=request.chapter_id,
                result=result,
            )

        return success_response(data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Script dividing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to divide script: {str(e)}"
        )


# ============================================================================
# 2. EntityMergerAgent - # 2. EntityMergerAgent - hợp nhất thực thể
# ============================================================================

class EntityMergerRequest(BaseModel):
    """Yêu cầu gộp thực thể.。"""
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    all_shot_extractions: list[dict[str, Any]] = Field(
        ...,
        description="Kết quả trích xuất của tất cả phân cảnh (dạng serialize của ShotElementExtractionResult)"
    )
    historical_library: dict[str, Any] | None = Field(
        None,
        description="Kho thực thể lịch sử (tùy chọn, dùng cho hợp nhất tăng phân)"
    )
    script_division: dict[str, Any] | None = Field(
        None,
        description="Kết quả phân cảnh của kịch bản (tùy chọn; serialize của ScriptDivisionResult), dùng để định vị và thống kê",
    )
    previous_merge: dict[str, Any] | None = Field(
        None,
        description="Kết quả gộp trước (tùy chọn; EntityMergeResult đã serialize), dùng để thử lại gộp khi xung đột",
    )
    conflict_resolutions: list[dict[str, Any]] | None = Field(
        None,
        description="Danh sách gợi ý giải quyết xung đột (tùy chọn; dùng cho gộp lại khi thử lại xung đột)",
    )


@router.post(
    "/merge-entities-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="Không đồng bộ gộp thông tin thực thể của nhiều phân cảnh",
    description="Tạo tác vụ gộp thực thể và trả về task_id ngay; hiện giữ làm năng lực dự bị, chưa có entry frontend thực nào.",
)
async def merge_entities_async(
    request: EntityMergerRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_merge_relation_entity_id(
        chapter_id=request.chapter_id,
        project_id=request.project_id,
    )
    task_info = await create_merge_task(
        db,
        relation_entity_id=relation_entity_id,
        all_shot_extractions=request.all_shot_extractions,
        historical_library=request.historical_library,
        script_division=request.script_division,
        previous_merge=request.previous_merge,
        conflict_resolutions=request.conflict_resolutions,
    )
    await db.commit()
    if not task_info.reused:
        spawn_merge_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/merge-entities",
    response_model=ApiResponse[EntityMergeResult],
    summary="summary=Gộp thông tin thực thể của nhiều phân cảnh,",
    description=(
        "Nhập toàn bộ kết quả trích xuất phân cảnh (có thể kèm phân cảnh kịch bản và kho thực thể lịch sử), xuất kho thực thể đã gộp:"
        "Kho nhân vật/kho địa điểm/kho bối cảnh/kho đạo cụ (hồ sơ tĩnh + danh sách biến thể)."
        """Bước này sẽ gán ID ổn định thống nhất (như char_001/loc_001/prop_001/scene_001)."""
        "Khi được cung cấp previous_merge và conflict_resolutions, sẽ thực hiện gộp lại khi thử lại xung đột, ưu tiên giải tỏa conflicts và giữ ID ổn định chừng nào có thể."
        "Giao diện hiện tại được giữ làm năng lực dự bị, chưa có lối vào phía trước thực tế."
    )
)
async def merge_entities(
    request: EntityMergerRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[EntityMergeResult]:
    """
    Gộp kết quả trích xuất của nhiều phân cảnh, thống nhất định nghĩa thực thể.
    
    Thân yêu cầu:：
    - all_shot_extractions: - all_shot_extractions: kết quả trích xuất của tất cả phân cảnh
    - historical_library: kho thực thể lịch sử (tùy chọn, dùng cho cập nhật tăng dần)
    - script_division: kết quả phân cảnh kịch bản (tùy chọn, dùng để định vị và thống kê)
    - previous_merge: kết quả gộp lần trước (tùy chọn; dùng cho gộp lại khi thử lại xung đột)
    - conflict_resolutions: danh sách đề xuất giải quyết xung đột (tùy chọn; dùng cho ghép lại khi thử lại xung đột)
    
    Trả về: EntityMergeResult：EntityMergeResult
    - merged_library: thư viện thực thể sau hợp nhất (characters/locations/scenes/props, gồm variants)
    - merge_stats: - merge_stats: Thông tin thống kê gộp
    - conflicts: Xung đột đã phát hiện/mục chờ xử lý
    - notes: Giải thích gộp (tùy chọn)
    """
    try:
        agent = EntityMergerAgent(llm)
        result = agent.extract(
            all_extractions_json=json.dumps(request.all_shot_extractions, ensure_ascii=False),
            historical_library_json=json.dumps(request.historical_library or {}, ensure_ascii=False),
            script_division_json=json.dumps(request.script_division or {}, ensure_ascii=False),
            previous_merge_json=json.dumps(request.previous_merge or {}, ensure_ascii=False),
            conflict_resolutions_json=json.dumps(request.conflict_resolutions or [], ensure_ascii=False),
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Entity merging failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge entities: {str(e)}"
        )


# ============================================================================
# 4. VariantAnalyzerAgent - # 4. VariantAnalyzerAgent - phân tích biến thể
# ============================================================================

class VariantAnalysisRequest(BaseModel):
    """Yêu cầu phân tích biến thể.。"""
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    merged_library: dict[str, Any] = Field(
        ...,
        description="Thư viện thực thể đã gộp (dạng chuỗi hoá của EntityLibrary; lấy từ merged_library trong đầu ra của EntityMerger)"
    )
    all_shot_extractions: list[dict[str, Any]] = Field(
        ...,
        description="description=Kết quả trích xuất của mọi phân cảnh"
    )
    script_division: dict[str, Any] | None = Field(
        None,
        description="kết quả phân cảnh kịch bản (tùy chọn; chuỗi hóa ScriptDivisionResult), dùng để nhóm chương/đoạn",
    )


@router.post(
    "/analyze-variants-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="Phân tích biến thể trang phục/hình dáng không đồng bộ",
    description="Tạo tác vụ phân tích biến thể và trả về task_id ngay; hiện giữ làm năng lực dự bị, chưa có entry frontend thực nào.",
)
async def analyze_variants_async(
    request: VariantAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_variant_relation_entity_id(
        chapter_id=request.chapter_id,
        project_id=request.project_id,
    )
    task_info = await create_variant_task(
        db,
        relation_entity_id=relation_entity_id,
        merged_library=request.merged_library,
        all_shot_extractions=request.all_shot_extractions,
        script_division=request.script_division,
    )
    await db.commit()
    if not task_info.reused:
        spawn_variant_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/analyze-variants",
    response_model=ApiResponse[VariantAnalysisResult],
    summary="Phân tích biến thể trang phục/hình dáng",
    description="Phát hiện thay đổi trang phục / ngoại hình của nhân vật, xây dựng trục thời gian biến đổi, tạo danh sách đề xuất biến thể chương và đề xuất biến thể. API hiện tại giữ làm năng lực dự bị, chưa có cổng frontend thực."
)
async def analyze_variants(
    request: VariantAnalysisRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[VariantAnalysisResult]:
    """
    Phân tích biến thể của thực thể (đặc biệt là thay đổi trang phục nhân vật).
    
    Thân yêu cầu:：
    - merged_library: - merged_library: thư viện thực thể sau gộp
    - all_shot_extractions: - all_shot_extractions: kết quả trích xuất của toàn bộ phân cảnh
    - script_division: kết quả phân cảnh kịch bản (tùy chọn, dùng để nhóm theo chương/đoạn)
    
    Trả về: VariantAnalysisResult：VariantAnalysisResult
    - costume_timelines: - costume_timelines: trục thời gian diễn biến trang phục của từng nhân vật
    - variant_suggestions: - variant_suggestions: danh sách gợi ý biến thể
    - chapter_variants: - chapter_variants: thông tin biến thể được sắp xếp theo chương
    - notes: Giải thích phân tích (tùy chọn)
    """
    try:
        agent = VariantAnalyzerAgent(llm)
        result = agent.extract(
            merged_library_json=json.dumps(request.merged_library, ensure_ascii=False),
            all_extractions_json=json.dumps(request.all_shot_extractions, ensure_ascii=False),
            script_division_json=json.dumps(request.script_division or {}, ensure_ascii=False),
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Variant analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze variants: {str(e)}"
        )


# ============================================================================
# 5. ConsistencyCheckerAgent - kiểm tra tính nhất quán (luồng mới:dựa trên nguyên văn)
# ============================================================================

class ScriptConsistencyCheckRequest(BaseModel):
    """Yêu cầu kiểm tra tính nhất quán (nhầm lẫn nhân vật)."""
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    script_text: str = Field(..., description="script_text: str = Field(..., description=Văn bản kịch bản đầy đủ, min_length=1)", min_length=1)


@router.post(
    "/check-consistency-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="Kiểm tra nhất quán nhầm lẫn nhân vật bất đồng bộ (dựa trên nguyên văn)",
    description="Tạo tác vụ kiểm tra nhất quán và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def check_consistency_async(
    request: ScriptConsistencyCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_consistency_relation_entity_id(
        chapter_id=request.chapter_id,
        project_id=request.project_id,
    )
    task_info = await create_consistency_task(
        db,
        relation_entity_id=relation_entity_id,
        script_text=request.script_text,
    )
    await db.commit()
    if not task_info.reused:
        spawn_consistency_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/check-consistency",
    response_model=ApiResponse[ScriptConsistencyCheckResult],
    summary="Kiểm tra nhất quán nhầm lẫn nhân vật (dựa trên nguyên văn)",
    description="Phát hiện cùng một nhân vật bị gán thân phận / chủ thể hành vi khác nhau ở các đoạn / phân cảnh khác nhau gây nhầm lẫn, và đưa ra gợi ý chỉnh sửa. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng check-consistency-async."
)
async def check_consistency(
    request: ScriptConsistencyCheckRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[ScriptConsistencyCheckResult]:
    """
    Kiểm tra tính nhất quán giữa định nghĩa thực thể và nội dung phân cảnh.。
    
    Thân yêu cầu:：
    - script_text: - script_text: Văn bản kịch bản đầy đủ
    
    Trả về: ScriptConsistencyCheckResult：ScriptConsistencyCheckResult
    - issues: danh sách vấn đề nhầm lẫn nhân vật (chứa description/suggestion/affected_lines)
    - has_issues: - has_issues: Có phát hiện vấn đề không
    - summary: Kết luận (tùy chọn)
    """
    try:
        agent = ConsistencyCheckerAgent(llm)
        result = agent.extract(script_text=request.script_text)
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Consistency checking failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check consistency: {str(e)}"
        )


# ============================================================================
# 5b. CharacterPortraitAnalysisAgent - # 5b. CharacterPortraitAnalysisAgent - phân tích thiếu thông tin hồ sơ nhân vật
# ============================================================================
class CharacterPortraitAnalysisRequest(BaseModel):
    """Yêu cầu phân tích thông tin thiếu của chân dung nhân vật.。"""

    relation_entity_id: str | None = Field(None, description="ID thực thể liên kết của tác vụ (tùy chọn khi khôi phục tác vụ ở trang tài nguyên)")
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    character_context: str | None = Field(
        None,
        description="bối cảnh nhân vật nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)",
    )
    character_description: str = Field(..., description="character_description: str = Field(..., description=Mô tả nhân vật trong nguyên văn, min_length=1)", min_length=1)


@router.post(
    "/analyze-character-portrait-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Không đồng bộ phân tích thông tin thiếu trong chân dung nhân vật,",
    description="Tạo tác vụ phân tích chân dung nhân vật và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def analyze_character_portrait_async(
    request: CharacterPortraitAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        relation_entity_id=request.relation_entity_id,
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="analyze-character-portrait-async",
    )
    task_info = await create_character_portrait_task(
        db,
        relation_entity_id=relation_entity_id,
        character_context=request.character_context,
        character_description=request.character_description,
    )
    await db.commit()
    if not task_info.reused:
        spawn_character_portrait_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/analyze-character-portrait",
    response_model=ApiResponse[CharacterPortraitAnalysisResult],
    summary="summary=Phân tích thông tin thiếu của chân dung nhân vật,",
    description="Dựa trên ngữ cảnh nhân vật trong văn bản gốc và mô tả nhân vật, xác định đang thiếu thông tin quan trọng nào và đưa ra hồ sơ nhân vật sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-character-portrait-async.",
)
async def analyze_character_portrait(
    request: CharacterPortraitAnalysisRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[CharacterPortraitAnalysisResult]:
    try:
        agent = CharacterPortraitAnalysisAgent(llm)
        result = agent.analyze_character_description(
            character_context=request.character_context,
            character_description=request.character_description,
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Character portrait analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze character portrait: {str(e)}",
        )


# ============================================================================
# 5c. PropInfoAnalysisAgent - # 5c. PropInfoAnalysisAgent - Phân tích thiếu thông tin đạo cụ
# ============================================================================
class PropInfoAnalysisRequest(BaseModel):
    """Yêu cầu phân tích thiếu thông tin đạo cụ.。"""

    relation_entity_id: str | None = Field(None, description="ID thực thể liên kết của tác vụ (tùy chọn khi khôi phục tác vụ ở trang tài nguyên)")
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    prop_context: str | None = Field(
        None,
        description="bối cảnh đạo cụ nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)",
    )
    prop_description: str = Field(..., description="prop_description: str = Field(..., description=Mô tả đạo cụ trong nguyên văn, min_length=1)", min_length=1)


@router.post(
    "/analyze-prop-info-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Phân tích mục thiếu thông tin đạo cụ không đồng bộ,",
    description="Tạo tác vụ phân tích thông tin đạo cụ và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def analyze_prop_info_async(
    request: PropInfoAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        relation_entity_id=request.relation_entity_id,
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="analyze-prop-info-async",
    )
    task_info = await create_prop_info_task(
        db,
        relation_entity_id=relation_entity_id,
        prop_context=request.prop_context,
        prop_description=request.prop_description,
    )
    await db.commit()
    if not task_info.reused:
        spawn_prop_info_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/analyze-prop-info",
    response_model=ApiResponse[PropInfoAnalysisResult],
    summary="summary=Phân tích mục thiếu thông tin đạo cụ,",
    description="Dựa trên ngữ cảnh đạo cụ trong văn bản gốc và mô tả đạo cụ, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả đạo cụ khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-prop-info-async.",
)
async def analyze_prop_info(
    request: PropInfoAnalysisRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[PropInfoAnalysisResult]:
    try:
        agent = PropInfoAnalysisAgent(llm)
        result = agent.analyze_prop_description(
            prop_context=request.prop_context,
            prop_description=request.prop_description,
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Prop info analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze prop info: {str(e)}",
        )


# ============================================================================
# 5d. SceneInfoAnalysisAgent - # 5d. SceneInfoAnalysisAgent - Phân tích thiếu thông tin bối cảnh
# ============================================================================
class SceneInfoAnalysisRequest(BaseModel):
    """Yêu cầu phân tích thiếu thông tin bối cảnh.。"""

    relation_entity_id: str | None = Field(None, description="ID thực thể liên kết của tác vụ (tùy chọn khi khôi phục tác vụ ở trang tài nguyên)")
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    scene_context: str | None = Field(
        None,
        description="bối cảnh bối cảnh nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)",
    )
    scene_description: str = Field(..., description="scene_description: str = Field(..., description=Mô tả bối cảnh trong nguyên văn, min_length=1)", min_length=1)


@router.post(
    "/analyze-scene-info-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Phân tích mục thiếu thông tin bối cảnh không đồng bộ,",
    description="Tạo tác vụ phân tích thông tin bối cảnh và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def analyze_scene_info_async(
    request: SceneInfoAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        relation_entity_id=request.relation_entity_id,
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="analyze-scene-info-async",
    )
    task_info = await create_scene_info_task(
        db,
        relation_entity_id=relation_entity_id,
        scene_context=request.scene_context,
        scene_description=request.scene_description,
    )
    await db.commit()
    if not task_info.reused:
        spawn_scene_info_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/analyze-scene-info",
    response_model=ApiResponse[SceneInfoAnalysisResult],
    summary="summary=Phân tích mục thiếu thông tin bối cảnh,",
    description="Dựa trên ngữ cảnh bối cảnh trong văn bản gốc và mô tả bối cảnh, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả bối cảnh khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-scene-info-async.",
)
async def analyze_scene_info(
    request: SceneInfoAnalysisRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[SceneInfoAnalysisResult]:
    try:
        agent = SceneInfoAnalysisAgent(llm)
        result = agent.analyze_scene_description(
            scene_context=request.scene_context,
            scene_description=request.scene_description,
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Scene info analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze scene info: {str(e)}",
        )


# ============================================================================
# 5e. CostumeInfoAnalysisAgent - # 5e. CostumeInfoAnalysisAgent - phân tích thiếu thông tin trang phục
# ============================================================================
class CostumeInfoAnalysisRequest(BaseModel):
    """Yêu cầu phân tích thiếu thông tin trang phục.。"""

    relation_entity_id: str | None = Field(None, description="ID thực thể liên kết của tác vụ (tùy chọn khi khôi phục tác vụ ở trang tài nguyên)")
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    costume_context: str | None = Field(
        None,
        description="bối cảnh trang phục nguyên văn (có thể rỗng; dùng để cung cấp thêm bối cảnh, hỗ trợ phán đoán thông tin thiếu)",
    )
    costume_description: str = Field(..., description="costume_description: str = Field(..., description=Mô tả trang phục trong nguyên văn, min_length=1)", min_length=1)


@router.post(
    "/analyze-costume-info-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Phân tích mục thiếu thông tin trang phục không đồng bộ,",
    description="Tạo tác vụ phân tích thông tin trang phục và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def analyze_costume_info_async(
    request: CostumeInfoAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        relation_entity_id=request.relation_entity_id,
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="analyze-costume-info-async",
    )
    task_info = await create_costume_info_task(
        db,
        relation_entity_id=relation_entity_id,
        costume_context=request.costume_context,
        costume_description=request.costume_description,
    )
    await db.commit()
    if not task_info.reused:
        spawn_costume_info_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/analyze-costume-info",
    response_model=ApiResponse[CostumeInfoAnalysisResult],
    summary="summary=Phân tích mục thiếu thông tin trang phục,",
    description="Dựa trên ngữ cảnh trang phục trong văn bản gốc và mô tả trang phục, xác định đang thiếu thông tin quan trọng nào và đưa ra mô tả trang phục khả năng tạo dựng sau tối ưu. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng analyze-costume-info-async.",
)
async def analyze_costume_info(
    request: CostumeInfoAnalysisRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[CostumeInfoAnalysisResult]:
    try:
        agent = CostumeInfoAnalysisAgent(llm)
        result = agent.analyze_costume_description(
            costume_context=request.costume_context,
            costume_description=request.costume_description,
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Costume info analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze costume info: {str(e)}",
        )


# ============================================================================
# 6. ScriptOptimizerAgent - tối ưu kịch bản (không thuộc luồng chính, kích hoạt theo cần)
# ============================================================================

class ScriptOptimizeRequest(BaseModel):
    """Yêu cầu tối ưu kịch bản (dựa trên kết quả kiểm tra nhất quán)."""
    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    script_text: str = Field(..., description="script_text: str = Field(..., description=Văn bản kịch bản gốc, min_length=1)", min_length=1)
    consistency: dict[str, Any] = Field(..., description="Đầu ra kiểm tra tính nhất quán (ScriptConsistencyCheckResult dạng serialized)")


class ScriptSimplifyRequest(BaseModel):
    """Yêu cầu rút gọn thông minh kịch bản.。"""

    project_id: str | None = Field(None, description="ID dự án (tùy chọn: liên kết tác vụ không đồng bộ)")
    chapter_id: str | None = Field(None, description="ID chương (tùy chọn: liên kết tác vụ không đồng bộ)")
    script_text: str = Field(..., description="script_text: str = Field(..., description=Văn bản kịch bản gốc, min_length=1)", min_length=1)


@router.post(
    "/optimize-script-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Không đồng bộ tối ưu kịch bản dựa trên kiểm tra nhất quán,",
    description="Tạo tác vụ tối ưu kịch bản và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def optimize_script_async(
    request: ScriptOptimizeRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="optimize-script-async",
    )
    task_info = await create_script_optimization_task(
        db,
        relation_entity_id=relation_entity_id,
        script_text=request.script_text,
        consistency=request.consistency,
    )
    await db.commit()
    if not task_info.reused:
        spawn_script_optimization_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/optimize-script",
    response_model=ApiResponse[ScriptOptimizationResult],
    summary="summary=Tối ưu kịch bản dựa trên kiểm tra tính nhất quán,",
    description="Lấy đầu vào là kết quả kiểm tra tính nhất quán và văn bản gốc, sinh kịch bản sau tối ưu (càng ít sửa càng tốt, chỉ sửa các đoạn liên quan đến issues nhầm lẫn nhân vật). API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng optimize-script-async."
)
async def optimize_script(
    request: ScriptOptimizeRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[ScriptOptimizationResult]:
    """
    Đưa nguyên văn + đầu ra kiểm tra nhất quán vào, tạo kịch bản đã tối ưu.
    """
    try:
        agent = ScriptOptimizerAgent(llm)
        result = agent.extract(
            script_text=request.script_text,
            consistency_json=json.dumps(request.consistency, ensure_ascii=False),
        )
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Script optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize script: {str(e)}"
        )


@router.post(
    "/simplify-script",
    response_model=ApiResponse[ScriptSimplificationResult],
    summary="summary=Rút gọn thông minh kịch bản,",
    description="Rút gọn văn bản kịch bản trong khi giữ nguyên nội dung cốt truyện và đảm bảo tính liên tục. API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng simplify-script-async.",
)
async def simplify_script(
    request: ScriptSimplifyRequest,
    llm: BaseChatModel = Depends(get_llm),
) -> ApiResponse[ScriptSimplificationResult]:
    """Đầu vào kịch bản nguyên văn, đầu ra văn bản đã tinh giản kèm tóm tắt chiến lược tinh giản."""
    try:
        agent = ScriptSimplifierAgent(llm)
        result = agent.extract(script_text=request.script_text)
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Script simplification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to simplify script: {str(e)}",
        )


@router.post(
    "/simplify-script-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="summary=Rút gọn kịch bản thông minh không đồng bộ,",
    description="Tạo tác vụ rút gọn kịch bản và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def simplify_script_async(
    request: ScriptSimplifyRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    relation_entity_id = pick_analysis_relation_entity_id(
        chapter_id=request.chapter_id,
        project_id=request.project_id,
        endpoint="simplify-script-async",
    )
    task_info = await create_script_simplification_task(
        db,
        relation_entity_id=relation_entity_id,
        script_text=request.script_text,
    )
    await db.commit()
    if not task_info.reused:
        spawn_script_simplification_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


# ============================================================================
# 7. ElementExtractorAgent - Trích xuất cấp dự án (đầu ra cuối)
# ============================================================================

class ScriptExtractRequest(BaseModel):
    """Yêu cầu trích xuất thông tin cấp dự án (đầu ra cuối cùng)."""
    project_id: str = Field(..., description="project_id: str = Field(..., description=ID dự án, min_length=1) ID", min_length=1)
    chapter_id: str = Field(..., description="chapter_id: str = Field(..., description=ID chương, min_length=1) ID", min_length=1)
    script_division: dict[str, Any] = Field(..., description="Kết quả chia phân cảnh (ScriptDivisionResult dạng serialized)")
    consistency: dict[str, Any] | None = Field(None, description="Kết quả kiểm tra tính nhất quán (tùy chọn; ScriptConsistencyCheckResult dạng serialized)")
    refresh_cache: bool = Field(False, description="refresh_cache: bool = Field(False, description=liệu bỏ qua bộ đệm phía sau và buộc trích xuất lại hay không)")


@router.post(
    "/extract-async",
    response_model=ApiResponse[AsyncTaskCreateRead],
    summary="Trích xuất thông tin cấp dự án không đồng bộ (đầu ra cuối)",
    description="Tạo tác vụ trích xuất thông tin cấp dự án và trả về task_id ngay; phía trước có thể truy vấn lặp qua giao diện trạng thái tác vụ.",
)
async def extract_script_async(
    request: ScriptExtractRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AsyncTaskCreateRead]:
    task_info = await create_extract_task(
        db,
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        script_division=request.script_division,
        consistency=request.consistency,
        refresh_cache=request.refresh_cache,
    )
    await db.commit()
    if not task_info.reused:
        spawn_extract_task(task_info.task_id)
    return success_response(
        AsyncTaskCreateRead(
            task_id=task_info.task_id,
            status=task_info.status,
            reused=task_info.reused,
            relation_type=task_info.relation_type,
            relation_entity_id=task_info.relation_entity_id,
        )
    )


@router.post(
    "/extract",
    response_model=ApiResponse[StudioScriptExtractionDraft],
    summary="Trích xuất thông tin cấp dự án (đầu ra cuối cùng)",
    description="Đầu vào là kết quả phân cảnh (có thể kèm kết quả kiểm tra tính nhất quán), đầu ra là cấu trúc bản nháp có thể nhập vào Studio (dựa theo name, ID do API nhập sinh ra). API đồng bộ hiện tại chủ yếu dùng để tương thích với cách gọi cũ và cho mục đích gỡ lỗi; luồng chính trên trang ưu tiên dùng extract-async."
)
async def extract_script(
    request: ScriptExtractRequest,
    llm: BaseChatModel = Depends(get_nothinking_llm),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[StudioScriptExtractionDraft]:
    try:
        cache_key = build_script_extract_cache_key(
            project_id=request.project_id,
            chapter_id=request.chapter_id,
            script_division=request.script_division,
            consistency=request.consistency,
        )
        if not request.refresh_cache:
            cached = get_cached_script_extract(cache_key)
            if cached is not None:
                await sync_shot_extracted_candidates_from_draft(
                    db,
                    chapter_id=request.chapter_id,
                    draft=cached,
                )
                await sync_shot_extracted_dialogue_candidates_from_draft(
                    db,
                    chapter_id=request.chapter_id,
                    draft=cached,
                )
                await apply_shot_semantic_defaults_from_draft(
                    db,
                    chapter_id=request.chapter_id,
                    draft=cached,
                )
                await db.commit()
                return success_response(data=cached, meta={"from_cache": True})

        agent = ElementExtractorAgent(llm)
        result = agent.extract(
            project_id=request.project_id,
            chapter_id=request.chapter_id,
            script_division_json=json.dumps(request.script_division, ensure_ascii=False),
            consistency_json=json.dumps(request.consistency or {}, ensure_ascii=False),
        )
        set_cached_script_extract(cache_key, result)
        await sync_shot_extracted_candidates_from_draft(
            db,
            chapter_id=request.chapter_id,
            draft=result,
        )
        await sync_shot_extracted_dialogue_candidates_from_draft(
            db,
            chapter_id=request.chapter_id,
            draft=result,
        )
        await apply_shot_semantic_defaults_from_draft(
            db,
            chapter_id=request.chapter_id,
            draft=result,
        )
        await db.commit()
        return success_response(data=result, meta={"from_cache": False})
    except Exception as e:
        logger.error(f"Script extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract script: {str(e)}",
        )
