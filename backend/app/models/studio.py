from __future__ import annotations

"""
Mô hình CSDL liên quan AI Studio/sản xuất phim (bộ xuất tập hợp).

Để tránh phải bảo trì quá nhiều định nghĩa ORM trong một tệp, ở đây các lớp mô hình được tách theo hạng mục vào nhiều module,
Và ở đây re-export thống nhất, giữ tương thích đường dẫn import hiện tại (`app.models.studio.*`).
"""

from app.models.studio_assets import Actor, Character, CharacterPropLink, Costume, Prop, Scene
from app.models.studio_asset_images import (
    ActorImage,
    CharacterImage,
    CostumeImage,
    PropImage,
    SceneImage,
)
from app.models.studio_prompts_files_timeline import FileItem, PromptTemplate, TimelineClip
from app.models.studio_file_usages import FileUsage
from app.models.studio_projects import (
    Chapter,
    Project,
    ProjectActorLink,
    ProjectCostumeLink,
    ProjectPropLink,
    ProjectSceneLink,
)
from app.models.studio_shots import (
    Shot,
    ShotExtractedCandidate,
    ShotExtractedDialogueCandidate,
    ShotCharacterLink,
    ShotDetail,
    ShotDialogLine,
    ShotFrameImage,
)
from app.models.types import (
    AssetQualityLevel,
    AssetViewAngle,
    CameraAngle,
    CameraMovement,
    CameraShotType,
    ChapterStatus,
    DialogueLineMode,
    FileType,
    FileUsageKind,
    ProjectStyle,
    ProjectVisualStyle,
    PromptCategory,
    ShotCandidateStatus,
    ShotCandidateType,
    ShotDialogueCandidateStatus,
    ShotFrameType,
    ShotStatus,
    TimelineClipType,
    VFXType,
)

__all__ = [
    # Enums
    "ProjectStyle",
    "ProjectVisualStyle",
    "ChapterStatus",
    "ShotStatus",
    "ShotCandidateType",
    "ShotCandidateStatus",
    "ShotDialogueCandidateStatus",
    "CameraShotType",
    "CameraAngle",
    "CameraMovement",
    "AssetQualityLevel",
    "AssetViewAngle",
    "ShotFrameType",
    "FileType",
    "FileUsageKind",
    "TimelineClipType",
    "DialogueLineMode",
    "VFXType",
    "PromptCategory",
    # Models
    "Project",
    "Chapter",
    "Scene",
    "Prop",
    "Costume",
    "Shot",
    "ShotDetail",
    "ShotFrameImage",
    "ShotDialogLine",
    "ShotExtractedCandidate",
    "ShotExtractedDialogueCandidate",
    "Actor",
    "Character",
    "CharacterImage",
    "CharacterPropLink",
    "ShotCharacterLink",
    "ActorImage",
    "SceneImage",
    "PropImage",
    "CostumeImage",
    "ProjectActorLink",
    "ProjectSceneLink",
    "ProjectPropLink",
    "ProjectCostumeLink",
    "PromptTemplate",
    "FileItem",
    "FileUsage",
    "TimelineClip",
]
