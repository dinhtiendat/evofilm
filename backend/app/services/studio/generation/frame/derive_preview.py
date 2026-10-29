from __future__ import annotations

from app.schemas.studio.shots import FrameGuidanceDecisionRead, RenderedShotFramePromptRead, ShotFramePromptMappingRead
from app.services.studio.generation.frame.build_base import FrameBaseDraft
from app.services.studio.generation.frame.build_context import FrameGenerationContext
from app.services.studio.generation.shared.types import GenerationDerivedPreview


def replace_reference_names_in_prompt(
    *,
    base_prompt: str,
    mappings: list[ShotFramePromptMappingRead],
) -> str:
    """Thay tên thực thể trong prompt bằng token hình ảnh ổn định."""
    text = (base_prompt or "").strip()
    replace_pairs = [
        ((mapping.name or "").strip(), mapping.token)
        for mapping in mappings
        if (mapping.name or "").strip()
    ]
    replace_pairs.sort(key=lambda item: len(item[0]), reverse=True)
    for name, token in replace_pairs:
        text = text.replace(name, token)
    return text


def _score_frame_guidance_line(
    *,
    frame_type: str,
    category: str,
    text: str,
) -> int:
    """điểm guidance ảnh theo loại khung và đặc điểm văn bản, kiểm soát thứ tự hội tụ của prompt cuối."""
    score_by_category = {
        "summary": 100,
        "continuity": 80,
        "frame": 70,
        "screen": 65,
        "composition": 60,
    }
    score = score_by_category.get(category, 0)

    if frame_type == "first" and category == "frame":
        score += 18
    if frame_type == "first" and category == "composition":
        score += 15
    if frame_type == "key" and category == "frame":
        score += 6
    if frame_type == "last" and category == "frame":
        score += 8
    if frame_type in {"key", "last"} and category == "screen":
        score += 10
    if frame_type == "last" and category == "continuity":
        score += 5

    if category == "frame" and any(keyword in text for keyword in ("khoảnh khắc kích hoạt", "phản ứng ban đầu", "chưa hoàn tất", "đỉnh hành động", "dư âm cảm xúc", "khép lại")):
        score += 8
    if category == "screen" and any(keyword in text for keyword in ("tầm mắt", "ngắm nhìn", "trái-phải", "hướng mặt", "nhảy trục")):
        score += 10
    if category == "composition" and any(keyword in text for keyword in ("không gian", "trọng tâm", "môi trường", "mỏ neo", "đứng")):
        score += 10
    if category == "continuity" and any(keyword in text for keyword in ("phân cảnh trước", "phân cảnh tiếp theo", "tiếp nối", "khép lại")):
        score += 5

    return score


