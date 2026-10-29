from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base
from app.models.studio import (
    Actor,
    CameraAngle,
    CameraMovement,
    CameraShotType,
    Chapter,
    Character,
    Costume,
    DialogueLineMode,
    Project,
    ProjectCostumeLink,
    ProjectPropLink,
    ProjectSceneLink,
    ProjectStyle,
    ProjectVisualStyle,
    Prop,
    Scene,
    Shot,
    ShotCharacterLink,
    ShotDetail,
    ShotDialogLine,
    VFXType,
)
from app.services.film.shot_frame_prompt_tasks import (
    build_run_args,
    normalize_frame_type,
    relation_type_for_frame,
)
from app.services.studio.action_beats import infer_action_beat_sequence, pick_action_beat_for_frame


async def _build_session() -> tuple[AsyncSession, object]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return session_local(), engine


async def _seed_shot_graph(db: AsyncSession) -> None:
    project = Project(
        id="p1",
        name="Dự án 1",
        description="",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
        unify_style=True,
    )
    chapter = Chapter(id="c1", project_id="p1", index=1, title="Chương 1")
    prev_shot = Shot(id="s0", chapter_id="c1", index=0, title="Cảnh 0", script_excerpt="Nhân vật bám theo mép tường tiến lại gần cửa.")
    shot = Shot(id="s1", chapter_id="c1", index=1, title="Cảnh 1", script_excerpt="Nhân vật đẩy cửa bước vào.")
    next_shot = Shot(id="s2", chapter_id="c1", index=2, title="Cảnh 2", script_excerpt="Nhân vật dừng bước, nhìn về cuối hành lang.")
    actor = Actor(
        id="actor-1",
        name="Diễn viên A",
        description="Tóc ngắn, nghiêm lạnh",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
    )
    costume = Costume(
        id="costume-1",
        name="Áo gió đen",
        description="Form dáng dài gọn gàng",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
    )
    character = Character(
        id="char-1",
        project_id="p1",
        name="Nhân vật chính",
        description="Kiềm chế, cảnh giác, mang sức ép",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
        actor_id="actor-1",
        costume_id="costume-1",
    )
    scene = Scene(
        id="scene-1",
        name="Hành lang bỏ hoang",
        description="Tối tăm, ẩm ướt, hẹp và dài",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
    )
    prop = Prop(
        id="prop-1",
        name="Đèn pin",
        description="Vỏ kim loại, luồng sáng trắng lạnh",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
    )
    detail = ShotDetail(
        id="s1",
        camera_shot=CameraShotType.ms,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.static,
        scene_id="scene-1",
        duration=5,
        atmosphere="Uy áp",
        mood_tags=["Căng thẳng", "Kìm nén"],
        follow_atmosphere=True,
        vfx_type=VFXType.none,
        vfx_note="Không có",
        description="Trong hành lang dài hẹp, nhân vật chính cẩn thận tiến lên và quay đầu xác nhận động tĩnh phía sau.",
    )
    prev_detail = ShotDetail(
        id="s0",
        camera_shot=CameraShotType.ms,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.dolly_in,
        scene_id="scene-1",
        duration=4,
        description="Nhân vật chính bám tường, từ từ tiến lại gần cửa, ánh mắt chăm chú nhìn về phía trước.",
    )
    next_detail = ShotDetail(
        id="s2",
        camera_shot=CameraShotType.cu,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.static,
        scene_id="scene-1",
        duration=3,
        description="Nhân vật chính dừng chuyển động, thần tình căng thẳng, ánh mắt rọi về phía cuối hành lang.",
    )
    line = ShotDialogLine(
        shot_detail_id="s1",
        index=0,
        text="Chúng tôi đã đến.",
        line_mode=DialogueLineMode.dialogue,
        speaker_name="Nhân vật chính",
    )
    shot_character_link = ShotCharacterLink(shot_id="s1", character_id="char-1", index=0)
    scene_link = ProjectSceneLink(project_id="p1", chapter_id="c1", shot_id="s1", scene_id="scene-1")
    prop_link = ProjectPropLink(project_id="p1", chapter_id="c1", shot_id="s1", prop_id="prop-1")
    costume_link = ProjectCostumeLink(project_id="p1", chapter_id="c1", shot_id="s1", costume_id="costume-1")
    db.add_all(
        [
            project,
            chapter,
            prev_shot,
            shot,
            next_shot,
            actor,
            costume,
            character,
            scene,
            prop,
            prev_detail,
            detail,
            next_detail,
            line,
            shot_character_link,
            scene_link,
            prop_link,
            costume_link,
        ]
    )
    await db.commit()


