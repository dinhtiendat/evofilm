export type TaskCopyPreset = {
  title: string
  runningDescription: string
  cancellingDescription: string
  successDescription: string
  cancelledDescription: string
  failedDescription: string
  startedMessage: string
  reusedMessage: string
  cancelledImmediatelyMessage: string
  cancelRequestedMessage: string
  runningMessage: string
  cancellingMessage: string
}

export const TASK_COPY = {
  chapterDivision: {
    title: 'Trích xuất phân cảnh',
    runningDescription: 'hệ thống đang trích xuất phân cảnh phía sau, sau khi hoàn thành sẽ tự động làm mới nội dung hiện tại.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'trích xuất phân cảnh đã hoàn thành, nội dung trang đã tự động làm mới.',
    cancelledDescription: 'Đã hủy trích xuất phân cảnh.',
    failedDescription: 'Trích xuất phân cảnh thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu trích xuất phân cảnh',
    reusedMessage: 'Đã khôi phục tác vụ trích xuất phân cảnh của chương hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy trích xuất phân cảnh',
    cancelRequestedMessage: 'Đã yêu cầu hủy trích xuất phân cảnh',
    runningMessage: 'Hiện đã có tác vụ trích xuất phân cảnh đang chạy',
    cancellingMessage: 'Tác vụ trích xuất phân cảnh hiện tại đang hủy, vui lòng đợi',
  },
  scriptExtract: {
    title: 'Trích xuất tài nguyên',
    runningDescription: 'Sau khi tác vụ hoàn tất sẽ tự động làm mới tài nguyên và ứng viên thoại, không cần làm mới trang thủ công.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc và tự động làm mới trang khi kết thúc.',
    successDescription: 'trích xuất tài nguyên đã hoàn thành, nội dung ứng viên đã tự động làm mới.',
    cancelledDescription: 'Đã hủy trích xuất tài nguyên.',
    failedDescription: 'Trích xuất tài nguyên thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu trích xuất tài nguyên',
    reusedMessage: 'Đã khôi phục tác vụ trích xuất tài nguyên của chương hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy trích xuất tài nguyên',
    cancelRequestedMessage: 'Đã yêu cầu hủy trích xuất tài nguyên',
    runningMessage: 'Hiện đã có tác vụ trích xuất tài nguyên đang chạy',
    cancellingMessage: 'Tác vụ trích xuất tài nguyên hiện tại đang hủy, vui lòng đợi',
  },
  consistencyCheck: {
    title: 'Kiểm tra tính nhất quán',
    runningDescription: 'sau khi kiểm tra xong sẽ tự động hiển thị kết quả kiểm tra tính nhất quán mới nhất.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc và đồng bộ kết quả mới nhất khi kết thúc.',
    successDescription: 'Kiểm tra tính nhất quán đã hoàn tất, kết quả tự cập nhật.',
    cancelledDescription: 'Đã hủy kiểm tra tính nhất quán.',
    failedDescription: 'Kiểm tra tính nhất quán thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu kiểm tra nhất quán',
    reusedMessage: 'Đã khôi phục tác vụ kiểm tra tính nhất quán của chương hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy kiểm tra tính nhất quán',
    cancelRequestedMessage: 'Đã yêu cầu hủy kiểm tra tính nhất quán',
    runningMessage: 'Hiện đã có tác vụ kiểm tra tính nhất quán đang chạy',
    cancellingMessage: 'Tác vụ kiểm tra tính nhất quán hiện tại đang hủy, vui lòng đợi',
  },
  scriptSimplify: {
    title: 'Rút gọn thông minh',
    runningDescription: 'Sau khi tinh giản xong sẽ tự động điền ngược văn bản mới nhất.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'rút gọn thông minh đã hoàn thành, văn bản mới nhất đã tự động ghi ngược.',
    cancelledDescription: 'Đã hủy tinh giản thông minh.',
    failedDescription: 'Tinh giản thông minh thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tóm gọn thông minh',
    reusedMessage: 'Đã khôi phục tác vụ tinh giản thông minh của chương hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy tinh giản thông minh',
    cancelRequestedMessage: 'Đã yêu cầu hủy tinh giản thông minh',
    runningMessage: 'Hiện đã có tác vụ tinh giản thông minh đang chạy',
    cancellingMessage: 'Tác vụ tinh giản thông minh hiện tại đang hủy, vui lòng đợi',
  },
  scriptOptimize: {
    title: 'Tối ưu một chạm',
    runningDescription: 'Sau khi tối ưu xong sẽ tự động điền ngược nội dung gốc.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'tối ưu một chạm đã hoàn thành, nội dung nguyên văn đã tự động ghi ngược.',
    cancelledDescription: 'Đã hủy tối ưu hóa một nút.',
    failedDescription: 'Tối ưu một chạm thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tối ưu một chạm',
    reusedMessage: 'Đã khôi phục tác vụ tối ưu hóa một nút của chương hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy tối ưu một chạm',
    cancelRequestedMessage: 'Đã yêu cầu hủy tối ưu một chạm',
    runningMessage: 'Hiện đã có tác vụ tối ưu hóa một nút đang chạy',
    cancellingMessage: 'Tác vụ tối ưu một chạm hiện tại đang hủy, vui lòng đợi',
  },
  smartDetect: {
    title: 'Kiểm tra thông minh',
    runningDescription: 'sau khi kiểm tra xong sẽ tự động hiển thị mục thiếu và mô tả tối ưu.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'Kiểm tra thông minh đã hoàn tất, kết quả tự cập nhật.',
    cancelledDescription: 'Đã hủy kiểm tra thông minh.',
    failedDescription: 'Kiểm tra thông minh thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu kiểm tra thông minh',
    reusedMessage: 'Đã khôi phục tác vụ kiểm tra thông minh của tài nguyên hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy kiểm tra thông minh',
    cancelRequestedMessage: 'Đã yêu cầu hủy kiểm tra thông minh',
    runningMessage: 'Hiện đã có tác vụ kiểm tra thông minh đang chạy',
    cancellingMessage: 'Tác vụ kiểm tra thông minh hiện tại đang hủy, vui lòng đợi',
  },
  imageGeneration: {
    title: 'Tạo hình ảnh',
    runningDescription: 'hệ thống đang sinh ảnh phía sau, sau khi hoàn thành sẽ tự đồng bộ kết quả mới nhất.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'Tạo hình ảnh đã hoàn tất.',
    cancelledDescription: 'Đã hủy tạo hình ảnh.',
    failedDescription: 'Tạo ảnh thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tạo ảnh',
    reusedMessage: 'Đã khôi phục tác vụ tạo hình ảnh hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy tạo ảnh',
    cancelRequestedMessage: 'Đã yêu cầu hủy tạo ảnh',
    runningMessage: 'Hiện đã có tác vụ tạo hình ảnh đang chạy',
    cancellingMessage: 'Tác vụ tạo ảnh hiện tại đang hủy, vui lòng đợi',
  },
  videoGeneration: {
    title: 'Tạo video',
    runningDescription: 'Hệ thống đang tạo video ở nền, sau khi hoàn tất có thể quay lại phân cảnh hiện tại để xem.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'Tạo video đã hoàn tất.',
    cancelledDescription: 'Đã hủy tạo video.',
    failedDescription: 'Tạo video thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tạo video',
    reusedMessage: 'Đã khôi phục tác vụ tạo video hiện tại',
    cancelledImmediatelyMessage: 'Đã hủy tạo video',
    cancelRequestedMessage: 'Đã yêu cầu hủy tạo video',
    runningMessage: 'Hiện đã có tác vụ tạo video đang chạy',
    cancellingMessage: 'Tác vụ tạo video hiện tại đang hủy, vui lòng đợi',
  },
  shotFramePrompt: {
    title: 'Tạo prompt phân cảnh',
    runningDescription: 'Hệ thống đang tạo prompt phân cảnh ở nền, sau khi hoàn tất sẽ tự động điền ngược nội dung hiện tại.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'Đã tạo prompt phân cảnh.',
    cancelledDescription: 'Đã hủy tạo prompt phân cảnh.',
    failedDescription: 'Tạo prompt phân cảnh thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tạo prompt phân cảnh',
    reusedMessage: 'Đã khôi phục tác vụ tạo prompt phân cảnh hiện tại',
    cancelledImmediatelyMessage: 'sinh prompt phân cảnh đã hủy',
    cancelRequestedMessage: 'Đã yêu cầu hủy tạo prompt phân cảnh',
    runningMessage: 'Hiện đang có tác vụ tạo prompt phân cảnh đang chạy',
    cancellingMessage: 'tác vụ sinh prompt phân cảnh hiện tại đang hủy, vui lòng đợi giây lát',
  },
  shotFrameImage: {
    title: 'Tạo ảnh khung hình chính',
    runningDescription: 'Hệ thống đang tạo ảnh khung hình chính ở nền, sau khi hoàn tất sẽ tự động làm mới ảnh thu nhỏ hiện tại.',
    cancellingDescription: 'Đã gửi yêu cầu hủy, hệ thống sẽ dừng sau khi bước hiện tại kết thúc.',
    successDescription: 'Đã tạo hình ảnh khung hình chính.',
    cancelledDescription: 'Đã hủy tạo ảnh khung hình chính.',
    failedDescription: 'Tạo ảnh khung hình chính thất bại, vui lòng thử lại sau.',
    startedMessage: 'Đã bắt đầu tạo hình ảnh khung hình chính',
    reusedMessage: 'Đã khôi phục tác vụ tạo hình ảnh khung hình chính hiện tại',
    cancelledImmediatelyMessage: 'sinh ảnh khung hình chính đã hủy',
    cancelRequestedMessage: 'Đã yêu cầu hủy tạo ảnh khung hình chính',
    runningMessage: 'Hiện đang có tác vụ tạo ảnh khung hình chính đang chạy',
    cancellingMessage: 'tác vụ sinh ảnh khung hình chính hiện tại đang hủy, vui lòng đợi giây lát',
  },
} satisfies Record<string, TaskCopyPreset>

