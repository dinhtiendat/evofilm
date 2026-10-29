from __future__ import annotations

import re

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.chains.agents import (
    ShotFirstFramePromptAgent,
    ShotKeyFramePromptAgent,
    ShotLastFramePromptAgent,
)
from app.core.db import async_session_maker
from app.core.task_manager import SqlAlchemyTaskStore
from app.core.task_manager.types import TaskStatus
from app.models.studio import (
    Chapter,
    Character,
    Costume,
    ProjectCostumeLink,
    ProjectPropLink,
    ProjectSceneLink,
    Prop,
    Scene,
    Shot,
    ShotCharacterLink,
    ShotDetail,
)
from app.services.llm.runtime import build_default_text_llm_sync
from app.services.common import entity_not_found, invalid_choice
from app.services.studio.action_beats import infer_action_beat_sequence, pick_action_beat_for_frame
from app.services.studio.shot_status import recompute_shot_status
from app.services.worker.async_task_support import cancel_if_requested_async
from app.services.worker.task_logging import log_task_event, log_task_failure


def normalize_frame_type(frame_type: str) -> str:
    value = (frame_type or "").strip().lower()
    if value not in {"first", "last", "key"}:
        raise HTTPException(status_code=400, detail=invalid_choice("frame_type", ["first", "last", "key"]))
    return value


def relation_type_for_frame(frame_type: str) -> str:
    if frame_type == "first":
        return "shot_first_frame_prompt"
    if frame_type == "last":
        return "shot_last_frame_prompt"
    return "shot_key_frame_prompt"


def _enum_value(value: object | None) -> str:
    if value is None:
        return ""
    raw = getattr(value, "value", value)
    return str(raw or "")


def _compact_text(value: str | None) -> str:
    return str(value or "").strip()


def _join_context_lines(lines: list[str]) -> str:
    cleaned = [line for line in lines if line]
    return "\n".join(cleaned) if cleaned else "Không có"


def _build_character_context(characters: list[Character]) -> str:
    lines: list[str] = []
    for character in characters:
        fragments: list[str] = []
        if _compact_text(character.description):
            fragments.append(_compact_text(character.description))
        actor = getattr(character, "actor", None)
        if actor is not None and _compact_text(getattr(actor, "name", None)):
            actor_desc = f"Hình tượng diễn viên: {_compact_text(getattr(actor, 'name', None))}"
            if _compact_text(getattr(actor, "description", None)):
                actor_desc += f"({_compact_text(getattr(actor, 'description', None))})"
            fragments.append(actor_desc)
        costume = getattr(character, "costume", None)
        if costume is not None and _compact_text(getattr(costume, "name", None)):
            costume_desc = f"Trang phục mặc định: {_compact_text(getattr(costume, 'name', None))}"
            if _compact_text(getattr(costume, "description", None)):
                costume_desc += f"({_compact_text(getattr(costume, 'description', None))})"
            fragments.append(costume_desc)
        line = f"- {character.name}"
        if fragments:
            line += f": {'；'.join(fragments)}"
        lines.append(line)
    return _join_context_lines(lines)


def _build_named_asset_context(assets: list[Scene] | list[Prop] | list[Costume]) -> str:
    lines: list[str] = []
    for asset in assets:
        line = f"- {asset.name}"
        if _compact_text(getattr(asset, "description", None)):
            line += f": {_compact_text(getattr(asset, 'description', None))}"
        lines.append(line)
    return _join_context_lines(lines)


def _build_subject_priority(
    *,
    characters: list[Character],
    scenes: list[Scene],
    props: list[Prop],
    costumes: list[Costume],
) -> str:
    parts: list[str] = []
    if characters:
        primary_names = "、".join(character.name for character in characters[:2])
        parts.append(f"ưu tiên lấy nhân vật {primary_names} làm chủ thể khung")
        if len(characters) > 2:
            support_names = "、".join(character.name for character in characters[2:])
            parts.append(f"Các nhân vật khác {support_names} chỉ bổ sung khi củng cố được mối quan hệ khung hình")
    if scenes:
        parts.append(f"ưu tiên xây dựng thông tin môi trường của bối cảnh {scenes[0].name}")
    if props:
        prop_names = "、".join(prop.name for prop in props[:2])
        parts.append(f"Đạo cụ {prop_names} chỉ ghi chú trọng khi vào hành động chính hoặc điểm tiêu bố cục")
    if costumes:
        costume_names = "、".join(costume.name for costume in costumes[:2])
        parts.append(f"Trang phục {costume_names} chủ yếu dùng để tăng cường tính nhất quán ngoại hình nhân vật, không cần chiếm spotlight")
    return "；".join(parts) if parts else "Ưu tiên làm nổi bật nhân vật chính và bối cảnh chính dựa trên thông tin phân cảnh, không cần dàn đều cho mọi yếu tố"


