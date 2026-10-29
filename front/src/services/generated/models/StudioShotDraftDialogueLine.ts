/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Nháp thoại phân cảnh: speaker/target dùng name nhân vật, khi import ánh xạ sang character_id.
 */
export type StudioShotDraftDialogueLine = {
    /**
     * index: int = Field(0, ge=0, description=thứ tự trong shot)
     */
    index?: number;
    /**
     * text: str = Field(..., description=Nội dung lời thoại)
     */
    text: string;
    /**
     * line_mode: DialogueLineMode = Field(DIALOGUE, description=Chế độ thoại)
     */
    line_mode?: 'DIALOGUE' | 'VOICE_OVER' | 'OFF_SCREEN' | 'PHONE';
    /**
     * Tên nhân vật nói (null được)
     */
    speaker_name?: (string | null);
    /**
     * tên nhân vật nghe (để trống được)
     */
    target_name?: (string | null);
};

