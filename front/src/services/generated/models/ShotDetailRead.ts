/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CameraAngle } from './CameraAngle';
import type { CameraMovement } from './CameraMovement';
import type { CameraShotType } from './CameraShotType';
import type { VFXType } from './VFXType';
export type ShotDetailRead = {
    /**
     * ID phân cảnh (chia sẻ khóa chính với shots.id)
     */
    id: string;
    /**
     * Cận (độ rộng shot)
     */
    camera_shot: CameraShotType;
    /**
     * Góc máy
     */
    angle: CameraAngle;
    /**
     * Chuyển động máy
     */
    movement: CameraMovement;
    /**
     * ID bối cảnh liên kết (để trống được)
     */
    scene_id?: (string | null);
    /**
     * thời lượng(giây)
     */
    duration?: number;
    /**
     * Ghi đè tỷ lệ video cấp phân cảnh; để trống nghĩa là kế thừa mặc định của dự án
     */
    override_video_ratio?: (string | null);
    /**
     * Nhãn cảm xúc
     */
    mood_tags?: Array<string>;
    /**
     * Mô tả không khí
     */
    atmosphere?: string;
    /**
     * Có kế thừa không khí không
     */
    follow_atmosphere?: boolean;
    /**
     * Có chứa BGM không
     */
    has_bgm?: boolean;
    /**
     * Loại hiệu ứng đặc biệt
     */
    vfx_type?: VFXType;
    /**
     * giải thích effect hình ảnh
     */
    vfx_note?: string;
    /**
     * Các mốc hành động (sắp xếp theo trình tự thời gian)
     */
    action_beats?: Array<string>;
    /**
     * Prompt khung hình đầu của phân cảnh shot
     */
    first_frame_prompt?: string;
    /**
     * Prompt khung hình cuối của phân cảnh shot
     */
    last_frame_prompt?: string;
    /**
     * Prompt khung hình chính của phân cảnh shot
     */
    key_frame_prompt?: string;
};

