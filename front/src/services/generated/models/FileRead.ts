/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileTypeEnum } from './FileTypeEnum';
export type FileRead = {
    /**
     * ID tệp
     */
    id: string;
    /**
     * Loại tệp
     */
    type: FileTypeEnum;
    /**
     * tên tệp/tiêu đề
     */
    name: string;
    /**
     * Ảnh thu nhỏ URL/Đường
     */
    thumbnail?: string;
    /**
     * Nhãn
     */
    tags?: Array<string>;
};