def _build_frame_guidance_reason(
    *,
    frame_type: str,
    category: str,
    selected: bool,
) -> str:
    """Lý do có thể giải thích cho việc guidance tạo được giữ lại hay nén."""
    if selected:
        if category == "frame":
            if frame_type == "first":
                return "hiện là khung hình đầu, hệ thống ưu tiên giữ ràng buộc khoảnh khắc kích hoạt và trạng thái chưa hoàn thành, tránh khung nhảy thẳng vào hành động hoàn tất sau."
            if frame_type == "key":
                return "hiện là khung hình chính, hệ thống giữ lại guidance theo trách nhiệm khung để tăng cường đỉnh hành động hoặc điểm nổ cảm xúc."
            if frame_type == "last":
                return "hiện là khung hình cuối, hệ thống giữ lại guidance theo trách nhiệm khung để tăng cường khép lại hành động và điểm rơi cảm xúc."
        if frame_type == "first" and category == "composition":
            return "Hiện là khung hình đầu, hệ thống ưu tiên ổn định việc thiết lập không gian và vị trí đứng chủ thể, nên giữ mỏ neo bố cục."
        if frame_type in {"key", "last"} and category == "screen":
            return "shot hiện tại chú trọng sự ổn định của hướng nhìn và trục trái/phải hơn, nên ưu tiên giữ guidance hướng xoay và hướng nhìn."
        if category == "summary":
            return "Chỉ thị đạo diễn chính luôn là ràng buộc có độ ưu tiên cao nhất, nên sẽ được ưu tiên giữ lại."
        if category == "continuity":
            return "Guidance liên tục ảnh hưởng trực tiếp đến độ ổn định tiếp nối phân cảnh, nên được giữ lại."
        if category == "composition":
            return "Guidance này quan trọng hơn với trọng tâm không gian hình ảnh, nên được giữ lại."
        if category == "screen":
            return "Guidance này quan trọng hơn với ánh mắt, định hướng hoặc trục, nên được giữ lại."

    if category == "frame":
        if frame_type == "first":
            return "Hiện đã có ràng buộc khung hình đầu ưu tiên cao hơn bước vào prompt cuối cùng nên guidance trách nhiệm khung hình này bị thu gọn."
        if frame_type == "key":
            return "Hiện đã có ràng buộc khung hình chính ưu tiên cao hơn bước vào prompt cuối cùng nên guidance trách nhiệm khung hình này bị thu gọn."
        if frame_type == "last":
            return "Hiện đã có ràng buộc khung hình cuối ưu tiên cao hơn bước vào prompt cuối cùng nên guidance trách nhiệm khung hình này bị thu gọn."
    if frame_type == "first" and category == "screen":
        return "Hiện đang ở khung hình đầu, hệ thống ưu tiên bảo toàn việc thiết lập không gian và quan hệ vị trí đứng nên hạ guidance hướng nhìn xuống mức thứ yếu."
    if frame_type in {"key", "last"} and category == "composition":
        return "shot hiện tại ưu tiên giữ nhìn và trục trái/phải ổn định hơn, nên guidance neo bố cục bị nén lại."
    if category == "summary":
        return "hiện đã có lệnh đạo diễn chính điểm cao hơn vào prompt cuối, tóm tắt này không được giữ tiếp."
    if category == "continuity":
        return "Hiện đã có ràng buộc phân cảnh ưu tiên cao hơn bước vào prompt cuối cùng nên guidance liên tục này bị thu gọn."
    if category == "composition":
        return "Hiện đã có ràng buộc không gian hoặc hướng nhìn ưu tiên cao hơn bước vào prompt cuối cùng nên guidance bố cục này bị thu gọn."
    if category == "screen":
        return "Hiện đã có ràng buộc không gian hoặc liên tục có ưu tiên cao hơn đi vào prompt cuối, nên guidance hướng nhìn/về nhìn này bị nén."
    return "Hiện đã có guidance ưu tiên cao hơn vào prompt cuối cùng, vì vậy mục này không được giữ lại."


def _build_frame_guidance_reason_tag(
    *,
    frame_type: str,
    category: str,
    selected: bool,
) -> str:
    """Tạo nhãn ngắn phù hợp cho phía trước đọc nhanh."""
    if category == "summary":
        return "Lệnh chính của đạo diễn"
    if category == "frame":
        if frame_type == "first":
            return "Khung hình đầu giữ thứ tự thời gian" if selected else "Khung hình đầu giáng thứ tự thời gian"
        if frame_type == "key":
            return "khung chính giữ đỉnh" if selected else "khung chính hạ đỉnh"
        if frame_type == "last":
            return "Khung hình cuối giữ khép lại" if selected else "Khung hình cuối giáng khép lại"
    if category == "continuity":
        return "Ưu tiên liên tục" if selected else "Giáng cấp liên tục"
    if frame_type == "first" and category == "composition":
        return "Khung hình đầu giữ không gian" if selected else "Khung hình đầu giáng bố cục"
    if frame_type == "first" and category == "screen":
        return "Khung hình đầu hạ trục kịch"
    if frame_type in {"key", "last"} and category == "screen":
        return "Giữ trục kịch ở khung hình chính" if frame_type == "key" and selected else ("Giữ trục kịch ở khung hình cuối" if selected else "Hạ cấp trục kịch")
    if frame_type in {"key", "last"} and category == "composition":
        return "Khung hình chính hạ bố cục" if frame_type == "key" else "Khung hình cuối hạ bố cục"
    if category == "composition":
        return "Ưu tiên bố cục" if selected else "Giáng cấp bố cục"
    if category == "screen":
        return "Ưu tiên trục" if selected else "Giáng cấp trục"
    return "Điều chỉnh thứ tự ưu tiên"