def _truncate_for_prompt(value: str | None, *, limit: int = 80) -> str:
    text = _compact_text(value)
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def _summarize_neighbor_shot(shot: Shot | None) -> tuple[str, str, str]:
    """Sinh tiêu đề, trích đoạn và tóm tắt trạng thái của các phân cảnh liền kề, dùng cho prompt liên tục."""
    if shot is None:
        return "", "", ""
    detail = getattr(shot, "detail", None)
    scene_name = _compact_text(getattr(getattr(detail, "scene", None), "name", None))
    camera_parts = [
        _enum_value(getattr(detail, "camera_shot", None)),
        _enum_value(getattr(detail, "angle", None)),
        _enum_value(getattr(detail, "movement", None)),
    ]
    camera_text = " / ".join(part for part in camera_parts if part)
    description = _truncate_for_prompt(getattr(detail, "description", None), limit=60)
    summary_parts = [
        f"Bối cảnh: {scene_name}" if scene_name else "",
        f"Ngôn ngữ điện ảnh: {camera_text}" if camera_text else "",
        f"Trạng thái khung: {description}" if description else "",
    ]
    return (
        _compact_text(getattr(shot, "title", None)),
        _truncate_for_prompt(getattr(shot, "script_excerpt", None), limit=80),
        "; ".join(part for part in summary_parts if part),
    )


def _build_continuity_guidance(
    *,
    previous_shot: Shot | None,
    current_shot: Shot,
    next_shot: Shot | None,
) -> str:
    """Tạo ràng buộc liên tục đơn giản dựa trên quan hệ phân cảnh lân cận.。"""
    guidance: list[str] = []
    current_detail = getattr(current_shot, "detail", None)
    current_scene_id = str(getattr(current_detail, "scene_id", "") or "")
    previous_detail = getattr(previous_shot, "detail", None) if previous_shot else None
    next_detail = getattr(next_shot, "detail", None) if next_shot else None
    previous_scene_id = str(getattr(previous_detail, "scene_id", "") or "")
    next_scene_id = str(getattr(next_detail, "scene_id", "") or "")

    if previous_shot is not None:
        guidance.append("shot hiện tại nên tiếp nối hành động và cảm xúc của shot trước, đừng như cảnh hoàn toàn mới bắt đầu lại")
        if current_scene_id and previous_scene_id and current_scene_id == previous_scene_id:
            guidance.append("Phân cảnh trước và phân cảnh hiện tại ở cùng một bối cảnh, ưu tiên giữ trục không gian và hướng chủ thể ổn định")
        if _enum_value(getattr(previous_detail, "movement", None)) and _enum_value(getattr(current_detail, "movement", None)):
            guidance.append("nếu ngôn ngữ điện ảnh không thay đổi rõ, nên xem là tiếp nối hoặc tiếp tục trong cùng chuỗi hành động")

    if next_shot is not None:
        guidance.append("Phân cảnh hiện tại nên hình thành khép lại tự nhiên, dự phòng điểm rơi hành động hoặc cảm xúc cho phân cảnh tiếp theo, tránh cắt cứng")
        if current_scene_id and next_scene_id and current_scene_id == next_scene_id:
            guidance.append("Phân cảnh tiếp theo và phân cảnh hiện tại ở cùng một bối cảnh, cố gắng giữ trọng tâm thị giác và quan hệ không gian có thể tiếp nối liên tục")

    return "；".join(guidance)


def _build_composition_anchor(
    *,
    detail: ShotDetail,
    previous_shot: Shot | None,
    next_shot: Shot | None,
    characters: list[Character],
    scenes: list[Scene],
) -> str:
    """Tạo gợi ý mỏ neo bố cục dựa trên ngôn ngữ phân cảnh và quan hệ phân cảnh lân cận.。"""
    anchors: list[str] = []
    camera_shot = _enum_value(detail.camera_shot)
    movement = _enum_value(detail.movement)

    if camera_shot in {"ECU", "CU"}:
        anchors.append("lấy khuôn mặt hoặc hành động chính của nhân vật chính làm trọng tâm khung, giảm nhiễu môi trường")
    elif camera_shot in {"MS", "FS"}:
        anchors.append("giữ nhân vật và môi trường đều dễ đọc cùng lúc, tránh chỉ còn cận cảm xúc hoặc chỉ còn không gian trống")
    else:
        anchors.append("Ưu tiên thiết lập quan hệ không gian, sau đó mới nổi bật hành động nhân vật chính")

    if movement in {"DOLLY_IN", "ZOOM_IN"}:
        anchors.append("bố cục nên thể hiện xu hướng nhìn tiến về phía chủ thể, tiêu điểm dần khép vào nhân vật chính")
    elif movement in {"DOLLY_OUT", "ZOOM_OUT"}:
        anchors.append("bố cục nên thể hiện xu hướng lùi từ chủ thể ra môi trường, giữ nhiều thông tin không gian hơn")
    elif movement == "STATIC":
        anchors.append("giữ bố cục ổn định, không đổi trọng tâm vị trí chủ thể trong khung vô cớ")

    if scenes:
        anchors.append(f"Lấy bối cảnh {scenes[0].name} làm mỏ neo không gian, đảm bảo quan hệ chủ thể và môi trường rõ ràng")
    if characters:
        anchors.append(f"Ưu tiên cố định hướng thân và tầm nhìn của nhân vật {characters[0].name}, không được tự ý đảo ngược quan hệ trái phải")

    if previous_shot is not None and str(getattr(getattr(previous_shot, 'detail', None), 'scene_id', '') or '') == str(detail.scene_id or ''):
        anchors.append("khi cùng bối cảnh với shot trước, cố gắng tiếp nối cùng trục không gian và hướng xoay chủ thể")
    if next_shot is not None and str(getattr(getattr(next_shot, 'detail', None), 'scene_id', '') or '') == str(detail.scene_id or ''):
        anchors.append("khi cùng bối cảnh với shot tiếp theo, giữ điểm nhìn và hướng không gian ổn định cho shot tiếp theo")

    return "；".join(anchors)


