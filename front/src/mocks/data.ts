export type ProjectStyle = 'Chủ nghĩa hiện thực' | 'Khoa học viễn tưởng' | 'Cổ phong' | 'Hài kịch đô thị'

export type ChapterStatus = 'draft' | 'shooting' | 'done'

export interface ProjectStats {
  chapters: number
  roles: number
  scenes: number
  props: number
}

export interface Project {
  id: string
  name: string
  description: string
  style: ProjectStyle
  seed: number
  unifyStyle: boolean
  progress: number
  stats: ProjectStats
  updatedAt: string
}

export interface Chapter {
  id: string
  projectId: string
  index: number
  title: string
  summary: string
  storyboardCount: number
  status: ChapterStatus
  updatedAt: string
}

export type ShotStatus = 'pending' | 'ready'

export interface Shot {
  id: string
  chapterId: string
  index: number
  title: string
  duration: number
  thumbnail: string
  status: ShotStatus
  scriptExcerpt: string
}

export type CameraShotType = 'Rất gần' | 'Cận cảnh' | 'Trung cảnh' | 'Toàn cảnh'
export type CameraAngle = 'Bình thùy' | 'Ngang mắt' | 'Nhìn từ trên xuống' | 'Xoay trục lên'
export type CameraMovement = 'Đẩy máy' | 'Rút máy' | 'Theo dõi máy' | 'Cố định'

export interface ShotDetail {
  id: string
  cameraShot: CameraShotType
  angle: CameraAngle
  movement: CameraMovement
  sceneAssetId: string | null
  duration: number
  moodTags: string[]
  atmosphere: string
  followAtmosphere: boolean
  dialog: {
    role: string
    text: string
  }[]
  hasBgm: boolean
}

export type AssetType = 'actor' | 'scene' | 'prop' | 'costume'

export interface Asset {
  id: string
  type: AssetType
  name: string
  description: string
  thumbnail: string
  tags: string[]
  promptTemplateId?: string
}

export type PromptCategory =
  | 'frame_head'
  | 'frame_tail'
  | 'frame_key'
  | 'video'
  | 'storyboard'
  | 'bgm'
  | 'sfx'
  | 'role'
  | 'combined'

export interface PromptTemplate {
  id: string
  category: PromptCategory
  name: string
  preview: string
  content: string
  variables: string[]
}

export type FileType = 'image' | 'video'

export interface FileItem {
  id: string
  type: FileType
  name: string
  thumbnail: string
  tags: string[]
  createdAt: string
  projectId: string
  chapterId?: string
}

export interface TimelineClip {
  id: string
  type: 'video' | 'audio'
  sourceId: string
  label: string
  start: number
  end: number
  track: number
}

/** Loại Agent: trích xuất cốt truyện, trích xuất nhân vật, trích xuất bối cảnh, trích xuất đạo cụ, khác */
export type AgentTypeKey = 'plot' | 'character' | 'scene' | 'prop' | 'other'

export interface Agent {
  id: string
  name: string
  type: AgentTypeKey
  description: string
  isDefault: boolean
  version: string
  updatedAt: string
  createdAt: string
  createdBy: string
  updatedBy: string
}

/** Trạng thái nhà cung cấp (khớp endpoint thực tế /api/v1/llm) */
export type ProviderStatus = 'active' | 'testing' | 'disabled'

/** nhà cung cấp(snake_case, đối chiếu với ProviderRead của API thật) */
export interface Provider {
  id: string
  name: string
  base_url: string
  api_key?: string
  api_secret?: string
  description?: string
  status?: ProviderStatus
  created_by?: string
}

/** Hạng mục mô hình: văn bản / ảnh / video */
export type ModelCategoryKey = 'text' | 'image' | 'video'

/** mô hình(snake_case, đối chiếu với ModelRead của API thật) */
export interface Model {
  id: string
  name: string
  category: ModelCategoryKey
  provider_id: string
  params?: Record<string, unknown>
  description?: string
  is_default?: boolean
  created_by?: string
}

