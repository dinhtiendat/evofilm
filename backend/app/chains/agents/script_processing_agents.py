"""Các Agent xử lý kịch bản (module tập hợp tương thích).

Module này trước đây chứa toàn bộ implementation của các Agent; hiện đã tách ra từng file riêng.
File này giữ nguyên đường import cũ để code/route/test cũ tiếp tục hoạt động.
"""

from __future__ import annotations

from app.chains.agents.consistency_checker_agent import ConsistencyCheckerAgent
from app.chains.agents.element_extractor_agent import ElementExtractorAgent
from app.chains.agents.entity_merger_agent import EntityMergerAgent
from app.chains.agents.script_divider_agent import ScriptDividerAgent
from app.chains.agents.script_optimizer_agent import ScriptOptimizerAgent
from app.chains.agents.script_simplifier_agent import ScriptSimplifierAgent
from app.chains.agents.variant_analyzer_agent import VariantAnalyzerAgent

from app.schemas.skills.script_processing import (
    EntityMergeResult,
    ScriptConsistencyCheckResult,
    ScriptDivisionResult,
    ScriptOptimizationResult,
    ScriptSimplificationResult,
    ShotDivision,
    StudioScriptExtractionDraft,
    VariantAnalysisResult,
)

__all__ = [
    "ScriptDividerAgent",
    "ElementExtractorAgent",
    "EntityMergerAgent",
    "VariantAnalyzerAgent",
    "ConsistencyCheckerAgent",
    "ScriptOptimizerAgent",
    "ScriptSimplifierAgent",
    # schema re-export
    "ScriptConsistencyCheckResult",
    "ScriptDivisionResult",
    "ScriptSimplificationResult",
    "ScriptOptimizationResult",
    "StudioScriptExtractionDraft",
    "EntityMergeResult",
    "VariantAnalysisResult",
    "ShotDivision",
]