def _build_screen_direction_guidance(
    *,
    detail: ShotDetail,
    previous_shot: Shot | None,
    next_shot: Shot | None,
    dialogue_summary: str,
    character_names: list[str],
) -> str:
    """Tạo gợi ý hướng người, ánh nhìn và trục trái-phải."""
    guidance: list[str] = []
    angle = _enum_value(detail.angle)

    if angle == "OVER_SHOULDER":
        guidance.append("shot hiện tại là góc qua vai, nên giữ quan hệ trái/phải giữa vai tiền cảnh và đối tượng được nhìn ổn định")
    elif angle == "EYE_LEVEL":
        guidance.append("ưu tiên giữ hướng nhìn ngang và hướng nhìn đối xứng của nhân vật ổn định, tránh xoay trái/phải vô cớ")
    else:
        guidance.append("nêu rõ hướng xoay và điểm nhìn của chủ thể, tránh nhân vật đổi hướng đột ngột hoặc nhảy trục")

    if dialogue_summary.strip():
        guidance.append("khi có thoại, ưu tiên đảm bảo quan hệ hướng nhìn giữa người nói và người nghe liên tục")
    if len(character_names) >= 2:
        guidance.append(f"Vị trí đứng trái-phải và hướng nhìn đối diện giữa nhân vật {character_names[0]} và {character_names[1]} nên được giữ nhất quán")
    elif character_names:
        guidance.append(f"hướng thân và điểm nhìn của nhân vật {character_names[0]} nên được giữ liên tục giữa các phân cảnh liền kề")

    current_scene_id = str(detail.scene_id or "")
    previous_scene_id = str(getattr(getattr(previous_shot, "detail", None), "scene_id", "") or "")
    next_scene_id = str(getattr(getattr(next_shot, "detail", None), "scene_id", "") or "")
    if previous_shot is not None and current_scene_id and current_scene_id == previous_scene_id:
        guidance.append("khi cùng bối cảnh với shot trước, không xoay hướng và trục trái/phải của nhân vật vô cớ")
    if next_shot is not None and current_scene_id and current_scene_id == next_scene_id:
        guidance.append("khi cùng bối cảnh với shot tiếp theo, kết thúc shot hiện tại nên giữ hướng nhìn có thể tiếp nối")

    return "；".join(guidance)


_SEQUENTIAL_REACTION_KEYWORDS = (
    "nghe thấy",
    "nghe tiếng",
    "đột nhiên",
    "đột ngột",
    "vô thức",
    "ngay lập tức",
    "ngay sau đó",
    "rồi sau đó",
    "rơi khỏi tay",
    "rơi xuống đất",
    "che tai",
    "che",
    "quỳ xuống",
    "quỳ",
    "ngã ngồi bệt",
    "quay người",
    "quay lại",
)


def _has_sequential_reaction_chain(*values: str | None) -> bool:
    """Xác định văn bản có chứa chuỗi phản ứng liên tiếp rõ ràng hay không, để dùng cho trọng số cắt thời gian khung hình đầu."""
    text = " ".join(_compact_text(value) for value in values if _compact_text(value))
    if not text:
        return False
    lowered = text.lower()
    keyword_hits = sum(1 for keyword in _SEQUENTIAL_REACTION_KEYWORDS if keyword.lower() in lowered)
    # Đếm dấu ngắt câu bằng ngôn ngữ trung lập (dấu ASCII lẫn CJK) để hoạt động trên văn bản đã dịch.
    punctuation_hits = (
        text.count(",") + text.count(";") + text.count("，") + text.count("；") + text.count("、")
    )
    return keyword_hits >= 2 or (keyword_hits >= 1 and punctuation_hits >= 2)