def _collect_frame_guidance_lines(
    *,
    frame_type: str,
    replaced_prompt: str,
    director_command_summary: str,
    continuity_guidance: str,
    frame_specific_guidance: str,
    composition_anchor: str,
    screen_direction_guidance: str,
) -> tuple[list[str], list[str], list[FrameGuidanceDecisionRead], list[FrameGuidanceDecisionRead]]:
    """Thu thập guidance được giữ lại cuối cùng và bị nén, dùng chung cho render và hiển thị phía trước."""
    text = (replaced_prompt or "").strip()
    candidates: list[tuple[int, int, str, str]] = []
    normalized_summary = (director_command_summary or "").strip()
    normalized_continuity = (continuity_guidance or "").strip()
    normalized_frame = (frame_specific_guidance or "").strip()
    normalized_composition = (composition_anchor or "").strip()
    normalized_screen = (screen_direction_guidance or "").strip()

    if normalized_summary and normalized_summary not in text:
        candidates.append(
            (
                _score_frame_guidance_line(frame_type=frame_type, category="summary", text=normalized_summary),
                0,
                "summary",
                f"Chỉ đạo đạo diễn ưu tiên cao: {normalized_summary}",
            )
        )
    if (
        normalized_continuity
        and normalized_continuity not in text
        and normalized_continuity not in normalized_summary
        and "Yêu cầu liên tục:" not in text
    ):
        candidates.append(
            (
                _score_frame_guidance_line(frame_type=frame_type, category="continuity", text=normalized_continuity),
                1,
                "continuity",
                f"Yêu cầu tính liên tục: {normalized_continuity}",
            )
        )
    if (
        normalized_frame
        and normalized_frame not in text
        and normalized_frame not in normalized_summary
        and "Nhiệm vụ của khung hình hiện tại:" not in text
    ):
        candidates.append(
            (
                _score_frame_guidance_line(frame_type=frame_type, category="frame", text=normalized_frame),
                2,
                "frame",
                f"Trách nhiệm khung hình hiện tại: {normalized_frame}",
            )
        )
    if (
        normalized_composition
        and normalized_composition not in text
        and "Mỏ neo bố cục:" not in text
    ):
        candidates.append(
            (
                _score_frame_guidance_line(frame_type=frame_type, category="composition", text=normalized_composition),
                4,
                "composition",
                f"Mỏ neo bố cục: {normalized_composition}",
            )
        )
    if (
        normalized_screen
        and normalized_screen not in text
        and "Hướng và đường nhìn:" not in text
    ):
        candidates.append(
            (
                _score_frame_guidance_line(frame_type=frame_type, category="screen", text=normalized_screen),
                3,
                "screen",
                f"Hướng và ánh nhìn: {normalized_screen}",
            )
        )

    ranked = sorted(candidates, key=lambda item: (-item[0], item[1]))
    selected_rows = ranked[:3]
    dropped_rows = ranked[3:]
    selected = [line for _, _, _, line in selected_rows]
    dropped = [line for _, _, _, line in dropped_rows]
    selected_details = [
        FrameGuidanceDecisionRead(
            text=line,
            category=category,
            reason_tag=_build_frame_guidance_reason_tag(frame_type=frame_type, category=category, selected=True),
            reason=_build_frame_guidance_reason(frame_type=frame_type, category=category, selected=True),
        )
        for _, _, category, line in selected_rows
    ]
    dropped_details = [
        FrameGuidanceDecisionRead(
            text=line,
            category=category,
            reason_tag=_build_frame_guidance_reason_tag(frame_type=frame_type, category=category, selected=False),
            reason=_build_frame_guidance_reason(frame_type=frame_type, category=category, selected=False),
        )
        for _, _, category, line in dropped_rows
    ]
    return selected, dropped, selected_details, dropped_details


def enrich_frame_prompt_with_guidance(
    *,
    frame_type: str,
    replaced_prompt: str,
    director_command_summary: str,
    continuity_guidance: str,
    frame_specific_guidance: str,
    composition_anchor: str,
    screen_direction_guidance: str,
) -> str:
    """Bổ ràng buộc đạo diễn ưu tiên cao vào prompt ảnh cuối cùng, tránh chỉ dừng ở hiển thị gỡ lỗi."""
    text = (replaced_prompt or "").strip()
    guidance_lines, _, _, _ = _collect_frame_guidance_lines(
        frame_type=frame_type,
        replaced_prompt=text,
        director_command_summary=director_command_summary,
        continuity_guidance=continuity_guidance,
        frame_specific_guidance=frame_specific_guidance,
        composition_anchor=composition_anchor,
        screen_direction_guidance=screen_direction_guidance,
    )
    if not guidance_lines:
        return text
    return "\n".join([*guidance_lines, text]).strip()


