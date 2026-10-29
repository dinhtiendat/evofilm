/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityNameExistenceItem } from './EntityNameExistenceItem';
/**
 * Kết quả kiểm tra tồn tại hàng loạt (nhóm theo loại tài nguyên).
 */
export type EntityNameExistenceCheckResponse = {
    characters?: Array<EntityNameExistenceItem>;
    props?: Array<EntityNameExistenceItem>;
    scenes?: Array<EntityNameExistenceItem>;
    costumes?: Array<EntityNameExistenceItem>;
};

