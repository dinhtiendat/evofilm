/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Mục tài nguyên liên kết được tổng hợp theo phân cảnh để trả về (nhân vật/đạo cụ/bối cảnh/trang phục).
 */
export type ShotLinkedAssetItem = {
    /**
     * Loại thực thể: character/prop/scene/costume
     */
    type: 'character' | 'prop' | 'scene' | 'costume';
    /**
     * thực thể ID( character_id/prop_id/scene_id/costume_id)
     */
    id: string;
    /**
     * ID của dòng image ứng với ảnh thu nhỏ tốt nhất (ví dụ PropImage.id); null nếu không có ảnh
     */
    image_id?: (number | null);
    /**
     * File ID của ảnh thu nhỏ tối ưu (files.id); dùng cho đầu vào ảnh tham chiếu; không có ảnh thì null
     */
    file_id?: (string | null);
    /**
     * Tên thực thể
     */
    name: string;
    /**
     * Đường dẫn tải ảnh thu nhỏ (/api/v1/studio/files/{file_id}/download)
     */
    thumbnail?: string;
};

