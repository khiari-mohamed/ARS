// src/components/BS/BSOcrPanel.tsx
import React from 'react';
import { Card, Typography, Spin, Row, Col } from 'antd';
import { useBSOcr } from '../../hooks/useBS';

export const BSOcrPanel: React.FC<{ bsId: number; docUrl: string }> = ({ bsId, docUrl }) => {
  const { data, isLoading } = useBSOcr(bsId) as { data: { ocrText: string } | undefined, isLoading: boolean };
  return (
    <Card title="OCR & Document" size="small" style={{ marginTop: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <iframe src={docUrl} title="Document" style={{ width: '100%', height: 300, border: 'none' }} />
        </Col>
        <Col span={12}>
          {isLoading ? <Spin /> : <Typography.Paragraph>{data?.ocrText || 'Aucun résultat'}</Typography.Paragraph>}
        </Col>
      </Row>
    </Card>
  );
};