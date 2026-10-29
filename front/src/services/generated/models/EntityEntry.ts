/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityVariant } from './EntityVariant';
import type { EvidenceSpan } from './EvidenceSpan';
/**
 * Mục thực thể sau gộp (trạng thái trung gian của xử lý kịch bản).
 */
export type EntityEntry = {
    /**
     * ID ổn định của thực thể (gán ở giai đoạn gộp)
     */
    id: string;
    /**
     * name: str = Field(..., description=Tên thực thể)
     */
    name: string;
    /**
     * type: Literal[character, scene, prop, location] = Field(..., description=Loại thực thể)
     */
    type: 'character' | 'scene' | 'prop' | 'location';
    /**
     * Tên chuẩn hóa (từ văn bản, tùy chọn)
     */
    normalized_name?: (string | null);
    /**
     * Tên khác/cách gọi (lấy từ văn bản, tùy chọn)
     */
    aliases?: Array<string>;
    /**
     * Chân dung / mô tả cơ bản (trung thành văn bản, ngắn)
     */
    description?: (string | null);
    /**
     * Độ chắc chắn gộp 0-1 (tùy chọn)
     */
    confidence?: (number | null);
    /**
     * Bằng chứng lần xuất hiện đầu tiên (tùy chọn)
     */
    first_appearance?: (EvidenceSpan | null);
    /**
     * Mô tả trang phục/tạo hình (tùy chọn, thuận tiện cho liên kết biến thể và tài nguyên)
     */
    costume_note?: (string | null);
    /**
     * Từ tính cách / đặc điểm (tùy chọn)
     */
    traits?: Array<string>;
    /**
     * Loại địa điểm: phòng/phố/rừng/toa xe... (tùy chọn)
     */
    location_type?: (string | null);
    /**
     * Hạng mục đạo cụ (tùy chọn: weapon/document/vehicle/clothing/device/magic_item/other)
     */
    category?: (string | null);
    /**
     * ID nhân vật chủ sở hữu (tùy chọn)
     */
    owner_character_id?: (string | null);
    /**
     * Đoạn dẫn chứng hỗ trợ hồ sơ thực thể này (tùy chọn)
     */
    evidence?: Array<EvidenceSpan>;
    /**
     * first_shot: Optional[int] = Field(None, description=số thứ tự phân cảnh xuất hiện lần đầu)
     */
    first_shot?: (number | null);
    /**
     * appearances: List[int] = Field(default_factory=list, description=Danh sách phân cảnh xuất hiện)
     */
    appearances?: Array<number>;
    /**
     * variants: List[EntityVariant] = Field(default_factory=list, description=Danh sách biến thể)
     */
    variants?: Array<EntityVariant>;
};

