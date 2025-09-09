import React, { useEffect } from 'react';
import { Form, InputNumber, Switch, Button, Card, message, Divider } from 'antd';
import { useSLAConfig, SLAConfig } from '../../hooks/useSLAConfig';

interface Props {
  clientId: string;
}

const SLAConfigForm: React.FC<Props> = ({ clientId }) => {
  const [form] = Form.useForm();
  const { config, loading, saveConfig } = useSLAConfig(clientId);

  useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config, form]);

  const onFinish = async (values: SLAConfig) => {
    const success = await saveConfig(clientId, values);
    if (success) {
      message.success('SLA configuration saved');
    } else {
      message.error('Failed to save SLA configuration');
    }
  };

  return (
    <Card title="SLA Configuration">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Divider>Thresholds</Divider>
        <Form.Item name={['thresholds', 'reglementDelay']} label="Reglement Delay (days)">
          <InputNumber min={1} max={365} />
        </Form.Item>
        <Form.Item name={['thresholds', 'reclamationDelay']} label="Reclamation Delay (days)">
          <InputNumber min={1} max={365} />
        </Form.Item>
        <Form.Item name={['thresholds', 'warningThreshold']} label="Warning Threshold (%)">
          <InputNumber min={1} max={100} />
        </Form.Item>
        <Form.Item name={['thresholds', 'criticalThreshold']} label="Critical Threshold (%)">
          <InputNumber min={1} max={100} />
        </Form.Item>

        <Divider>Alerts</Divider>
        <Form.Item name={['alerts', 'enabled']} valuePropName="checked">
          <Switch /> Enable Alerts
        </Form.Item>
        <Form.Item name={['alerts', 'emailNotifications']} valuePropName="checked">
          <Switch /> Email Notifications
        </Form.Item>
        <Form.Item name={['alerts', 'dashboardAlerts']} valuePropName="checked">
          <Switch /> Dashboard Alerts
        </Form.Item>

        <Form.Item name="active" valuePropName="checked">
          <Switch /> Active Configuration
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Save Configuration
        </Button>
      </Form>
    </Card>
  );
};

export default SLAConfigForm;