/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectStyle } from './ProjectStyle';
import type { ProjectVisualStyle } from './ProjectVisualStyle';
export type ProjectCreate = {
    /**
     * name: str = Field(..., description=tên dự án)
     */
    name: string;
    /**
     * description: str = Field(, description=giới thiệu dự án)
     */
    description?: string;
    /**
     * Thể loại/phong cách
     */
    style: ProjectStyle;
    /**
     * visual_style: ProjectVisualStyle = Field(ProjectVisualStyle.live_action, description=Hình thức biểu diễn của hình ảnh)
     */
    visual_style?: ProjectVisualStyle;
    /**
     * seed: int = Field(0, description=Hạt giống ngẫu nhiên)
     */
    seed?: number;
    /**
     * unify_style: bool = Field(True, description=Có thống nhất phong cách không)
     */
    unify_style?: boolean;
    /**
     * progress: int = Field(0, description=Tỷ lệ tiến độ (0-100))（0-100）
     */
    progress?: number;
    /**
     * Tỷ lệ video mặc định cấp dự án; áp dụng khi phân cảnh không ghi đè
     */
    default_video_ratio?: (string | null);
    /**
     * stats: dict[str, Any] = Field(default_factory=dict, description=Thống kê tổng hợp (JSON))（JSON）
     */
    stats?: Record<string, any>;
    /**
     * id: str = Field(..., description=ID dự án) ID
     */
    id: string;
};