def _build_frame_specific_guidance(
    *,
    frame_type: str,
    previous_shot: Shot | None,
    next_shot: Shot | None,
    detail: ShotDetail,
    script_excerpt: str,
    action_beats: list[str],
) -> str:
    """Sinh prompt chuyên biệt theo khung hình đầu/khung hình chính/khung hình cuối, làm rõ khác biệt trách nhiệm giữa ba loại khung hình."""
    guidance: list[str] = []
    if frame_type == "first":
        guidance.append("Khung hình đầu nên ưu tiên thiết lập không gian, vị trí đứng ban đầu của chủ thể và ấn tượng thị giác từ ánh nhìn đầu tiên, không nhảy thẳng vào hậu cảnh của hành động")
        guidance.append("Khung đầu chỉ thể hiện khoảnh khắc kích hoạt sự kiện hoặc trạng thái ban đầu của phản ứng đầu tiên, không viết trực tiếp thành hành động đã hoàn tất, tư thế cuối cùng hay kết quả bùng nổ cảm xúc")
        guidance.append("Nếu kịch bản có chuỗi phản ứng liên tục, ưu tiên viết thành trạng thái hành động vừa bắt đầu, chưa hoàn tất hoặc bị ngắt, ví dụ tay vừa buông ra, cơ thể bất chợt đông cứng, nhân vật chưa hoàn toàn khom xuống")
        if _has_sequential_reaction_chain(script_excerpt, detail.description):
            guidance.append("Phân cảnh hiện tại có chuỗi phản ứng liên tục rõ rệt, khung hình đầu phải cắt đúng khoảnh khắc thấy được sớm nhất sau khi kích hoạt, cấm đặt thẳng vào trạng thái che tai, khom xuống, ngã khuỵu hay hoàn tất quay người")
        if previous_shot is not None:
            guidance.append("Khung hình đầu cần tiếp nối trạng thái kết thúc của phân cảnh trước, nhưng vẫn giúp người xem nhanh nhận ra không gian hiện tại và trạng thái ban đầu của chủ thể")
        if _enum_value(detail.camera_shot) in {"LS", "ELS", "MLS"}:
            guidance.append("khi cận hiện tại rộng, ưu tiên nói rõ môi trường, quan hệ vị trí nhân vật và hướng tiến vào")
    elif frame_type == "last":
        guidance.append("Khung hình cuối nên nhấn mạnh khép lại hành động, dư âm cảm xúc hoặc điểm dừng của ánh mắt, không mở lại điểm khởi đầu hành động mới")
        if next_shot is not None:
            guidance.append("khung cuối nên để lại tư thế, hướng nhìn hoặc điểm rơi cảm xúc nối tự nhiên cho shot tiếp theo")
        guidance.append("Tư thế chủ thể trong khung hình cuối nên ổn định hơn, dễ cho phân cảnh sau tiếp nối")
    else:
        guidance.append("Khung hình chính nên chốt khoảnh khắc có sức căng kịch tính hoặc mật độ thông tin cao nhất trong phân cảnh, không mô tả đều toàn bộ quá trình")
        guidance.append("ưu tiên chọn khoảnh khắc đỉnh hành động, điểm nổ cảm xúc hoặc bố cục tiêu biểu nhất")
        if _enum_value(detail.movement) in {"DOLLY_IN", "ZOOM_IN", "TRACK"}:
            guidance.append("Nếu phân cảnh có đường đi hoặc quay theo, khung hình chính nên thể hiện khung hình chặt chẽ nhất, có áp lực nhất trong quá trình chuyển động")
    beat_item = pick_action_beat_for_frame(frame_type, action_beats)
    if beat_item is not None:
        phase_label = {
            "trigger": "trigger: Giai đoạn kích hoạt",
            "peak": "peak: Giai đoạn đỉnh",
            "aftermath": "aftermath: Giai đoạn khép lại",
        }.get(beat_item.phase, "Giai đoạn hiện tại")
        guidance.append(f"Khung hình hiện tại ưu tiên tổ chức cảnh quay quanh mốc hành động “{beat_item.text}” ({phase_label}), không nhảy cấp sang giai đoạn khác")
    return "；".join(guidance)


def _format_action_beat_phase_summary(action_beats: list[str]) -> str:
    """Định dạng tóm tắt giai đoạn mốc hành động, dùng chung cho input agent và xem trước gỡ lỗi."""
    sequence = infer_action_beat_sequence(action_beats)
    phase_labels = {
        "trigger": "trigger: Kích hoạt",
        "peak": "peak: Đỉnh",
        "aftermath": "aftermath: Khép lại",
    }
    return "；".join(
        f"{index + 1}. {phase_labels.get(item.phase, item.phase)} · {item.text}"
        for index, item in enumerate(sequence)
    )


def _same_scene(shot: Shot | None, current_scene_id: str) -> bool:
    """Xác định phân cảnh lân cận có cùng bối cảnh với phân cảnh hiện tại hay không.。"""
    return bool(
        shot is not None
        and current_scene_id
        and str(getattr(getattr(shot, "detail", None), "scene_id", "") or "") == current_scene_id
    )


