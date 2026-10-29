"""Gói ngữ cảnh prompt video của shot và dịch vụ kết xuất mẫu nền.

Mô-đun này chỉ chịu trách nhiệm hai khả năng ổn định:

1. Dựng `ShotVideoPromptPackRead`
2. Render pack thành văn bản dựa theo mẫu

Xếp đặt xem trước và gửi video thống nhất đặt trong `app.services.studio.generation.video`.
"""

from __future__ import annotations

from typing import Any
import re

from fastapi import HTTPException, status
from langchain_core.prompts import PromptTemplate as LcPromptTemplate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.studio import Chapter, PromptCategory, PromptTemplate, Shot, ShotDetail
from app.schemas.studio.shots import (
    ActionBeatPhaseRead,
    ShotPromptAssetRef,
    ShotPromptCameraInfo,
    ShotVideoPromptPackRead,
)
from app.services.common import entity_not_found
from app.services.studio.action_beats import infer_action_beat_sequence
from app.services.studio.shot_assets_overview import get_shot_assets_overview


DEFAULT_VIDEO_NEGATIVE_PROMPT = (
    "Không thêm nhân vật không liên quan; không thay đổi thân phận nhân vật, màu trang phục và địa điểm bối cảnh;"
    "Không được có chữ chìm, chi tiết cơ thể méo, nhảy phân cảnh và chớp mờ khung hình."
)


def _enum_value(value: Any) -> str:
    if value is None:
        return ""
    raw = getattr(value, "value", value)
    return str(raw or "")


def _asset_ref_from_overview_item(item: Any) -> ShotPromptAssetRef:
    return ShotPromptAssetRef(
        type=item.type,
        name=item.name,
        description=item.description or "",
        file_id=item.file_id,
        thumbnail=item.thumbnail,
    )


def _pack_variables(pack: ShotVideoPromptPackRead) -> dict[str, Any]:
    """Phơi tên biến ổn định cho mẫu DB.

    Giữ nguyên cả biến phẳng lẫn `pack`, để mẫu có thể dần di chuyển sang cách viết cấu trúc hơn.
    """
    data = pack.model_dump()
    return {
        "pack": data,
        "shot_id": pack.shot_id,
        "shot_title": pack.title,
        "title": pack.title,
        "script_excerpt": pack.script_excerpt,
        "action_beats": "\n".join(pack.action_beats),
        "action_beats_text": "；".join(pack.action_beats),
        "previous_shot_summary": pack.previous_shot_summary,
        "next_shot_goal": pack.next_shot_goal,
        "continuity_guidance": pack.continuity_guidance,
        "composition_anchor": pack.composition_anchor,
        "screen_direction_guidance": pack.screen_direction_guidance,
        "dialogue_summary": pack.dialogue_summary,
        "characters": pack.characters,
        "character_names": "、".join(item.name for item in pack.characters),
        "scene": pack.scene,
        "scene_name": pack.scene.name if pack.scene else "",
        "props": pack.props,
        "prop_names": "、".join(item.name for item in pack.props),
        "costumes": pack.costumes,
        "costume_names": "、".join(item.name for item in pack.costumes),
        "camera": pack.camera,
        "camera_shot": pack.camera.camera_shot,
        "angle": pack.camera.angle,
        "movement": pack.camera.movement,
        "duration": pack.camera.duration or "",
        "atmosphere": pack.atmosphere,
        "visual_style": pack.visual_style,
        "style": pack.style,
        "negative_prompt": pack.negative_prompt,
    }


def _render_template(content: str, variables: dict[str, Any]) -> str:
    template = LcPromptTemplate.from_template(template=content, template_format="jinja2")
    render_vars = {name: variables.get(name, "") for name in template.input_variables}
    return template.format(**render_vars).strip()


def _build_guidance_suffix(pack: ShotVideoPromptPackRead) -> str:
    """Sinh một đoạn ràng buộc thực thi phân cảnh ổn định, dùng để bổ sung cho kết quả render mẫu."""
    lines: list[str] = []
    if pack.action_beats:
        lines.append(f"Nhịp hành động: {'；'.join(pack.action_beats)}")
    if pack.previous_shot_summary:
        lines.append(f"Tiếp nối phân cảnh trước: {pack.previous_shot_summary}")
    if pack.next_shot_goal:
        lines.append(f"Mục tiêu phân cảnh sau: {pack.next_shot_goal}")
    if pack.continuity_guidance:
        lines.append(f"Yêu cầu liên tục: {pack.continuity_guidance}")
    if pack.composition_anchor:
        lines.append(f"Mỏ neo bố cục: {pack.composition_anchor}")
    if pack.screen_direction_guidance:
        lines.append(f"Hướng và ánh mắt: {pack.screen_direction_guidance}")
    return "\n".join(lines).strip()