async def _seed_fear_reaction_shot_graph(db: AsyncSession) -> None:
    project = Project(
        id="fear-p1",
        name="Dự án kinh dị",
        description="",
        style=ProjectStyle.real_people_city,
        visual_style=ProjectVisualStyle.live_action,
        unify_style=True,
    )
    chapter = Chapter(id="fear-c1", project_id="fear-p1", index=1, title="Nhà kính")
    shot = Shot(
        id="fear-s1",
        chapter_id="fear-c1",
        index=1,
        title="Phân cảnh kinh hãi",
        script_excerpt="“Cạch.” Tiếng bấm cắt cắt nghe đặc biệt chói tai trong nhà kính tĩnh lặng. Lục Viễn toàn thân cứng đờ, chiếc bấm cắt tỉa cành trong tay rơi tuột xuống đất. Anh vô thức bịt tai, khom người xuống, nhịp thở trở nên gấp gáp.",
    )
    detail = ShotDetail(
        id="fear-s1",
        camera_shot=CameraShotType.ms,
        angle=CameraAngle.eye_level,
        movement=CameraMovement.static,
        duration=5,
        action_beats=[
            "Nghe tiếng kìm xát hợp, Lục Viễn đột nhiên đứng khựng",
            "Kìm cắt cành rơi khỏi tay,",
            "Lục Viễn giơ tay bịt tai, thân người hạ xuống",
            "Quỳ xuống, thở gấp,",
        ],
        description="Lục Viễn đang cắt tỉa lá trong nhà kính, bất ngờ giật mình vì tiếng kìm sắc nhọn, thân thể đơ cứng, kéo kéo tỉa trong tay rơi mất.",
        atmosphere="Uy áp",
        mood_tags=["Kinh hãi"],
        follow_atmosphere=True,
        vfx_type=VFXType.none,
        vfx_note="Không có",
    )
    db.add_all([project, chapter, shot, detail])
    await db.commit()


def test_normalize_frame_type_and_relation_type() -> None:
    assert normalize_frame_type(" First ") == "first"
    assert relation_type_for_frame("first") == "shot_first_frame_prompt"
    assert relation_type_for_frame("last") == "shot_last_frame_prompt"
    assert relation_type_for_frame("key") == "shot_key_frame_prompt"

    with pytest.raises(HTTPException) as exc_info:
        normalize_frame_type("middle")

    assert exc_info.value.status_code == 400


def test_action_beat_phase_inference_prefers_trigger_peak_and_aftermath() -> None:
    beats = [
        "Nghe tiếng kìm xát hợp, Lục Viễn đột nhiên đứng khựng",
        "Kìm cắt cành rơi khỏi tay,",
        "Lục Viễn giơ tay bịt tai, thân người hạ xuống",
        "Quỳ xuống, thở gấp,",
    ]

    sequence = infer_action_beat_sequence(beats)
    first_item = pick_action_beat_for_frame("first", beats)
    key_item = pick_action_beat_for_frame("key", beats)
    last_item = pick_action_beat_for_frame("last", beats)

    assert [item.phase for item in sequence] == ["trigger", "peak", "peak", "aftermath"]
    assert first_item is not None and first_item.text == "Nghe tiếng kìm xát hợp, Lục Viễn đột nhiên đứng khựng"
    assert key_item is not None and key_item.text == "Lục Viễn giơ tay bịt tai, thân người hạ xuống"
    assert last_item is not None and last_item.text == "Quỳ xuống, thở gấp,"