def _score_director_guidance_item(
    *,
    category: str,
    text: str,
    frame_type: str,
    has_dialogue: bool,
    character_count: int,
    same_scene_with_previous: bool,
    same_scene_with_next: bool,
    movement: str,
) -> int:
    """Điểm guidance câu, ưu tiên giữ ràng buộc ổn định tính liên tục phân cảnh hơn."""
    score = 0
    if category == "frame":
        score += 10
        if frame_type == "first" and ("thiết lập không gian" in text or "trạng thái ban đầu" in text):
            score += 5
        if frame_type == "first" and ("khoảnh khắc kích hoạt" in text or "hành động hoàn tất phía sau" in text or "chưa hoàn tất" in text):
            score += 6
        if frame_type == "first" and ("chuỗi phản ứng liên tục" in text or "khoảnh khắc hiển thị sớm nhất" in text or "trạng thái hoàn tất" in text):
            score += 8
        if frame_type == "key" and ("đỉnh hành động" in text or "căng thẳng kịch tính" in text or "điểm bùng cảm xúc" in text):
            score += 5
        if frame_type == "last" and ("khép lại hành động" in text or "dư âm cảm xúc" in text or "điểm dừng" in text):
            score += 5
    elif category == "continuity":
        score += 8
        if "Tiếp nối phân cảnh trước" in text:
            score += 3
            if same_scene_with_previous:
                score += 4
        if "phân cảnh tiếp theo" in text or "khép lại" in text:
            score += 3
            if same_scene_with_next:
                score += 4
        if "trục không gian" in text or "hướng chủ thể ổn định" in text or "trọng tâm thị giác" in text:
            score += 3
    elif category == "composition":
        score += 7
        if frame_type == "first" and ("mỏ neo không gian" in text or "thiết lập không gian" in text):
            score += 5
        if frame_type == "key" and ("trọng tâm khung hình" in text or "đẩy" in text or "điểm tiêu" in text):
            score += 4
        if frame_type == "last" and ("điểm kết về thị giác" in text or "hướng không gian" in text):
            score += 4
        if "khóa nhân vật" in text or "vị trí trọng tâm" in text:
            score += 2
    elif category == "screen":
        score += 6
        if "không tự ý lật" in text or "nhảy trục" in text:
            score += 5
        if has_dialogue and ("quan hệ ánh nhìn liên tục" in text or "hướng nhìn đối diện" in text):
            score += 5
        if character_count >= 2 and ("vị trí đứng trái phải" in text or "hướng nhìn nhau" in text):
            score += 4
        if same_scene_with_previous or same_scene_with_next:
            if "cùng bối cảnh" in text or "hướng nhìn" in text or "trục trái phải" in text:
                score += 4
        if frame_type == "last" and "hướng nhìn" in text:
            score += 2
    if movement in {"DOLLY_IN", "ZOOM_IN", "TRACK"} and category == "composition" and "đẩy" in text:
        score += 3
    return score


def _build_director_must_categories(
    *,
    frame_type: str,
    has_dialogue: bool,
    character_count: int,
    same_scene_with_previous: bool,
    same_scene_with_next: bool,
    movement: str,
) -> list[str]:
    """Dựa trên rủi ro của phân cảnh để động quyết định guidance nào nên được nâng thành mục bắt buộc."""
    if frame_type == "first":
        must_categories = ["frame", "continuity", "composition"]
    elif frame_type == "key":
        must_categories = ["frame", "composition", "continuity"]
    else:
        must_categories = ["frame", "continuity", "screen"]

    if movement in {"DOLLY_IN", "ZOOM_IN", "TRACK"} and "composition" in must_categories:
        must_categories = ["composition" if item == "composition" else item for item in must_categories]
        must_categories.insert(0, must_categories.pop(must_categories.index("composition")))

    if has_dialogue or character_count >= 2 or same_scene_with_previous or same_scene_with_next:
        if "screen" not in must_categories:
            insert_at = 2 if frame_type == "key" else 1
            must_categories.insert(min(insert_at, len(must_categories)), "screen")
        elif frame_type == "last":
            must_categories.insert(1, must_categories.pop(must_categories.index("screen")))

    deduped: list[str] = []
    for category in must_categories:
        if category not in deduped:
            deduped.append(category)
    return deduped[:4]