def enrich_rendered_video_prompt(
    *,
    rendered_prompt: str,
    pack: ShotVideoPromptPackRead,
) -> str:
    """Bổ sung các ràng buộc thực thi quan trọng cho kết quả render mẫu.

    Nếu mẫu không dùng tường minh các biến tính liên tục/bố cục mới, hệ thống sẽ tự động thêm một đoạn ràng buộc ổn định ở cuối,
    tránh những thông tin này chỉ dừng ở preview pack mà không thực sự vào prompt cuối.
    """
    text = str(rendered_prompt or "").strip()
    suffix = _build_guidance_suffix(pack)
    if not suffix:
        return text

    normalized = text.replace(" ", "")
    if any(
        marker.replace(" ", "") in normalized
        for marker in (
            "Nhịp hành động:",
            "Tiếp nối phân cảnh trước:",
            "Mục tiêu phân cảnh sau:",
            "Yêu cầu liên tục:",
            "Mỏ neo bố cục:",
            "Hướng và ánh mắt:",
        )
    ):
        return text

    if not text:
        return suffix
    return f"{text}\n\n{suffix}".strip()


def _split_beats(*values: str) -> list[str]:
    """Tách theo quy tắc ngắt câu tiếng Trung phổ biến thành ứng viên nhịp hành động."""
    parts: list[str] = []
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        for piece in re.split(r"[。！？；\n]+", text):
            item = piece.strip("，,、 ").strip()
            if len(item) >= 4:
                parts.append(item)
    return parts


def _dedupe_keep_order(items: list[str], *, limit: int = 4) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
        if len(result) >= limit:
            break
    return result


def _build_action_beats(
    *,
    confirmed_action_beats: list[str] | None,
    script_excerpt: str,
    shot_description: str,
    dialogue_summary: str,
) -> list[str]:
    """Rút ra nhịp hành động trong phân cảnh từ trích đoạn kịch bản, mô tả phân cảnh và thoại."""
    confirmed = _dedupe_keep_order(list(confirmed_action_beats or []), limit=4)
    if confirmed:
        return confirmed
    beat_candidates = _split_beats(shot_description, script_excerpt)
    dialogue_candidates = [
        f"Đẩy tiến thoại: {item}"
        for item in _split_beats(dialogue_summary)
        if len(item) <= 24
    ]
    return _dedupe_keep_order(beat_candidates + dialogue_candidates, limit=4)


def _build_neighbor_prompt_summary(shot: Shot | None) -> tuple[str, str]:
    """Tạo bản tóm tắt và mục tiêu tiếp nối của phân cảnh liền kề."""
    if shot is None:
        return "", ""
    detail = getattr(shot, "detail", None)
    scene_name = str(getattr(getattr(detail, "scene", None), "name", "") or "").strip()
    shot_description = str(getattr(detail, "description", "") or "").strip()
    camera_parts = [
        _enum_value(getattr(detail, "camera_shot", None)),
        _enum_value(getattr(detail, "angle", None)),
        _enum_value(getattr(detail, "movement", None)),
    ]
    summary_parts = [
        f"Tiêu đề:{str(shot.title or '').strip()}" if str(shot.title or '').strip() else "",
        f"Bối cảnh:{scene_name}" if scene_name else "",
        f"Ngôn ngữ điện ảnh: {' / '.join(part for part in camera_parts if part)}" if any(camera_parts) else "",
        f"Trạng thái khung hình: {shot_description}" if shot_description else "",
        f"Trích đoạn kịch bản: {str(shot.script_excerpt or '').strip()}" if str(shot.script_excerpt or '').strip() else "",
    ]
    compact = "；".join(part for part in summary_parts if part)
    goal_parts = [
        f"Tiêu đề:{str(shot.title or '').strip()}" if str(shot.title or '').strip() else "",
        shot_description or str(shot.script_excerpt or "").strip(),
    ]
    goal = "；".join(part for part in goal_parts if part)
    return compact, goal


