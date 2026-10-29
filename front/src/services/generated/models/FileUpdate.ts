/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileUsageWrite } from './FileUsageWrite';
export type FileUpdate = {
    name?: (string | null);
    thumbnail?: (string | null);
    tags?: (Array<string> | null);
    /**
     * Nếu được cung cấp thì upsert một dòng file_usages
     */
    usage?: (FileUsageWrite | null);
};