def _build_director_command_summary(
    *,
    frame_type: str,
    frame_specific_guidance: str,
    continuity_guidance: str,
    composition_anchor: str,
    screen_direction_guidance: str,
    has_dialogue: bool,
    character_count: int,
    same_scene_with_previous: bool,
    same_scene_with_next: bool,
    movement: str,
) -> str:
    """Nén nhiều loại guidance thành tóm tắt chỉ đạo đạo diễn ưu tiên cao."""
    seen: set[str] = set()

    def _split_bucket(category: str, block: str) -> list[str]:
        bucket: list[str] = []
        for piece in str(block or "").split("；"):
            text = piece.strip()
            if not text or text in seen:
                continue
            seen.add(text)
            bucket.append(text)
        return sorted(
            bucket,
            key=lambda item: _score_director_guidance_item(
                category=category,
                text=item,
                frame_type=frame_type,
                has_dialogue=has_dialogue,
                character_count=character_count,
                same_scene_with_previous=same_scene_with_previous,
                same_scene_with_next=same_scene_with_next,
                movement=movement,
            ),
            reverse=True,
        )

    buckets = {
        "frame": _split_bucket("frame", frame_specific_guidance),
        "continuity": _split_bucket("continuity", continuity_guidance),
        "composition": _split_bucket("composition", composition_anchor),
        "screen": _split_bucket("screen", screen_direction_guidance),
    }
    must_categories = _build_director_must_categories(
        frame_type=frame_type,
        has_dialogue=has_dialogue,
        character_count=character_count,
        same_scene_with_previous=same_scene_with_previous,
        same_scene_with_next=same_scene_with_next,
        movement=movement,
    )

    must_items: list[str] = []
    prefer_items: list[str] = []
    consumed_must_items: set[str] = set()

    for category in must_categories:
        bucket = buckets.get(category) or []
        if bucket:
            must_items.append(bucket[0])
            consumed_must_items.add(bucket[0])

    frame_bucket = buckets.get("frame") or []
    if frame_type == "first" and len(frame_bucket) > 1:
        primary_frame_item = frame_bucket[0]
        if any(keyword in primary_frame_item for keyword in ("chuỗi phản ứng liên tục", "khoảnh khắc kích hoạt", "chưa hoàn tất", "trạng thái hoàn tất")):
            secondary_frame_item = frame_bucket[1]
            if secondary_frame_item not in consumed_must_items:
                must_items.append(secondary_frame_item)
                consumed_must_items.add(secondary_frame_item)

    for category in ("frame", "continuity", "composition", "screen"):
        bucket = buckets.get(category) or []
        if category in must_categories and bucket:
            prefer_items.extend(item for item in bucket[1:] if item not in consumed_must_items)
            continue
        prefer_items.extend(item for item in bucket if item not in consumed_must_items)
        if category not in must_categories and bucket:
            head = bucket[0]
            if head not in consumed_must_items:
                prefer_items.insert(0, head)

    items = [*(f"Bắt buộc: {item}" for item in must_items[:4]), *(f"Ưu tiên: {item}" for item in prefer_items[:4])]
    if not items:
        return ""
    return "；".join(items[:8])


def _extract_context_names(context_text: str | None) -> list[str]:
    names: list[str] = []
    for raw_line in str(context_text or "").splitlines():
        line = raw_line.strip()
        if not line.startswith("- "):
            continue
        body = line[2:]
        name = body.split(": ", 1)[0].strip()
        if name:
            names.append(name)
    return names


def _cleanup_generated_prompt(prompt: str) -> str:
    text = str(prompt or "").strip()
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned: list[str] = []
    after_generation_heading = False
    for line in lines:
        if line == "## if line == ## Nội dung tạo:":
            after_generation_heading = True
            cleaned = []
            continue
        if line == "## Diễn giải nội dung hình ảnh" or re.fullmatch(r"图\d+\s*[:：].*", line):
            continue
        cleaned.append(line)
    if after_generation_heading and cleaned:
        return "\n".join(cleaned).strip()
    return "\n".join(cleaned).strip()


def _validate_generated_prompt(prompt: str, input_dict: dict[str, object]) -> list[str]:
    issues: list[str] = []
    text = str(prompt or "").strip()
    if not text:
        return ["Kết quả tạo trống"]
    if "## Diễn giải nội dung hình ảnh" in text or "## Nội dung tạo dựng" in text or re.search(r"(^|\n)\s*图\d+\s*[:：]", text):
        issues.append("Kết quả lẫn lộn diễn giải ánh xạ hình ảnh, nên chỉ giữ lại prompt cơ bản")
    primary_characters = _extract_context_names(str(input_dict.get("character_context") or ""))
    if primary_characters:
        lead_names = primary_characters[:2]
        if not any(name in text for name in lead_names):
            issues.append(f"Kết quả thiếu tên nhân vật chính: {'、'.join(lead_names)}")
    return issues


def _build_retry_guidance(issues: list[str]) -> str:
    if not issues:
        return ""
    return "Vui lòng sửa nghiêm ngặt các vấn đề dưới đây rồi tạo lại:\n- " + "\n- ".join(issues)