def _build_continuity_guidance(
    *,
    current_shot: Shot,
    previous_shot: Shot | None,
    next_shot: Shot | None,
) -> str:
    """Gợi ý tính liên tục khi xây dựng prompt video."""
    detail = getattr(current_shot, "detail", None)
    current_scene_id = str(getattr(detail, "scene_id", "") or "")
    tips: list[str] = []
    if previous_shot is not None:
        tips.append("tiếp nối hành động, hướng nhìn hoặc cảm xúc của shot trước, đừng như cảnh mới bắt đầu lại")
        previous_detail = getattr(previous_shot, "detail", None)
        previous_scene_id = str(getattr(previous_detail, "scene_id", "") or "")
        if current_scene_id and previous_scene_id and current_scene_id == previous_scene_id:
            tips.append("Khi cùng bối cảnh với phân cảnh trước, giữ trục không gian và định hướng nhân vật ổn định")
    if next_shot is not None:
        tips.append("ở kết thúc shot này tạo khép lại tự nhiên, để lại điểm rơi hành động hoặc cảm xúc cho shot tiếp")
        next_detail = getattr(next_shot, "detail", None)
        next_scene_id = str(getattr(next_detail, "scene_id", "") or "")
        if current_scene_id and next_scene_id and current_scene_id == next_scene_id:
            tips.append("Khi cùng bối cảnh với phân cảnh tiếp theo, giữ trọng tâm thị giác liên tục, tránh nhảy trục đột ngột")
    return "；".join(tips)


def _build_composition_anchor(
    *,
    shot: Shot,
    previous_shot: Shot | None,
    next_shot: Shot | None,
    scene_name: str,
    character_names: list[str],
) -> str:
    """Xây dựng gợi ý bố cục cảnh quay và mỏ neo không gian ổn định cho prompt video."""
    detail = getattr(shot, "detail", None)
    camera_shot = _enum_value(getattr(detail, "camera_shot", None))
    movement = _enum_value(getattr(detail, "movement", None))
    anchors: list[str] = []

    if camera_shot in {"ECU", "CU"}:
        anchors.append("lấy biểu cảm nhân vật hoặc chi tiết hành động chính làm trọng tâm khung, môi trường chỉ giữ đường nét cần thiết")
    elif camera_shot in {"MS", "FS"}:
        anchors.append("giữ vị trí tương đối giữa nhân vật và môi trường dễ đọc, tránh chủ thể trôi trong không gian trống")
    else:
        anchors.append("Thiết lập chiều sâu bối cảnh và vị trí đứng chủ thể trước, rồi mới đẩy biểu hiện hành động")

    if movement in {"DOLLY_IN", "ZOOM_IN"}:
        anchors.append("Trọng tâm phân cảnh nên dần thu về chủ thể, tạo cảm giác tiến lên")
    elif movement in {"DOLLY_OUT", "ZOOM_OUT"}:
        anchors.append("Trọng tâm phân cảnh có thể lùi từ chủ thể về bối cảnh, nhấn mạnh sự mở rộng không gian")
    elif movement == "STATIC":
        anchors.append("Giữ vị trí chủ thể trong khung hình ổn định, tránh trọng tâm nhảy đột ngột")

    if scene_name:
        anchors.append(f"lấy bối cảnh {scene_name} làm neo không gian chính")
    if character_names:
        anchors.append(f"Cố định logic hướng thân và tầm nhìn của nhân vật {'、'.join(character_names[:2])}")

    current_scene_id = str(getattr(detail, "scene_id", "") or "")
    previous_scene_id = str(getattr(getattr(previous_shot, "detail", None), "scene_id", "") or "")
    next_scene_id = str(getattr(getattr(next_shot, "detail", None), "scene_id", "") or "")
    if previous_shot is not None and current_scene_id and current_scene_id == previous_scene_id:
        anchors.append("khi cùng bối cảnh với shot trước, tiếp nối trục không gian và hướng nhìn có sẵn")
    if next_shot is not None and current_scene_id and current_scene_id == next_scene_id:
        anchors.append("Khi cùng bối cảnh với phân cảnh tiếp theo, giữ điểm rơi thị giác có thể nối tiếp tự nhiên")

    return "；".join(anchors)


