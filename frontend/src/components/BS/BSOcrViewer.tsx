import React from 'react';
import { useBSOcr } from '../../hooks/useBS';
import { Card, Typography, Spin } from 'antd';

interface BSOcrData {
  ocrText: string;
}

export const BSOcrViewer: React.FC<{ bsId: number }> = ({ bsId }) => {
  const { data, isLoading } = useBSOcr(bsId) as { data: BSOcrData | undefined, isLoading: boolean };

  return (
    <Card title="Résultat OCR" size="small" style={{ marginTop: 16 }}>
      {isLoading ? <Spin /> : <Typography.Paragraph>{data?.ocrText || 'Aucun résultat'}</Typography.Paragraph>}
    </Card>
  );
};

export default BSOcrViewer;