async def build_run_args(
    db: AsyncSession,
    *,
    shot_id: str,
    frame_type: str,
) -> dict:
    normalized_frame_type = normalize_frame_type(frame_type)
    shot_stmt = (
        select(Shot)
        .options(
            selectinload(Shot.detail).selectinload(ShotDetail.dialog_lines),
            selectinload(Shot.detail).selectinload(ShotDetail.scene),
            selectinload(Shot.chapter).selectinload(Chapter.project),
            selectinload(Shot.character_links)
            .selectinload(ShotCharacterLink.character)
            .selectinload(Character.actor),
            selectinload(Shot.character_links)
            .selectinload(ShotCharacterLink.character)
            .selectinload(Character.costume),
            selectinload(Shot.scene_links).selectinload(ProjectSceneLink.scene),
            selectinload(Shot.prop_links).selectinload(ProjectPropLink.prop),
            selectinload(Shot.costume_links).selectinload(ProjectCostumeLink.costume),
        )
        .where(Shot.id == shot_id)
    )
    shot = (await db.execute(shot_stmt)).scalar_one_or_none()
    if shot is None:
        raise HTTPException(status_code=404, detail=entity_not_found("Shot"))
    if shot.detail is None:
        raise HTTPException(status_code=404, detail=entity_not_found("ShotDetail"))

    detail = shot.detail
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
    previous_title, previous_excerpt, previous_state = _summarize_neighbor_shot(previous_shot)
    next_title, next_excerpt, next_goal = _summarize_neighbor_shot(next_shot)
    dialog_summary = "\n".join(line.text for line in (detail.dialog_lines or []) if line.text)
    project = getattr(getattr(shot, "chapter", None), "project", None)
    visual_style = _enum_value(getattr(project, "visual_style", None))
    style = _enum_value(getattr(project, "style", None))
    unify_style = bool(getattr(project, "unify_style", True)) if project is not None else True

    characters = [
        link.character
        for link in sorted(list(getattr(shot, "character_links", []) or []), key=lambda item: (item.index, item.id))
        if getattr(link, "character", None) is not None
    ]
    scenes_by_id: dict[str, Scene] = {}
    detail_scene = getattr(detail, "scene", None)
    if detail_scene is not None:
        scenes_by_id[str(detail_scene.id)] = detail_scene
    for link in list(getattr(shot, "scene_links", []) or []):
        scene = getattr(link, "scene", None)
        if scene is not None:
            scenes_by_id[str(scene.id)] = scene
    props = [
        link.prop
        for link in list(getattr(shot, "prop_links", []) or [])
        if getattr(link, "prop", None) is not None
    ]
    costumes = [
        link.costume
        for link in list(getattr(shot, "costume_links", []) or [])
        if getattr(link, "costume", None) is not None
    ]
    scenes = list(scenes_by_id.values())

    continuity_guidance = _build_continuity_guidance(
        previous_shot=previous_shot,
        current_shot=shot,
        next_shot=next_shot,
    )
    action_beats = [str(item).strip() for item in list(getattr(detail, "action_beats", []) or []) if str(item).strip()]
    selected_action_beat = pick_action_beat_for_frame(normalized_frame_type, action_beats)
    action_beat_phases = _format_action_beat_phase_summary(action_beats)
    composition_anchor = _build_composition_anchor(
        detail=detail,
        previous_shot=previous_shot,
        next_shot=next_shot,
        characters=characters,
        scenes=scenes,
    )
    screen_direction_guidance = _build_screen_direction_guidance(
        detail=detail,
        previous_shot=previous_shot,
        next_shot=next_shot,
        dialogue_summary=dialog_summary,
        character_names=[character.name for character in characters],
    )
    frame_specific_guidance = _build_frame_specific_guidance(
        frame_type=normalized_frame_type,
        previous_shot=previous_shot,
        next_shot=next_shot,
        detail=detail,
        script_excerpt=shot.script_excerpt or "",
        action_beats=action_beats,
    )
    return {
        "shot_id": shot_id,
        "frame_type": normalized_frame_type,
        "input": {
            "script_excerpt": shot.script_excerpt or "",
            "title": shot.title or "",
            "visual_style": visual_style,
            "style": style,
            "unify_style": unify_style,
            "camera_shot": _enum_value(detail.camera_shot),
            "angle": _enum_value(detail.angle),
            "movement": _enum_value(detail.movement),
            "atmosphere": detail.atmosphere or "",
            "shot_description": detail.description or "",
            "mood_tags": detail.mood_tags or [],
            "vfx_type": _enum_value(detail.vfx_type),
            "vfx_note": detail.vfx_note or "",
            "duration": detail.duration,
            "scene_id": detail.scene_id,
            "dialog_summary": dialog_summary,
            "action_beats": action_beats,
            "action_beat_phases": action_beat_phases,
            "selected_action_beat_phase": getattr(selected_action_beat, "phase", ""),
            "selected_action_beat_text": getattr(selected_action_beat, "text", ""),
            "character_context": _build_character_context(characters),
            "scene_context": _build_named_asset_context(scenes),
            "prop_context": _build_named_asset_context(props),
            "costume_context": _build_named_asset_context(costumes),
            "subject_priority": _build_subject_priority(
                characters=characters,
                scenes=scenes,
                props=props,
                costumes=costumes,
            ),
            "previous_shot_title": previous_title,
            "previous_shot_script_excerpt": previous_excerpt,
            "previous_shot_end_state": previous_state,
            "next_shot_title": next_title,
            "next_shot_script_excerpt": next_excerpt,
            "next_shot_start_goal": next_goal,
            "continuity_guidance": continuity_guidance,
            "composition_anchor": composition_anchor,
            "screen_direction_guidance": screen_direction_guidance,
            "frame_specific_guidance": frame_specific_guidance,
            "director_command_summary": _build_director_command_summary(
                frame_type=normalized_frame_type,
                frame_specific_guidance=frame_specific_guidance,
                continuity_guidance=continuity_guidance,
                composition_anchor=composition_anchor,
                screen_direction_guidance=screen_direction_guidance,
                has_dialogue=bool(dialog_summary.strip()),
                character_count=len(characters),
                same_scene_with_previous=_same_scene(previous_shot, str(detail.scene_id or "")),
                same_scene_with_next=_same_scene(next_shot, str(detail.scene_id or "")),
                movement=_enum_value(detail.movement),
            ),
        },
    }