def _build_screen_direction_guidance(
    *,
    shot: Shot,
    previous_shot: Shot | None,
    next_shot: Shot | None,
    dialogue_summary: str,
    character_names: list[str],
) -> str:
    """Tạo gợi ý hướng người, đường nhìn và trục trái/phải của phân cảnh video."""
    detail = getattr(shot, "detail", None)
    angle = _enum_value(getattr(detail, "angle", None))
    guidance: list[str] = []

    if angle == "OVER_SHOULDER":
        guidance.append("giữ ổn định vị trí vai tiền cảnh của cảnh qua vai (over-shoulder), không đổi quan hệ trái/phải vô cớ")
    elif angle == "EYE_LEVEL":
        guidance.append("giữ hướng nhìn ngang và điểm nhìn của nhân vật liên tục, tránh lật mặt đột ngột giữa các shot")
    else:
        guidance.append("Làm rõ định hướng nhân vật và điểm rơi ánh mắt, tránh nhảy trục và đổi hướng đột ngột")

    if dialogue_summary.strip():
        guidance.append("shot do thoại dẫn nên ưu tiên giữ logic nhìn đối giữa người nói và người nghe")
    if len(character_names) >= 2:
        guidance.append(f"Vị trí đứng trái-phải và hướng nhìn đối diện giữa nhân vật {character_names[0]} và {character_names[1]} nên được giữ ổn định")
    elif character_names:
        guidance.append(f"hướng nhìn của nhân vật {character_names[0]} nên được giữ liên tục giữa các phân cảnh liền kề")

    current_scene_id = str(getattr(detail, "scene_id", "") or "")
    previous_scene_id = str(getattr(getattr(previous_shot, "detail", None), "scene_id", "") or "")
    next_scene_id = str(getattr(getattr(next_shot, "detail", None), "scene_id", "") or "")
    if previous_shot is not None and current_scene_id and current_scene_id == previous_scene_id:
        guidance.append("khi cùng bối cảnh với shot trước, không xoay hướng trái/phải của nhân vật vô cớ")
    if next_shot is not None and current_scene_id and current_scene_id == next_scene_id:
        guidance.append("khi cùng bối cảnh với shot tiếp theo, giữ hướng nhìn có thể tiếp nối cho shot sau")

    return "；".join(guidance)


def _fallback_video_prompt(pack: ShotVideoPromptPackRead) -> str:
    style_text = "，".join(x for x in [pack.visual_style, pack.style] if x)
    camera_text = " / ".join(x for x in [pack.camera.camera_shot, pack.camera.angle, pack.camera.movement] if x)
    parts = [
        f"Tiêu đề phân cảnh: {pack.title}",
        f"Trích đoạn kịch bản: {pack.script_excerpt}",
        f"Nhịp hành động: {'；'.join(pack.action_beats)}" if pack.action_beats else "",
        f"Phong cách khung hình: {style_text}",
        f"Ngôn ngữ điện ảnh: {camera_text}",
        f"Thời lượng: {pack.camera.duration} giây" if pack.camera.duration else "",
        f"Bối cảnh: {pack.scene.name if pack.scene else ''}",
        f"Nhân vật: {'、'.join(item.name for item in pack.characters)}",
        f"Đạo cụ: {'、'.join(item.name for item in pack.props)}",
        f"Trang phục: {'、'.join(item.name for item in pack.costumes)}",
        f"Tóm tắt thoại: {pack.dialogue_summary}",
        f"Phân cảnh trước: {pack.previous_shot_summary}" if pack.previous_shot_summary else "",
        f"Mục tiêu phân cảnh sau: {pack.next_shot_goal}" if pack.next_shot_goal else "",
        f"Yêu cầu liên tục: {pack.continuity_guidance}" if pack.continuity_guidance else "",
        f"Mỏ neo bố cục: {pack.composition_anchor}" if pack.composition_anchor else "",
        f"Hướng và ánh mắt: {pack.screen_direction_guidance}" if pack.screen_direction_guidance else "",
        f"Không khí: {pack.atmosphere}",
        f"Ràng buộc tiêu cực: {pack.negative_prompt}",
    ]
    return "\n".join(part for part in parts if part.split(": ", 1)[-1].strip())