@pytest.mark.asyncio
async def test_build_run_args_aggregates_dialog_and_project_style() -> None:
    db, engine = await _build_session()
    async with db:
        await _seed_shot_graph(db)

        run_args = await build_run_args(db, shot_id="s1", frame_type="first")

        assert run_args["frame_type"] == "first"
        assert run_args["shot_id"] == "s1"
        assert run_args["input"]["title"] == "Cảnh 1"
        assert run_args["input"]["script_excerpt"] == "Nhân vật đẩy cửa bước vào."
        assert run_args["input"]["camera_shot"] == "MS"
        assert run_args["input"]["angle"] == "EYE_LEVEL"
        assert run_args["input"]["movement"] == "STATIC"
        assert run_args["input"]["dialog_summary"] == "Chúng tôi đã đến."
        assert run_args["input"]["visual_style"] == ProjectVisualStyle.live_action.value
        assert run_args["input"]["style"] == ProjectStyle.real_people_city.value
        assert run_args["input"]["unify_style"] is True
        assert run_args["input"]["shot_description"] == "Trong hành lang dài hẹp, nhân vật chính cẩn thận tiến lên và quay đầu xác nhận động tĩnh phía sau."
        assert "Nhân vật chính: Kiềm chế, cảnh giác, mang sức ép" in run_args["input"]["character_context"]
        assert "Hình tượng diễn viên: Diễn viên A(Tóc ngắn, nghiêm lạnh)" in run_args["input"]["character_context"]
        assert "Trang phục mặc định: Áo gió đen(Form dáng dài gọn gàng)" in run_args["input"]["character_context"]
        assert run_args["input"]["scene_context"] == "- Hành lang bỏ hoang: Tối tăm, ẩm ướt, hẹp và dài"
        assert run_args["input"]["prop_context"] == "- Đèn pin: Vỏ kim loại, luồng sáng trắng lạnh"
        assert run_args["input"]["costume_context"] == "- Áo gió đen: Form dáng dài gọn gàng"
        assert "ưu tiên lấy nhân vật Nhân vật chính làm chủ thể khung" in run_args["input"]["subject_priority"]
        assert "ưu tiên xây dựng thông tin môi trường của bối cảnh Hành lang bỏ hoang" in run_args["input"]["subject_priority"]
        assert "Đạo cụ Đèn pin chỉ ghi chú trọng khi vào hành động chính hoặc điểm tiêu bố cục" in run_args["input"]["subject_priority"]
        assert run_args["input"]["previous_shot_title"] == "Cảnh 0"
        assert "Nhân vật bám theo mép tường tiến lại gần cửa." in run_args["input"]["previous_shot_script_excerpt"]
        assert "Bối cảnh: Hành lang bỏ hoang" in run_args["input"]["previous_shot_end_state"]
        assert run_args["input"]["next_shot_title"] == "Cảnh 2"
        assert "Nhân vật dừng bước, nhìn về cuối hành lang." in run_args["input"]["next_shot_script_excerpt"]
        assert "Trạng thái khung: Nhân vật chính dừng chuyển động, thần tình căng thẳng" in run_args["input"]["next_shot_start_goal"]
        assert "shot hiện tại nên tiếp nối hành động và cảm xúc của shot trước" in run_args["input"]["continuity_guidance"]
        assert "dự phòng điểm rơi hành động hoặc cảm xúc cho phân cảnh tiếp theo" in run_args["input"]["continuity_guidance"]
        assert "giữ nhân vật và môi trường đều dễ đọc" in run_args["input"]["composition_anchor"]
        assert "Lấy bối cảnh Hành lang bỏ hoang làm mỏ neo không gian" in run_args["input"]["composition_anchor"]
        assert "cố định hướng thân và tầm nhìn của nhân vật Nhân vật chính" in run_args["input"]["composition_anchor"]
        assert "ưu tiên giữ hướng nhìn ngang và hướng nhìn đối xứng của nhân vật ổn định" in run_args["input"]["screen_direction_guidance"]
        assert "khi có thoại, ưu tiên đảm bảo quan hệ hướng nhìn giữa người nói và người nghe liên tục" in run_args["input"]["screen_direction_guidance"]
        assert "hướng thân và điểm nhìn của nhân vật Nhân vật chính nên được giữ liên tục giữa các phân cảnh liền kề" in run_args["input"]["screen_direction_guidance"]
        assert "Khung hình đầu nên ưu tiên thiết lập không gian, vị trí đứng ban đầu của chủ thể và ấn tượng thị giác từ ánh nhìn đầu tiên" in run_args["input"]["frame_specific_guidance"]
        assert "Khung đầu chỉ thể hiện khoảnh khắc kích hoạt sự kiện hoặc trạng thái ban đầu của phản ứng đầu tiên" in run_args["input"]["frame_specific_guidance"]
        assert "Nếu kịch bản có chuỗi phản ứng liên tục, ưu tiên viết thành trạng thái hành động vừa bắt đầu, chưa hoàn tất hoặc bị ngắt" in run_args["input"]["frame_specific_guidance"]
        assert "Khung hình đầu cần tiếp nối trạng thái kết thúc của phân cảnh trước" in run_args["input"]["frame_specific_guidance"]
        assert "Bắt buộc: Nếu kịch bản có chuỗi phản ứng liên tục, ưu tiên viết thành trạng thái hành động vừa bắt đầu, chưa hoàn tất hoặc bị ngắt, ví dụ tay vừa buông ra, cơ thể bất chợt đông cứng, nhân vật chưa hoàn toàn khom xuống" in run_args["input"]["director_command_summary"]
        assert "Bắt buộc: ưu tiên giữ hướng nhìn ngang và hướng nhìn đối xứng của nhân vật ổn định, tránh xoay trái/phải vô cớ" in run_args["input"]["director_command_summary"]
        assert "Bắt buộc: Phân cảnh hiện tại nên hình thành khép lại tự nhiên, dự phòng điểm rơi hành động hoặc cảm xúc cho phân cảnh tiếp theo, tránh cắt cứng" in run_args["input"]["director_command_summary"]
        assert "Bắt buộc: Lấy bối cảnh Hành lang bỏ hoang làm mỏ neo không gian, đảm bảo quan hệ chủ thể và môi trường rõ ràng" in run_args["input"]["director_command_summary"]
    await engine.dispose()