/** Cài đặt toàn cục quản lý mô hình (snake_case, khớp với ModelSettingsRead của API thực) */
export interface ModelSettings {
  default_text_model_id: string | null
  default_image_model_id: string | null
  default_video_model_id: string | null
  api_timeout: number
  log_level: 'debug' | 'info' | 'warn' | 'error'
}

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Kịch bản ngắn tình yêu đô thị hiện thực',
    description: 'chuyện tình thành phố hiện thực xoay quanh cặp đôi Bắc Địch, nhấn mạnh viết thực và chi tiết cảm xúc.',
    style: 'Chủ nghĩa hiện thực',
    seed: 12345,
    unifyStyle: true,
    progress: 46,
    stats: {
      chapters: 8,
      roles: 6,
      scenes: 12,
      props: 24,
    },
    updatedAt: '2026-03-01 14:32',
  },
  {
    id: 'p2',
    name: 'Truy đuổi cyberpunk',
    description: 'short drama cybergangsters cảnh sát đuổi bắt dưới đêm mưa neon, nhấn mạnh ánh sáng bóng đổ và chiều sâu thành phố.',
    style: 'Khoa học viễn tưởng',
    seed: 9876,
    unifyStyle: true,
    progress: 72,
    stats: {
      chapters: 5,
      roles: 4,
      scenes: 9,
      props: 18,
    },
    updatedAt: '2026-02-27 09:18',
  },
  {
    id: 'p3',
    name: 'Cổ phong mưu lược · Đêm Trường An',
    description: 'Trường An cổ đại hư cấu, triều đình và giang hồ đan xen, cả mưu quyền lẫn tình nghĩa.',
    style: 'Cổ phong',
    seed: 45678,
    unifyStyle: true,
    progress: 28,
    stats: {
      chapters: 12,
      roles: 8,
      scenes: 20,
      props: 35,
    },
    updatedAt: '2026-03-02 09:00',
  },
  {
    id: 'p4',
    name: 'Hài kịch đô thị・Nhật ký ở chung',
    description: 'ba người trẻ có tính cách khác biệt chung một phòng, thường nhật có cả tiếng cười lẫn ấm áp.',
    style: 'Hài kịch đô thị',
    seed: 11111,
    unifyStyle: false,
    progress: 55,
    stats: {
      chapters: 6,
      roles: 5,
      scenes: 8,
      props: 15,
    },
    updatedAt: '2026-03-01 18:22',
  },
  {
    id: 'p5',
    name: 'Khoa học viễn tưởng · Đài tín vũ trụ sâu',
    description: 'con tàu khảo cứu vũ trụ sâu đầu tiên của nhân loại phát hiện điểm báo bí ẩn ở vùng sao không xác định, kết hợp bí ẩn và hard sci-fi.',
    style: 'Khoa học viễn tưởng',
    seed: 77777,
    unifyStyle: true,
    progress: 10,
    stats: {
      chapters: 3,
      roles: 4,
      scenes: 6,
      props: 12,
    },
    updatedAt: '2026-02-26 16:45',
  },
]