async def run_shot_frame_prompt_task(
    task_id: str,
    run_args: dict,
) -> None:
    async with async_session_maker() as session:
        try:
            store = SqlAlchemyTaskStore(session)
            await store.set_status(task_id, TaskStatus.running)
            await store.set_progress(task_id, 10)
            await session.commit()
            log_task_event("shot_frame_prompt", task_id, "running")
            if await cancel_if_requested_async(store=store, task_id=task_id, session=session):
                log_task_event("shot_frame_prompt", task_id, "cancelled", stage="before_execute")
                return

            frame_type = str(run_args.get("frame_type") or "")
            shot_id = str(run_args.get("shot_id") or "")
            input_dict = dict(run_args.get("input") or {})
            llm = await session.run_sync(lambda sync_db: build_default_text_llm_sync(sync_db, thinking=False))

            if frame_type == "first":
                agent = ShotFirstFramePromptAgent(llm)
            elif frame_type == "last":
                agent = ShotLastFramePromptAgent(llm)
            else:
                agent = ShotKeyFramePromptAgent(llm)
            input_dict.setdefault("retry_guidance", "")
            result = await agent.aextract(**input_dict)
            quality_issues = _validate_generated_prompt(result.prompt, input_dict)
            if quality_issues:
                retry_input = dict(input_dict)
                retry_input["retry_guidance"] = _build_retry_guidance(quality_issues)
                retry_result = await agent.aextract(**retry_input)
                retry_issues = _validate_generated_prompt(retry_result.prompt, retry_input)
                if not retry_issues:
                    input_dict = retry_input
                    result = retry_result
                    quality_issues = []
                else:
                    result.prompt = _cleanup_generated_prompt(retry_result.prompt) or _cleanup_generated_prompt(result.prompt) or result.prompt
                    input_dict = retry_input
                    quality_issues = retry_issues
            if await cancel_if_requested_async(store=store, task_id=task_id, session=session):
                log_task_event("shot_frame_prompt", task_id, "cancelled", stage="after_execute")
                return

            if not shot_id:
                raise RuntimeError("Missing shot_id in run args")
            shot_detail = await session.get(ShotDetail, shot_id)
            if shot_detail is None:
                raise RuntimeError("ShotDetail not found when persisting prompt")

            if frame_type == "first":
                shot_detail.first_frame_prompt = result.prompt
            elif frame_type == "last":
                shot_detail.last_frame_prompt = result.prompt
            else:
                shot_detail.key_frame_prompt = result.prompt

            result_payload = result.model_dump()
            result_payload["debug_context"] = dict(input_dict)
            result_payload["quality_checks"] = {
                "passed": not quality_issues,
                "issues": quality_issues,
            }
            await store.set_result(task_id, result_payload)
            if await cancel_if_requested_async(store=store, task_id=task_id, session=session):
                log_task_event("shot_frame_prompt", task_id, "cancelled", stage="after_persist")
                return
            await store.set_progress(task_id, 100)
            await store.set_status(task_id, TaskStatus.succeeded)
            await recompute_shot_status(session, shot_id=shot_id)
            await session.commit()
            log_task_event("shot_frame_prompt", task_id, "succeeded")
        except Exception as exc:  # noqa: BLE001
            await session.rollback()
            async with async_session_maker() as s2:
                store = SqlAlchemyTaskStore(s2)
                await store.set_error(task_id, str(exc))
                await store.set_status(task_id, TaskStatus.failed)
                shot_id = str(run_args.get("shot_id") or "")
                if shot_id:
                    await recompute_shot_status(s2, shot_id=shot_id)
                await s2.commit()
            log_task_failure("shot_frame_prompt", task_id, str(exc))
