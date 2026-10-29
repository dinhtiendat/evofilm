import { Card, Button, Statistic, Row, Col, Progress, Space, Spin } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TabKey } from '../constants'
import { getChapterShotsPath, getChapterStudioPath, getProjectChaptersPath, getProjectEditorPath } from '../routes'
import { useProject, useChapters } from '../hooks/useProjectData'
import { ensureHasShotsBeforeShooting } from '../ensureHasShotsBeforeShooting'
import { getChapterPreparationState } from '../chapterPreparation'
import {
  loadChapterFlowStats,
  loadProjectFlowStatsForChapters,
  type ChapterFlowStats,
  type ProjectFlowStats,
} from '../projectFlowStats'

export function DashboardTab({ onSelectTab }: { onSelectTab: (tab: TabKey) => void }) {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { project, loading: projectLoading } = useProject(projectId)
  const { chapters, loading: chaptersLoading } = useChapters(projectId)
  const [flowStats, setFlowStats] = useState<ProjectFlowStats>({
    totalShots: 0,
    pendingConfirmShots: 0,
    readyShots: 0,
    generatingShots: 0,
  })
  const [chapterFlowStats, setChapterFlowStats] = useState<ChapterFlowStats[]>([])
  const [flowStatsLoading, setFlowStatsLoading] = useState(false)

  const loading = projectLoading || chaptersLoading
  const chaptersByIndex = [...chapters].sort((a, b) => a.index - b.index)
  const incompleteChapters = chaptersByIndex.filter((c) => c.status !== 'done')
  const recommendedChapter =
    chaptersByIndex.find((chapter) => getChapterPreparationState(chapter).key === 'edit_raw') ??
    chaptersByIndex.find((chapter) => getChapterPreparationState(chapter).key === 'extract_shots') ??
    chaptersByIndex.find((chapter) => getChapterPreparationState(chapter).key === 'prepare_shots') ??
    chaptersByIndex.find((chapter) => getChapterPreparationState(chapter).key === 'shoot') ??
    chaptersByIndex[0] ??
    null

  useEffect(() => {
    let cancelled = false
    if (!projectId || !chapters.length) {
      setFlowStats({
        totalShots: 0,
        pendingConfirmShots: 0,
        readyShots: 0,
        generatingShots: 0,
      })
      setChapterFlowStats([])
      return () => {
        cancelled = true
      }
    }

    const run = async () => {
      setFlowStatsLoading(true)
      try {
        const [stats, chapterStats] = await Promise.all([
          loadProjectFlowStatsForChapters(chapters),
          loadChapterFlowStats(chapters),
        ])
        if (!cancelled) setFlowStats(stats)
        if (!cancelled) setChapterFlowStats(chapterStats)
      } catch {
        if (!cancelled) {
          setFlowStats({
            totalShots: 0,
            pendingConfirmShots: 0,
            readyShots: 0,
            generatingShots: 0,
          })
          setChapterFlowStats([])
        }
      } finally {
        if (!cancelled) setFlowStatsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [chapters, projectId])

  if (loading && !project) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spin size="large" tip="Đang tải…" />
      </div>
    )
  }
  if (!project) {
    return null
  }

  const incompleteCount = incompleteChapters.length
  const recommendedState = recommendedChapter ? getChapterPreparationState(recommendedChapter) : null
  const chaptersNeedingRawText = chaptersByIndex.filter((chapter) => getChapterPreparationState(chapter).key === 'edit_raw').length
  const chaptersNeedingShotExtract = chaptersByIndex.filter((chapter) => getChapterPreparationState(chapter).key === 'extract_shots').length
  const chaptersNeedingShotPrep = chaptersByIndex.filter((chapter) => getChapterPreparationState(chapter).key === 'prepare_shots').length
  const chaptersReadyForShoot = chaptersByIndex.filter((chapter) => getChapterPreparationState(chapter).key === 'shoot').length
  const topPendingChapter = [...chapterFlowStats].sort((a, b) => b.pendingConfirmShots - a.pendingConfirmShots)[0]
  const topGeneratingChapter = [...chapterFlowStats].sort((a, b) => b.generatingShots - a.generatingShots)[0]
  const topReadyChapter = [...chapterFlowStats].sort((a, b) => b.readyShots - a.readyShots)[0]

  const handleRecommendedAction = () => {
    if (!projectId) return
    if (!recommendedChapter || !recommendedState) {
      onSelectTab('chapters')
      return
    }
    if (recommendedState.key === 'edit_raw') {
      onSelectTab('chapters')
      navigate(`/projects/${projectId}?tab=chapters&edit=${recommendedChapter.id}`, { replace: false })
      return
    }
    if (recommendedState.key === 'extract_shots') {
      navigate(getChapterShotsPath(projectId, recommendedChapter.id))
      return
    }
    if (recommendedState.key === 'prepare_shots') {
      navigate(getChapterStudioPath(projectId, recommendedChapter.id))
      return
    }
    void ensureHasShotsBeforeShooting({
      projectId,
      chapterId: recommendedChapter.id,
      storyboardCount: recommendedChapter.storyboardCount,
      navigate,
    })
  }

  const chapterTodoCards = [
    {
      key: 'edit_raw',
      title: 'Chờ bổ sung nguyên văn',
      count: chaptersNeedingRawText,
      hint: 'Những chương này chưa vào luồng phân cảnh',
      icon: <ClockCircleOutlined />,
    },
    {
      key: 'extract_shots',
      title: 'Phân cảnh chờ trích xuất',
      count: chaptersNeedingShotExtract,
      hint: 'Đã có nguyên văn, có thể vào trích xuất phân cảnh ngay',
      icon: <ClockCircleOutlined />,
    },
    {
      key: 'prepare_shots',
      title: 'Phân cảnh chờ chuẩn bị',
      count: chaptersNeedingShotPrep,
      hint: 'Đã có phân cảnh, đề nghị vào studio để tiếp tục xử lý',
      icon: <ClockCircleOutlined />,
    },
    {
      key: 'shoot',
      title: 'Có thể tiếp tục quay',
      count: chaptersReadyForShoot,
      hint: 'Phần chương này đã đủ điều kiện để tiếp tục quay',
      icon: <CheckCircleOutlined />,
    },
  ] as const

  return (
    <div className="space-y-6">
      <Card size="small">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-medium">hành động khuyến nghị hiện tại</div>
            <div className="text-xs text-gray-500">
              {recommendedChapter && recommendedState
                ? `Chương ${recommendedChapter.index} · ${recommendedState.hint}`
                : 'Chưa có chương, có thể tạo chương đầu tiên trước'}
            </div>
          </div>
          <Space wrap>
            <Button onClick={() => onSelectTab('chapters')}>Vào quản lý chương</Button>
            <Button onClick={() => projectId && navigate(getProjectEditorPath(projectId))}>Vào hậu kỳ dựng phim</Button>
            <Button
              type="primary"
              icon={recommendedState?.primaryIcon ?? <VideoCameraOutlined />}
              onClick={handleRecommendedAction}
            >
              {recommendedChapter && recommendedState ? recommendedState.primaryAction : 'Tạo chương một'}
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="h-full">
            <Statistic title="Chương chưa hoàn thành" value={incompleteCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="h-full">
            <Statistic
              title="Phân cảnh chờ xác nhận"
              value={flowStats.pendingConfirmShots}
              suffix={flowStats.totalShots ? `/ ${flowStats.totalShots}` : undefined}
              loading={flowStatsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="h-full">
            <Statistic
              title="Phân cảnh đã sẵn sàng"
              value={flowStats.readyShots}
              loading={flowStatsLoading}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="h-full">
            <Statistic
              title="Phân cảnh đang tạo"
              value={flowStats.generatingShots}
              loading={flowStatsLoading}
              prefix={<ClockCircleOutlined />}
            />
            <Progress
              percent={flowStats.totalShots ? Math.round((flowStats.readyShots / flowStats.totalShots) * 100) : project.progress}
              showInfo={false}
              size="small"
              strokeColor={{ from: '#6366f1', to: '#a855f7' }}
              className="mt-1"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Công việc chờ hiện tại"
        size="small"
        extra={
          <Button type="link" onClick={() => projectId && navigate(getProjectChaptersPath(projectId))}>
            Xem tất cả
          </Button>
        }
      >
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 140 }}>
          {chapters.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 py-8">
              Chưa có chương nào cả,
              <Button type="link" className="p-0" onClick={() => onSelectTab('chapters')}>
                Tạo chương đầu tiên ngay
              </Button>
            </div>
          ) : (
            chapterTodoCards.map((item) => (
              <Card
                key={item.key}
                size="small"
                hoverable
                className="shrink-0 cursor-pointer"
                style={{ width: 280 }}
                onClick={() => onSelectTab('chapters')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium truncate">{item.title}</div>
                  <span className="text-gray-400">{item.icon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">{item.count}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.hint}
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card title="Tóm tắt động" size="small">
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2 font-medium text-amber-800">
                  <ClockCircleOutlined />
                  Áp lực chờ xác nhận lớn nhất
                </div>
                <div className="mt-1 text-gray-700">
                  {topPendingChapter && topPendingChapter.pendingConfirmShots > 0
                    ? `Chương ${topPendingChapter.chapterIndex ?? '-'} còn ${topPendingChapter.pendingConfirmShots} phân cảnh chờ xác nhận, nên ưu tiên xử lý.`
                    : 'Hiện không có phân cảnh chờ xác nhận tồn đọng.'}
                </div>
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-2 font-medium text-blue-800">
                  <VideoCameraOutlined />
                  Hoạt động tạo mạnh nhất hiện nay
                </div>
                <div className="mt-1 text-gray-700">
                  {topGeneratingChapter && topGeneratingChapter.generatingShots > 0
                    ? `Chương ${topGeneratingChapter.chapterIndex ?? '-'} có ${topGeneratingChapter.generatingShots} phân cảnh đang tạo dựng, có thể tiếp tục theo dõi kết quả.`
                    : 'Hiện không có phân cảnh nào đang tạo.'}
                </div>
              </div>

              <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2 font-medium text-emerald-800">
                  <CheckCircleOutlined />
                  Phù hợp nhất để tiếp tục triển khai
                </div>
                <div className="mt-1 text-gray-700">
                  {topReadyChapter && topReadyChapter.readyShots > 0
                    ? `Chương ${topReadyChapter.chapterIndex ?? '-'} đã có ${topReadyChapter.readyShots} phân cảnh sẵn sàng, phù hợp để tiếp tục tạo video.`
                    : 'Hiện chưa có lô tạo video rõ ràng nào có thể tiếp tục.'}
                </div>
              </div>
            </div>
            <Button
              type="link"
              className="p-0 mt-3"
              icon={<FileSearchOutlined />}
              onClick={() => onSelectTab('chapters')}
            >
              Sang chương để tiếp tục triển khai
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title="Ảnh chụp trạng thái sức khỏe tài nguyên" size="small">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nhân vật</span>
                <span className="text-gray-500">{project.stats.roles} mục</span>
              </div>
              <Progress percent={80} size="small" showInfo={false} />
              <div className="flex justify-between text-sm">
                <span>Cảnh</span>
                <span className="text-gray-500">{project.stats.scenes} mục</span>
              </div>
              <Progress percent={60} size="small" showInfo={false} />
              <div className="flex justify-between text-sm">
                <span>Đạo cụ</span>
                <span className="text-gray-500">{project.stats.props} mục</span>
              </div>
              <Progress percent={75} size="small" showInfo={false} />
            </div>
            <Button type="link" className="p-0 mt-2" onClick={() => navigate('/assets')}>
              Quản lý tài nguyên
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