export const chapters: Chapter[] = [
  {
    id: 'c1',
    projectId: 'p1',
    index: 1,
    title: 'Tập 1: Cãi vã trong phòng cho thuê',
    summary: 'Trong nhà thuê lúc nửa đêm, Tiểu Vũ và A Xuyên cãi nhau gay gắt vì tiền thuê nhà và tương lai.',
    storyboardCount: 12,
    status: 'shooting',
    updatedAt: '2026-03-01 12:20',
  },
  {
    id: 'c2',
    projectId: 'p1',
    index: 2,
    title: 'Tập 2: Đêm trước phỏng vấn',
    summary: 'Đêm mưa bão, Tiểu Vũ nhận thông báo phỏng vấn lần cuối, lại phát hiện mất chứng minh thư.',
    storyboardCount: 10,
    status: 'draft',
    updatedAt: '2026-02-28 20:05',
  },
  {
    id: 'c3',
    projectId: 'p2',
    index: 1,
    title: 'Tập 1: Giao dịch tại ngã tư đèn neon',
    summary: 'Người buôn tin tức cyborg hoàn tất một giao dịch nguy hiểm tại góc phố đêm mưa.',
    storyboardCount: 15,
    status: 'done',
    updatedAt: '2026-02-27 10:30',
  },
  {
    id: 'c4',
    projectId: 'p2',
    index: 2,
    title: 'Tập 2: Đuổi xe và chiến đấu trong hẻm',
    summary: 'Cảnh sát và cyborg đuổi bắt, bắn nhau trên cầu vượt và trong ngõ hẻm.',
    storyboardCount: 18,
    status: 'draft',
    updatedAt: '2026-02-26 14:00',
  },
  {
    id: 'c5',
    projectId: 'p3',
    index: 1,
    title: 'Tập 1: Nhập kinh',
    summary: 'Kiếm khách thiếu niên mới đến Trường An, nghe chuyện chốn triều đình giữa khách quán.',
    storyboardCount: 14,
    status: 'shooting',
    updatedAt: '2026-03-02 08:30',
  },
  {
    id: 'c6',
    projectId: 'p4',
    index: 1,
    title: 'Tập 1: Ngày đầu chuyển đến',
    summary: 'Ba người lần đầu gặp nhau, vì khác biệt thói quen sinh hoạt mà gây ra không ít chuyện cười.',
    storyboardCount: 8,
    status: 'done',
    updatedAt: '2026-03-01 17:00',
  },
]

