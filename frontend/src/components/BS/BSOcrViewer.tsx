import React, { useState } from 'react';
import { Card, Button, Spin, Alert, Typography, Collapse } from 'antd';
import { EyeOutlined, RobotOutlined } from '@ant-design/icons';
import { useBSOcr } from '../../hooks/useBS';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface BSOcrViewerProps {
  bsId: number | string;
}

export const BSOcrViewer: React.FC<BSOcrViewerProps> = ({ bsId }) => {
  const [showOcr, setShowOcr] = useState(false);
  const { data: ocrData, isLoading, error, refetch } = useBSOcr(bsId);

  const handleToggleOcr = () => {
    if (!showOcr && !ocrData) {
      refetch();
    }
    setShowOcr(!showOcr);
  };

  return (
    <Card 
      title="Reconnaissance OCR" 
      style={{ marginTop: 24 }}
      extra={
        <Button 
          icon={<EyeOutlined />}
          onClick={handleToggleOcr}
          type={showOcr ? 'primary' : 'default'}
        >
          {showOcr ? 'Masquer' : 'Voir'} OCR
        </Button>
      }
    >
      {showOcr && (
        <>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin />
              <p style={{ marginTop: 8 }}>Extraction du texte en cours...</p>
            </div>
          )}
          
          {error && (
            <Alert
              type="error"
              message="Erreur OCR"
              description="Impossible d'extraire le texte du document."
              showIcon
            />
          )}
          
          {ocrData && (
            <Collapse defaultActiveKey={['1']}>
              <Panel 
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RobotOutlined />
                    <span>Texte extrait automatiquement</span>
                  </div>
                } 
                key="1"
              >
                <div style={{ 
                  backgroundColor: '#fafafa', 
                  padding: 16, 
                  borderRadius: 6,
                  maxHeight: 400,
                  overflow: 'auto'
                }}>
                  {ocrData.ocrText ? (
                    <Paragraph 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '12px',
                        lineHeight: '1.4',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {ocrData.ocrText}
                    </Paragraph>
                  ) : (
                    <Text type="secondary">
                      Aucun texte extrait ou document non disponible.
                    </Text>
                  )}
                </div>
                
                <div style={{ 
                  marginTop: 12, 
                  fontSize: '11px', 
                  color: '#999',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: 8
                }}>
                  💡 Ce texte a été extrait automatiquement par OCR. 
                  Il peut contenir des erreurs de reconnaissance.
                </div>
              </Panel>
            </Collapse>
          )}
        </>
      )}
      
      {!showOcr && (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
          Cliquez sur "Voir OCR" pour extraire le texte du document.
        </div>
      )}
    </Card>
  );
};