def compose_shot_frame_rendered_prompt(
    *,
    replaced_prompt: str,
    mappings: list[ShotFramePromptMappingRead],
) -> str:
    """Lắp ráp prompt khung hình chính cuối cùng gửi cho mô hình."""
    lines: list[str] = []
    if mappings:
        lines.append("## Diễn giải nội dung hình ảnh")
        for mapping in mappings:
            lines.append(f"{mapping.token}: {mapping.name}")
        lines.append("")
    lines.append("## Nội dung đã tạo")
    lines.append((replaced_prompt or "").strip())
    return "\n".join(lines).strip()


class FrameDerivedPreview(GenerationDerivedPreview):
    """Kết quả xem trước cuối cùng của tạo ảnh khung hình phân cảnh."""

    kind: str = "frame"
    shot_id: str
    frame_type: str
    base_prompt: str
    rendered_prompt: str
    selected_guidance: list[str]
    dropped_guidance: list[str]
    selected_guidance_details: list[FrameGuidanceDecisionRead]
    dropped_guidance_details: list[FrameGuidanceDecisionRead]
    images: list[str]
    mappings: list[ShotFramePromptMappingRead]


def derive_frame_preview(
    *,
    base: FrameBaseDraft,
    context: FrameGenerationContext,
) -> FrameDerivedPreview:
    normalized_base_prompt = (base.prompt or "").strip()
    replaced_prompt = replace_reference_names_in_prompt(
        base_prompt=normalized_base_prompt,
        mappings=context.ordered_refs,
    )
    selected_guidance, dropped_guidance, selected_guidance_details, dropped_guidance_details = _collect_frame_guidance_lines(
        frame_type=base.frame_type.value if hasattr(base.frame_type, "value") else str(base.frame_type),
        replaced_prompt=replaced_prompt,
        director_command_summary=base.director_command_summary,
        continuity_guidance=base.continuity_guidance,
        frame_specific_guidance=base.frame_specific_guidance,
        composition_anchor=base.composition_anchor,
        screen_direction_guidance=base.screen_direction_guidance,
    )
    enriched_prompt = enrich_frame_prompt_with_guidance(
        frame_type=base.frame_type.value if hasattr(base.frame_type, "value") else str(base.frame_type),
        replaced_prompt=replaced_prompt,
        director_command_summary=base.director_command_summary,
        continuity_guidance=base.continuity_guidance,
        frame_specific_guidance=base.frame_specific_guidance,
        composition_anchor=base.composition_anchor,
        screen_direction_guidance=base.screen_direction_guidance,
    )
    rendered_prompt = compose_shot_frame_rendered_prompt(
        replaced_prompt=enriched_prompt,
        mappings=context.ordered_refs,
    )
    return FrameDerivedPreview(
        shot_id=base.shot_id,
        frame_type=base.frame_type.value if hasattr(base.frame_type, "value") else str(base.frame_type),
        base_prompt=normalized_base_prompt,
        rendered_prompt=rendered_prompt,
        selected_guidance=selected_guidance,
        dropped_guidance=dropped_guidance,
        selected_guidance_details=selected_guidance_details,
        dropped_guidance_details=dropped_guidance_details,
        images=[mapping.file_id for mapping in context.ordered_refs],
        mappings=context.ordered_refs,
    )


def to_rendered_shot_frame_prompt_read(
    *,
    derived: FrameDerivedPreview,
) -> RenderedShotFramePromptRead:
    return RenderedShotFramePromptRead(
        base_prompt=derived.base_prompt,
        rendered_prompt=derived.rendered_prompt,
        selected_guidance=derived.selected_guidance,
        dropped_guidance=derived.dropped_guidance,
        selected_guidance_details=derived.selected_guidance_details,
        dropped_guidance_details=derived.dropped_guidance_details,
        images=derived.images,
        mappings=derived.mappings,
    )