async def _resolve_video_prompt_template(
    db: AsyncSession,
    *,
    template_id: str | None,
) -> PromptTemplate | None:
    if template_id:
        template = await db.get(PromptTemplate, template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=entity_not_found("PromptTemplate"))
        if template.category != PromptCategory.video_prompt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PromptTemplate is not video_prompt category")
        return template

    stmt = (
        select(PromptTemplate)
        .where(PromptTemplate.category == PromptCategory.video_prompt)
        .order_by(PromptTemplate.is_default.desc(), PromptTemplate.updated_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalars().first()


async def build_shot_video_prompt_pack(
    db: AsyncSession,
    *,
    shot_id: str,
) -> ShotVideoPromptPackRead:
    stmt = (
        select(Shot)
        .options(
            selectinload(Shot.detail).selectinload(ShotDetail.dialog_lines),
            selectinload(Shot.chapter).selectinload(Chapter.project),
        )
        .where(Shot.id == shot_id)
    )
    shot = (await db.execute(stmt)).scalar_one_or_none()
    if shot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=entity_not_found("Shot"))

    detail = shot.detail
    project = getattr(getattr(shot, "chapter", None), "project", None)
    overview = await get_shot_assets_overview(db, shot_id=shot_id)
    neighbors_stmt = (
        select(Shot)
        .options(selectinload(Shot.detail).selectinload(ShotDetail.scene))
        .where(
            Shot.chapter_id == shot.chapter_id,
            Shot.index.in_([shot.index - 1, shot.index + 1]),
        )
    )
    neighbor_rows = (await db.execute(neighbors_stmt)).scalars().all()
    previous_shot = next((item for item in neighbor_rows if item.index == shot.index - 1), None)
    next_shot = next((item for item in neighbor_rows if item.index == shot.index + 1), None)

    characters: list[ShotPromptAssetRef] = []
    props: list[ShotPromptAssetRef] = []
    costumes: list[ShotPromptAssetRef] = []
    scene: ShotPromptAssetRef | None = None
    for item in overview.items:
        if not item.is_linked:
            continue
        ref = _asset_ref_from_overview_item(item)
        if item.type == "character":
            characters.append(ref)
        elif item.type == "prop":
            props.append(ref)
        elif item.type == "costume":
            costumes.append(ref)
        elif item.type == "scene" and scene is None:
            scene = ref

    dialog_lines = list(getattr(detail, "dialog_lines", []) or []) if detail is not None else []
    dialogue_summary = "\n".join(
        f"{line.speaker_name or 'Nhân vật'}: {line.text}" if line.speaker_name else line.text
        for line in sorted(dialog_lines, key=lambda x: (x.index, x.id))
        if line.text
    )
    previous_shot_summary, _ = _build_neighbor_prompt_summary(previous_shot)
    _, next_shot_goal = _build_neighbor_prompt_summary(next_shot)
    action_beats = _build_action_beats(
        confirmed_action_beats=list(getattr(detail, "action_beats", []) or []),
        script_excerpt=shot.script_excerpt or "",
        shot_description=str(getattr(detail, "description", "") or ""),
        dialogue_summary=dialogue_summary,
    )

    return ShotVideoPromptPackRead(
        shot_id=shot.id,
        title=shot.title or "",
        script_excerpt=shot.script_excerpt or "",
        action_beats=action_beats,
        action_beat_phases=[
            ActionBeatPhaseRead(text=item.text, phase=item.phase)
            for item in infer_action_beat_sequence(action_beats)
        ],
        previous_shot_summary=previous_shot_summary,
        next_shot_goal=next_shot_goal,
        continuity_guidance=_build_continuity_guidance(
            current_shot=shot,
            previous_shot=previous_shot,
            next_shot=next_shot,
        ),
        composition_anchor=_build_composition_anchor(
            shot=shot,
            previous_shot=previous_shot,
            next_shot=next_shot,
            scene_name=scene.name if scene else "",
            character_names=[item.name for item in characters],
        ),
        screen_direction_guidance=_build_screen_direction_guidance(
            shot=shot,
            previous_shot=previous_shot,
            next_shot=next_shot,
            dialogue_summary=dialogue_summary,
            character_names=[item.name for item in characters],
        ),
        dialogue_summary=dialogue_summary,
        characters=characters,
        scene=scene,
        props=props,
        costumes=costumes,
        camera=ShotPromptCameraInfo(
            camera_shot=_enum_value(getattr(detail, "camera_shot", None)),
            angle=_enum_value(getattr(detail, "angle", None)),
            movement=_enum_value(getattr(detail, "movement", None)),
            duration=getattr(detail, "duration", None),
        ),
        atmosphere=str(getattr(detail, "atmosphere", "") or ""),
        visual_style=_enum_value(getattr(project, "visual_style", None)),
        style=_enum_value(getattr(project, "style", None)),
        negative_prompt=DEFAULT_VIDEO_NEGATIVE_PROMPT,
    )