export const shots: Shot[] = [
  {
    id: 's1',
    chapterId: 'c1',
    index: 1,
    title: 'Viễn cảnh: Đêm khu nhà cũ ngoại ô thành phố',
    duration: 6,
    thumbnail: '/mock/thumbnails/p1-c1-s1.jpg',
    status: 'ready',
    scriptExcerpt: 'khu chung cư cũ ban đêm, dưới ánh đèn đường vàng vọt chỉ có vài người qua lại lẻ tẻ.',
  },
  {
    id: 's2',
    chapterId: 'c1',
    index: 2,
    title: 'Cận giữa: Quạt đứng yên trong phòng cho thuê',
    duration: 5,
    thumbnail: '/mock/thumbnails/p1-c1-s2.jpg',
    status: 'pending',
    scriptExcerpt: 'quạt điện kêu rè rè quay, shot từ từ đẩy vào mậu nợ trên bàn.',
  },
  {
    id: 's3',
    chapterId: 'c1',
    index: 3,
    title: 'Cận: Sự im lặng giữa hai người đối đầu',
    duration: 8,
    thumbnail: '/mock/thumbnails/p1-c1-s3.jpg',
    status: 'pending',
    scriptExcerpt: 'Tiểu Vũ và A Xuyên ngồi đối mặt, ai cũng không chịu nói trước.',
  },
  {
    id: 's7',
    chapterId: 'c1',
    index: 4,
    title: 'Cận: Ghi nợ trên bàn',
    duration: 4,
    thumbnail: '/mock/thumbnails/p1-c1-s4.jpg',
    status: 'ready',
    scriptExcerpt: 'Máy quay đẩy đến tờ nợ cũ nát nhăn nhúm, nét chữ mờ nhòe.',
  },
  {
    id: 's8',
    chapterId: 'c1',
    index: 5,
    title: 'Trung cảnh: Tiểu Vũ đứng dậy',
    duration: 5,
    thumbnail: '/mock/thumbnails/p1-c1-s5.jpg',
    status: 'ready',
    scriptExcerpt: 'Tiểu Vũ vụt đứng dậy, chiếc ghế phát ra tiếng ken két.',
  },
  {
    id: 's9',
    chapterId: 'c1',
    index: 6,
    title: 'Cận cảnh: A Xuyên ngẩng đầu',
    duration: 3,
    thumbnail: '/mock/thumbnails/p1-c1-s6.jpg',
    status: 'pending',
    scriptExcerpt: 'A Xuyên ngẩng đầu nhìn cô, muốn nói lại thôi.',
  },
  {
    id: 's10',
    chapterId: 'c1',
    index: 7,
    title: 'Toàn cảnh: Cảnh đêm bên ngoài cửa sổ',
    duration: 6,
    thumbnail: '/mock/thumbnails/p1-c1-s7.jpg',
    status: 'pending',
    scriptExcerpt: 'Nhìn qua cửa sổ thấy đèn đường và vài ánh đèn xe thưa thớt ở xa.',
  },
  {
    id: 's11',
    chapterId: 'c1',
    index: 8,
    title: 'Cận giữa: Tiểu Vũ quay lưng với máy quay',
    duration: 5,
    thumbnail: '/mock/thumbnails/p1-c1-s8.jpg',
    status: 'pending',
    scriptExcerpt: 'Tiểu Vũ quay lưng về phía máy quay đứng ở cửa, đôi vai run nhẹ.',
  },
  {
    id: 's12',
    chapterId: 'c1',
    index: 9,
    title: 'Cận cảnh: tay nắm cửa',
    duration: 2,
    thumbnail: '/mock/thumbnails/p1-c1-s9.jpg',
    status: 'ready',
    scriptExcerpt: 'Tay nắm tay cửa, dừng lại một lúc.',
  },
  {
    id: 's13',
    chapterId: 'c1',
    index: 10,
    title: 'Trung cảnh: cửa bị đẩy mở',
    duration: 4,
    thumbnail: '/mock/thumbnails/p1-c1-s10.jpg',
    status: 'pending',
    scriptExcerpt: 'Cửa mở, ánh sáng hành lang tràn vào.',
  },
  {
    id: 's14',
    chapterId: 'c1',
    index: 11,
    title: 'Cận cảnh: A Xuyên ngồi một mình',
    duration: 7,
    thumbnail: '/mock/thumbnails/p1-c1-s11.jpg',
    status: 'ready',
    scriptExcerpt: 'A Xuyên vẫn ngồi trước bàn, cúi đầu lặng thinh.',
  },
  {
    id: 's15',
    chapterId: 'c1',
    index: 12,
    title: 'Viễn cảnh: Toàn cảnh phòng cho thuê khép lại',
    duration: 6,
    thumbnail: '/mock/thumbnails/p1-c1-s12.jpg',
    status: 'pending',
    scriptExcerpt: 'Căn nhà thuê vắng vẻ, quạt vẫn quay, cánh cửa khép hờ.',
  },
  {
    id: 's4',
    chapterId: 'c2',
    index: 1,
    title: 'Phố đêm mưa',
    duration: 5,
    thumbnail: '/mock/thumbnails/p1-c2-s1.jpg',
    status: 'pending',
    scriptExcerpt: 'Mưa lớn trút xuống, Tiểu Vũ cầm chiếc ô rách lục túi bên vệ đường.',
  },
  {
    id: 's5',
    chapterId: 'c3',
    index: 1,
    title: 'Toàn cảnh góc phố đèn neon',
    duration: 7,
    thumbnail: '/mock/thumbnails/p2-c3-s1.jpg',
    status: 'ready',
    scriptExcerpt: 'Ngã tư đường đêm mưa, quảng cáo hologram và đèn neon đan xen.',
  },
  {
    id: 's6',
    chapterId: 'c5',
    index: 1,
    title: 'Ngoài cổng thành Trường An',
    duration: 6,
    thumbnail: '/mock/thumbnails/p3-c5-s1.jpg',
    status: 'pending',
    scriptExcerpt: 'Thiếu niên dắt ngựa vào thành, lính gác cổng soát xét.',
  },
]

