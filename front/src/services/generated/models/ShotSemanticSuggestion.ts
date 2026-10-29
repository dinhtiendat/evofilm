/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CameraAngle } from './CameraAngle';
import type { CameraMovement } from './CameraMovement';
import type { CameraShotType } from './CameraShotType';
/**
 * Gợi ý ngữ nghĩa mặc định của phân cảnh: dùng để khởi tạo ngôn ngữ phân cảnh và mốc hành động ở giai đoạn chuẩn bị.
 */
export type ShotSemanticSuggestion = {
    /**
     * camera_shot: Optional[CameraShotType] = Field(None, description=Gợi ý cận)
     */
    camera_shot?: (CameraShotType | null);
    /**
     * angle: Optional[CameraAngle] = Field(None, description=góc máy gợi ý)
     */
    angle?: (CameraAngle | null);
    /**
     * movement: Optional[CameraMovement] = Field(None, description=Gợi ý chuyển động máy)
     */
    movement?: (CameraMovement | null);
    /**
     * thời lượng gợi ý (giây)
     */
    duration?: (number | null);
    /**
     * action_beats: List[str] = Field(default_factory=list, description=Các mốc hành động được sắp xếp theo trình tự thời gian)
     */
    action_beats?: Array<string>;
    /**
     * notes: Optional[str] = Field(None, description=Giải thích các mục không chắc chắn)
     */
    notes?: (string | null);
};

