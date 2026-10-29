/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Body_upload_file_api_api_v1_studio_files_upload_post = {
    /**
     * file: UploadFile = File(..., description=Tệp nhị phân cần tải lên)
     */
    file: string;
    /**
     * Tùy chọn: ID dự án để ghi vào file_usages
     */
    project_id?: (string | null);
    chapter_id?: (string | null);
    shot_id?: (string | null);
    /**
     * Ghi vào file_usages khi cung cấp cùng lúc với project_id
     */
    usage_kind?: (string | null);
    source_ref?: (string | null);
};