export const shotDetails: ShotDetail[] = [
  {
    id: 's1',
    cameraShot: 'Toàn cảnh',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: 'scene1',
    duration: 6,
    moodTags: ['Nặng nề', 'Cảnh đêm thành thị'],
    atmosphere: 'Trời âm u, sương nhẹ, đèn đường nghiêng tông ấm, tổng thể độ bão hòa thấp.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's2',
    cameraShot: 'Trung cảnh',
    angle: 'Nhìn từ trên xuống',
    movement: 'Đẩy máy',
    sceneAssetId: 'scene2',
    duration: 5,
    moodTags: ['Lo âu', 'Ngột ngạt'],
    atmosphere: 'Phòng thuê chật hẹp, đèn trần trắng lạnh, bóng rõ nét.',
    followAtmosphere: true,
    dialog: [
      {
        role: 'Tiểu Vũ',
        text: 'Hay là, bọn mình về lại quê nhà đi……',
      },
    ],
    hasBgm: true,
  },
  {
    id: 's3',
    cameraShot: 'Cận cảnh',
    angle: 'Bình thùy',
    movement: 'Theo dõi máy',
    sceneAssetId: 'scene2',
    duration: 8,
    moodTags: ['Đối đầu', 'Điểm tới hạn'],
    atmosphere: 'Máy quay sát nhân vật, nền mờ, chỉ còn tiếng thở và tiếng quạt điện.',
    followAtmosphere: false,
    dialog: [
      {
        role: 'A Xuyên',
        text: '“Chúng ta” mà cậu nói, rốt cuộc còn có tôi không?',
      },
    ],
    hasBgm: false,
  },
  {
    id: 's4',
    cameraShot: 'Trung cảnh',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: null,
    duration: 5,
    moodTags: ['Lo âu', 'Đêm mưa'],
    atmosphere: 'Đường phố đêm mưa, đèn đường vàng úa, nhìn rõ tơ mưa.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's5',
    cameraShot: 'Toàn cảnh',
    angle: 'Nhìn từ trên xuống',
    movement: 'Cố định',
    sceneAssetId: null,
    duration: 7,
    moodTags: ['Cyberpunk', 'Đêm mưa'],
    atmosphere: 'Neon và quảng cáo hologram, giọt mưa phản chiếu sáng tối.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's6',
    cameraShot: 'Trung cảnh',
    angle: 'Ngang mắt',
    movement: 'Theo dõi máy',
    sceneAssetId: null,
    duration: 6,
    moodTags: ['Cổ phong', 'Vào thành'],
    atmosphere: 'Tương phản sáng tối trong vòm cổng thành, bụi bay trong ánh sáng.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's7',
    cameraShot: 'Rất gần',
    angle: 'Nhìn từ trên xuống',
    movement: 'Đẩy máy',
    sceneAssetId: 'scene2',
    duration: 4,
    moodTags: ['Nặng nề', 'Chi tiết'],
    atmosphere: 'Ánh đèn trên cao, vết gập và bóng đổ của giấy ghi nợ.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: false,
  },
  {
    id: 's8',
    cameraShot: 'Trung cảnh',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 5,
    moodTags: ['Bùng nổ', 'Căng thẳng'],
    atmosphere: 'Đèn trần trong nhà, hành động kéo theo bóng đổ.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's9',
    cameraShot: 'Cận cảnh',
    angle: 'Xoay trục lên',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 3,
    moodTags: ['Kìm nén', 'Im lặng'],
    atmosphere: 'Quay từ dưới lên, biểu cảm của A Xuyên kìm nén.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: false,
  },
  {
    id: 's10',
    cameraShot: 'Toàn cảnh',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 6,
    moodTags: ['Lạnh lùng', 'Ánh đêm'],
    atmosphere: 'Cảnh đêm ngoài cửa sổ, tương phản nóng-lạnh với bên trong.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's11',
    cameraShot: 'Trung cảnh',
    angle: 'Bình thùy',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 5,
    moodTags: ['Quyết tuyệt', 'Ra đi'],
    atmosphere: 'Quay lưng với máy, đường viền ánh sáng ngược ở cửa.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's12',
    cameraShot: 'Rất gần',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 2,
    moodTags: ['Do dự', 'Chi tiết'],
    atmosphere: 'Cận tay nắm cửa, bàn tay khẽ động.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: false,
  },
  {
    id: 's13',
    cameraShot: 'Trung cảnh',
    angle: 'Ngang mắt',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 4,
    moodTags: ['Phân ly', 'Ánh sáng và bóng tối'],
    atmosphere: 'Cửa mở, ánh ấm của hành lang và ánh lạnh trong phòng đan xen.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's14',
    cameraShot: 'Cận cảnh',
    angle: 'Nhìn từ trên xuống',
    movement: 'Cố định',
    sceneAssetId: 'scene2',
    duration: 7,
    moodTags: ['Cô độc', 'Im lặng'],
    atmosphere: 'A-sen ngồi một mình, đèn trần kéo dài bóng.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
  {
    id: 's15',
    cameraShot: 'Toàn cảnh',
    angle: 'Ngang mắt',
    movement: 'Rút máy',
    sceneAssetId: 'scene2',
    duration: 6,
    moodTags: ['Dư âm', 'Lạnh lẽo'],
    atmosphere: 'Toàn nhà đang dọn dẹp, quạt, cánh cửa khép hờ, khoảng lặng.',
    followAtmosphere: true,
    dialog: [],
    hasBgm: true,
  },
]

export const assets: Asset[] = [
  {
    id: 'actor1',
    type: 'actor',
    name: 'Nữ chính・Tiểu Vũ (Chủ nghĩa hiện thực)',
    description: '25 tuổi, vận hành internet, hơi mệt mỏi nhưng ánh mắt kiên định, tóc ngắn, gương mặt mộc thiên thực.',
    thumbnail: '/mock/assets/actor-xiaoyu.jpg',
    tags: ['Chủ nghĩa hiện thực', 'Đô thị', 'Nữ chính'],
    promptTemplateId: 'pt_role_xiaoyu',
  },
  {
    id: 'actor2',
    type: 'actor',
    name: 'Nam chính・A Xuyên (Chủ nghĩa hiện thực)',
    description: 'Nhiếp ảnh gia 27 tuổi, đeo kính gọng kim loại, thường mặc áo hoodie rộng.',
    thumbnail: '/mock/assets/actor-achuan.jpg',
    tags: ['Chủ nghĩa hiện thực', 'Đô thị', 'Nam chính'],
    promptTemplateId: 'pt_role_achuan',
  },
  {
    id: 'scene1',
    type: 'scene',
    name: 'Đêm khu nhà cũ ngoại ô thành phố',
    description: 'khu chung cư cũ thập niên 80, tường ngoại loang lổ, đèn đường vàng vọt, xa xa có cầu vượt với vệt ánh xe cộ.',
    thumbnail: '/mock/assets/scene-old-community.jpg',
    tags: ['Cảnh đêm', 'Chủ nghĩa hiện thực', 'Vùng ngoại ô thành phố'],
  },
  {
    id: 'scene2',
    type: 'scene',
    name: 'Nhà trọ mười mét vuông',
    description: 'căn cho thuê chưa đến 10m vuông, giường tầng, đồ đạc chất đầy, chiếc cửa sổ duy nhất hướng ra song cửa chống trộm.',
    thumbnail: '/mock/assets/scene-rent-room.jpg',
    tags: ['Trong nhà', 'Nặng nề', 'Nhà thuê'],
  },
  {
    id: 'prop1',
    type: 'prop',
    name: 'Giấy nợ ố vàng',
    description: 'Tờ giấy nợ bằng giấy bị gấp đi gấp lại, có số tiền vay viết tay và chữ ký.',
    thumbnail: '/mock/assets/prop-debt-note.jpg',
    tags: ['Giấy', 'Cận chi tiết'],
  },
]

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'pt_frame_head_city',
    category: 'frame_head',
    name: 'Toàn cảnh mở đầu phố đêm',
    preview: 'Qua góc cao nhìn xuống thành phố ban đêm, đèn neon và vệt sáng xe cộ đan xen……',
    content:
      '【Cảnh xa】【{city_name} đêm】góc nhìn từ trên cao, đường chính thành phố cùng khu chung cư cũ trong một khung hình, mặt đường sau mưa phản chiếu đèn neon, tổng thể độ bão hòa thấp, ánh sáng điện ảnh, phong cách hiện thực.',
    variables: ['city_name'],
  },
  {
    id: 'pt_role_xiaoyu',
    category: 'role',
    name: 'Prompt nhân vật nữ chính Tiểu Vũ',
    preview: 'Nữ giới internet 25 tuổi, hơi mệt mỏi nhưng ánh mắt kiên định……',
    content:
      'Phụ nữ Đông Á 25 tuổi, tóc ngắn, không trang điểm thiên chân thực, dáng hơi gầy, mặc đồ ở nhà giá rẻ, bối cảnh là phòng trọ chật hẹp, phong cách chân thực hiện thực, phân cảnh tập trung khắc họa chi tiết ánh mắt.',
    variables: [],
  },
  {
    id: 'pt_bgm_subtle',
    category: 'bgm',
    name: 'Nhạc nền cảm xúc đô thị điềm đạm',
    preview: 'Kết hợp piano và âm thanh môi trường, hướng kìm chế, không gào khóc thái quá……',
    content:
      'Thanh piano tần số thấp lẫn với tiếng ồn môi trường nhẹ, nhịp chậm, tránh biến động cao độ lớn, tổng thể giữ chừng mực, làm nổi bật gợn sóng nội tâm nhân vật thay vì ủy mị.',
    variables: [],
  },
  {
    id: 'pt_combined_chapter_init',
    category: 'combined',
    name: 'Prompt tổng hợp chương・Đô thị hiện thực',
    preview: 'Tự động ghép nối prompt nhân vật, bối cảnh và không khí……',
    content:
      'Dựa trên tóm tắt chương để mô tả khung hình chính đầu/cuối, tự động ghép phong cách thống nhất của dự án, prompt nhân vật chính, bối cảnh cốt lõi và từ khóa cảm xúc, đảm bảo ngôn ngữ hình ảnh cả tập nhất quán và phù hợp tông trực quan của dự án.',
    variables: ['chapter_summary'],
  },
]

