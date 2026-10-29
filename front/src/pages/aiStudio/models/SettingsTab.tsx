import { useEffect, useState } from 'react'
import { Alert, Card, Form, Select, InputNumber, Button, message } from 'antd'
import { LlmService } from '../../../services/generated/services/LlmService'
import type { ModelRead, ModelSettingsRead } from '../../../services/generated'

export default function SettingsTab() {
  const [settings, setSettings] = useState<ModelSettingsRead | null>(null)
  const [models, setModels] = useState<ModelRead[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [settRes, modelsRes] = await Promise.all([
        LlmService.getModelSettingsApiV1LlmModelSettingsGet(),
        LlmService.listModelsApiV1LlmModelsGet({ page: 1, pageSize: 100 }),
      ])
      setSettings(settRes.data ?? null)
      setModels(modelsRes.data?.items ?? [])
    } catch {
      message.error('Tải thất bại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        default_text_model_id: settings.default_text_model_id,
        default_image_model_id: settings.default_image_model_id,
        default_video_model_id: settings.default_video_model_id,
        api_timeout: settings.api_timeout,
        log_level: settings.log_level,
      })
    }
  }, [settings, form])

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields()
      setSettingsSaving(true)
      await LlmService.updateModelSettingsApiV1LlmModelSettingsPut({
        requestBody: {
          default_text_model_id: values.default_text_model_id,
          default_image_model_id: values.default_image_model_id,
          default_video_model_id: values.default_video_model_id,
          api_timeout: values.api_timeout,
          log_level: values.log_level,
        },
      })
      message.success('Đã lưu cài đặt')
      void load()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSettingsSaving(false)
    }
  }

  const textModels = models.filter((m) => m.category === 'text')
  const imageModels = models.filter((m) => m.category === 'image')
  const videoModels = models.filter((m) => m.category === 'video')

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50">
      <Card title="Mô hình và tham số mặc định toàn cục" className="max-w-2xl" loading={loading}>
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={"mô hình mặc định chỉ duy nhất ở trang này, trang danh sách mô hình không còn thao tác “đặt làm mặc định”."}
        />
        <Form form={form} layout="vertical" onFinish={handleSaveSettings}>
          <Form.Item name="default_text_model_id" label="Mô hình tạo văn bản mặc định">
            <Select
              allowClear
              placeholder="Chọn mô hình"
              options={textModels.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>
          <Form.Item name="default_image_model_id" label="Mô hình tạo ảnh mặc định">
            <Select
              allowClear
              placeholder="Chọn mô hình"
              options={imageModels.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>
          <Form.Item name="default_video_model_id" label="Mô hình tạo video mặc định">
            <Select
              allowClear
              placeholder="Chọn mô hình"
              options={videoModels.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>
          <Form.Item name="api_timeout" label="thời gian chờ API(giây)">
            <InputNumber min={5} max={300} className="w-full" />
          </Form.Item>
          <Form.Item name="log_level" label="mức log">
            <Select
              options={[
                { label: 'Debug', value: 'debug' },
                { label: 'Info', value: 'info' },
                { label: 'Warn', value: 'warn' },
                { label: 'Error', value: 'error' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={settingsSaving}>
            Lưu thiết lập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