@pytest.mark.asyncio
async def test_build_run_args_provides_different_guidance_for_key_and_last_frames() -> None:
    db, engine = await _build_session()
    async with db:
        await _seed_shot_graph(db)

        key_args = await build_run_args(db, shot_id="s1", frame_type="key")
        last_args = await build_run_args(db, shot_id="s1", frame_type="last")

        assert "Khung hình chính nên chốt khoảnh khắc có sức căng kịch tính hoặc mật độ thông tin cao nhất trong phân cảnh, không mô tả đều toàn bộ quá trình" in key_args["input"]["frame_specific_guidance"]
        assert "Khung hình cuối nên nhấn mạnh khép lại hành động, dư âm cảm xúc hoặc điểm dừng của ánh mắt" in last_args["input"]["frame_specific_guidance"]
        assert key_args["input"]["frame_specific_guidance"] != last_args["input"]["frame_specific_guidance"]
        assert "Khung hình chính nên chốt khoảnh khắc có sức căng kịch tính hoặc mật độ thông tin cao nhất trong phân cảnh, không mô tả đều toàn bộ quá trình" in key_args["input"]["director_command_summary"]
        assert "Bắt buộc: Khung hình cuối nên nhấn mạnh khép lại hành động, dư âm cảm xúc hoặc điểm dừng của ánh mắt, không mở lại điểm khởi đầu hành động mới" in last_args["input"]["director_command_summary"]
        assert "Phân cảnh hiện tại nên hình thành khép lại tự nhiên, dự phòng điểm rơi hành động hoặc cảm xúc cho phân cảnh tiếp theo, tránh cắt cứng" in last_args["input"]["director_command_summary"]
    await engine.dispose()


@pytest.mark.asyncio
async def test_build_run_args_requires_shot_detail() -> None:
    db, engine = await _build_session()
    async with db:
        project = Project(
            id="p1",
            name="Dự án 1",
            description="",
            style=ProjectStyle.real_people_city,
            visual_style=ProjectVisualStyle.live_action,
        )
        chapter = Chapter(id="c1", project_id="p1", index=1, title="Chương 1")
        shot = Shot(id="s1", chapter_id="c1", index=1, title="Phân cảnh 1")
        db.add_all([project, chapter, shot])
        await db.commit()

        with pytest.raises(HTTPException) as exc_info:
            await build_run_args(db, shot_id="s1", frame_type="key")

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "ShotDetail not found"
    await engine.dispose()


@pytest.mark.asyncio
async def test_build_run_args_strengthens_first_frame_for_sequential_reaction_chain() -> None:
    db, engine = await _build_session()
    async with db:
        await _seed_fear_reaction_shot_graph(db)

        run_args = await build_run_args(db, shot_id="fear-s1", frame_type="first")

        assert "Phân cảnh hiện tại có chuỗi phản ứng liên tục rõ rệt, khung hình đầu phải cắt đúng khoảnh khắc thấy được sớm nhất sau khi kích hoạt, cấm đặt thẳng vào trạng thái che tai, khom xuống, ngã khuỵu hay hoàn tất quay người" in run_args["input"]["frame_specific_guidance"]
        assert "cấm đặt thẳng vào trạng thái che tai, khom xuống, ngã khuỵu hay hoàn tất quay người" in run_args["input"]["frame_specific_guidance"]
        assert "Khung hình hiện tại ưu tiên tổ chức cảnh quay quanh mốc hành động “Nghe tiếng kìm xát hợp, Lục Viễn đột nhiên đứng khựng” (trigger: Giai đoạn kích hoạt), không nhảy cấp sang giai đoạn khác" in run_args["input"]["frame_specific_guidance"]
        assert "Bắt buộc: Nếu kịch bản có chuỗi phản ứng liên tục, ưu tiên viết thành trạng thái hành động vừa bắt đầu, chưa hoàn tất hoặc bị ngắt, ví dụ tay vừa buông ra, cơ thể bất chợt đông cứng, nhân vật chưa hoàn toàn khom xuống" in run_args["input"]["director_command_summary"]
        assert "Phân cảnh hiện tại có chuỗi phản ứng liên tục rõ rệt, khung hình đầu phải cắt đúng khoảnh khắc thấy được sớm nhất sau khi kích hoạt, cấm đặt thẳng vào trạng thái che tai, khom xuống, ngã khuỵu hay hoàn tất quay người" in run_args["input"]["director_command_summary"]
    await engine.dispose()