export const files: FileItem[] = [
  {
    id: 'f1',
    type: 'image',
    name: 'p1-c1-s1-Khung hình đầu cảnh đêm thành thị',
    thumbnail: '/mock/files/p1-c1-s1-head.jpg',
    tags: ['khung hình đầu', 'cảnh đêm thành phố', 'chủ nghĩa hiện thực'],
    createdAt: '2026-03-01 14:35',
    projectId: 'p1',
    chapterId: 'c1',
  },
  {
    id: 'f2',
    type: 'video',
    name: 'p1-c1-bản-tập-v1',
    thumbnail: '/mock/files/p1-c1-edit-v1.jpg',
    tags: ['Phim hoàn chỉnh', 'Phiên bản 1'],
    createdAt: '2026-03-02 10:12',
    projectId: 'p1',
    chapterId: 'c1',
  },
  {
    id: 'f3',
    type: 'image',
    name: 'p2-c3-s1-Khung hình đầu ngã rẽ đèn neon',
    thumbnail: '/mock/files/p2-c3-s1.jpg',
    tags: ['Khung hình đầu', 'Viễn tưởng', 'Cyberpunk'],
    createdAt: '2026-02-27 11:00',
    projectId: 'p2',
    chapterId: 'c3',
  },
  {
    id: 'f4',
    type: 'video',
    name: 'p2-c3-phim hoàn chỉnh',
    thumbnail: '/mock/files/p2-c3-video.jpg',
    tags: ['Phim hoàn chỉnh', 'Khoa học viễn tưởng'],
    createdAt: '2026-02-28 09:20',
    projectId: 'p2',
    chapterId: 'c3',
  },
  {
    id: 'f5',
    type: 'image',
    name: 'p4-c6-khung-hinh-dau-o-chung',
    thumbnail: '/mock/files/p4-c6-s1.jpg',
    tags: ['Khung hình đầu', 'Hài kịch đô thị'],
    createdAt: '2026-03-01 16:00',
    projectId: 'p4',
    chapterId: 'c6',
  },
]