export const TASK_KIND_TITLE_MAP: Record<string, string> = {
  script_divide: TASK_COPY.chapterDivision.title,
  script_extract: TASK_COPY.scriptExtract.title,
  script_consistency: TASK_COPY.consistencyCheck.title,
  script_simplify: TASK_COPY.scriptSimplify.title,
  script_optimize: TASK_COPY.scriptOptimize.title,
  script_character_portrait: 'Phân tích hồ sơ nhân vật',
  script_prop_info: 'Phân tích thông tin đạo cụ',
  script_scene_info: 'Phân tích thông tin bối cảnh',
  script_costume_info: 'Phân tích thông tin trang phục',
  image_generation: 'Tạo ảnh',
  video_generation: 'Tạo video',
  shot_frame_prompt: 'Tạo prompt phân cảnh',
}

export const RELATION_TYPE_LABEL_MAP: Record<string, string> = {
  chapter_division: 'Chương',
  script_extraction: 'Chương',
  consistency_check: 'Chương',
  script_optimization: 'Chương',
  script_simplification: 'chương',
  character_portrait_analysis: 'Tài nguyên',
  prop_info_analysis: 'Tài nguyên',
  scene_info_analysis: 'Tài nguyên',
  costume_info_analysis: 'tài nguyên',
  video: 'Video phân cảnh',
  shot_first_frame_prompt: 'Prompt khung hình đầu',
  shot_last_frame_prompt: 'Prompt khung hình cuối',
  shot_key_frame_prompt: 'Prompt khung hình chính',
  actor_image: 'Ảnh diễn viên',
  scene_image: 'Ảnh bối cảnh',
  prop_image: 'Ảnh đạo cụ',
  costume_image: 'Ảnh trang phục',
  character_image: 'Ảnh nhân vật',
  shot_frame_image: 'Ảnh khung phân cảnh',
}

export function resolveTaskTitle(taskKind?: string | null): string {
  if (!taskKind) return 'Tác vụ nền'
  return TASK_KIND_TITLE_MAP[taskKind] ?? taskKind.split('_').join(' ')
}

export function resolveTaskSourceLabel(
  relationType?: string | null,
  relationEntityId?: string | null,
): string | null {
  if (!relationType) return null
  const label = RELATION_TYPE_LABEL_MAP[relationType] ?? 'đối tượng liên kết'
  if (!relationEntityId) return label
  return `${label}：${relationEntityId}`
}
