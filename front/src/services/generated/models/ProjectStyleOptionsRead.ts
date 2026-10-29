/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StyleOption } from './StyleOption';
/**
 * Ứng viên phong cách dự án.。
 */
export type ProjectStyleOptionsRead = {
    /**
     * visual_styles: list[StyleOption] = Field(default_factory=list, description=Các lựa chọn phong cách thị giác)
     */
    visual_styles?: Array<StyleOption>;
    /**
     * description=Tùy chọn phong cách video được nhóm theo phong cách trực quan,
     */
    styles_by_visual_style?: Record<string, Array<StyleOption>>;
    /**
     * description=Phong cách video mặc định cho từng phong cách trực quan,
     */
    default_style_by_visual_style?: Record<string, string>;
};