export const timelineClips: TimelineClip[] = [
  {
    id: 'tc1',
    type: 'video',
    sourceId: 'f2',
    label: 'Mở đầu phố đêm',
    start: 0,
    end: 6,
    track: 1,
  },
  {
    id: 'tc2',
    type: 'audio',
    sourceId: 'bgm1',
    label: 'Nhạc nền cảm xúc đô thị điềm đạm',
    start: 0,
    end: 20,
    track: 2,
  },
]

export const agents: Agent[] = [
  {
    id: 'agent1',
    name: 'Agent trích xuất kịch bản v2.1',
    type: 'plot',
    description: 'Trích xuất cốt truyện chính dựa trên GPT-4, tối ưu hiệu suất',
    isDefault: true,
    version: 'v2.1',
    updatedAt: '2026-03-05',
    createdAt: '2026-02-01',
    createdBy: 'extreme',
    updatedBy: 'extreme',
  },
  {
    id: 'agent2',
    name: 'Agent trích xuất nhân vật v1.0',
    type: 'character',
    description: 'Trích xuất tên và quan hệ nhân vật từ kịch bản',
    isDefault: true,
    version: 'v1.0',
    updatedAt: '2026-03-04',
    createdAt: '2026-02-10',
    createdBy: 'extreme',
    updatedBy: 'extreme',
  },
  {
    id: 'agent3',
    name: 'Agent trích xuất bối cảnh v1.2',
    type: 'scene',
    description: 'Nhận diện chuyển cảnh và mô tả bối cảnh',
    isDefault: false,
    version: 'v1.2',
    updatedAt: '2026-03-03',
    createdAt: '2026-02-15',
    createdBy: 'extreme',
    updatedBy: 'extreme',
  },
  {
    id: 'agent4',
    name: 'Agent trích xuất đạo cụ v1.0',
    type: 'prop',
    description: 'Trích xuất đạo cụ và vật phẩm quan trọng xuất hiện trong kịch bản',
    isDefault: false,
    version: 'v1.0',
    updatedAt: '2026-03-02',
    createdAt: '2026-02-20',
    createdBy: 'extreme',
    updatedBy: 'extreme',
  },
  {
    id: 'agent5',
    name: 'Agent trích xuất kịch bản v2.0',
    type: 'plot',
    description: 'Trích xuất cốt truyện phiên bản cũ, giữ lại để so sánh',
    isDefault: false,
    version: 'v2.0',
    updatedAt: '2026-02-28',
    createdAt: '2026-01-25',
    createdBy: 'extreme',
    updatedBy: 'extreme',
  },
]

export const providers: Provider[] = [
  {
    id: 'prov1',
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    description: 'Hỗ trợ mô hình họ GPT',
    status: 'active',
    created_by: 'extreme',
  },
  {
    id: 'prov2',
    name: 'Anthropic',
    base_url: 'https://api.anthropic.com/v1',
    description: 'Họ Claude',
    status: 'active',
    created_by: 'extreme',
  },
  {
    id: 'prov3',
    name: 'Proxy cục bộ',
    base_url: 'http://localhost:8080/v1',
    description: 'Thử chuyển tiếp cục bộ',
    status: 'testing',
    created_by: 'extreme',
  },
]

export const llmModels: Model[] = [
  {
    id: 'model1',
    name: 'GPT-4',
    category: 'text',
    provider_id: 'prov1',
    params: { max_tokens: 4096, temperature: 0.7 },
    description: 'Mô hình tạo văn bản hiệu năng cao',
    is_default: true,
    created_by: 'extreme',
  },
  {
    id: 'model2',
    name: 'GPT-3.5-turbo',
    category: 'text',
    provider_id: 'prov1',
    params: { max_tokens: 2048 },
    description: 'Mô hình văn bản dùng chung',
    is_default: false,
    created_by: 'extreme',
  },
  {
    id: 'model3',
    name: 'Claude-3',
    category: 'text',
    provider_id: 'prov2',
    params: { max_tokens: 4096 },
    description: 'Văn bản dài và suy luận',
    is_default: false,
    created_by: 'extreme',
  },
  {
    id: 'model4',
    name: 'DALL-E 3',
    category: 'image',
    provider_id: 'prov1',
    params: { resolution: '1024x1024' },
    description: 'Tạo ảnh',
    is_default: true,
    created_by: 'extreme',
  },
  {
    id: 'model5',
    name: 'Sora',
    category: 'video',
    provider_id: 'prov1',
    params: {},
    description: 'Tạo video',
    is_default: true,
    created_by: 'extreme',
  },
]

export const defaultModelSettings: ModelSettings = {
  default_text_model_id: 'model1',
  default_image_model_id: 'model4',
  default_video_model_id: 'model5',
  api_timeout: 30,
  log_level: 'info',
}
