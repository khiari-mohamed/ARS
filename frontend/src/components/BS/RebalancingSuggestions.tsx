import React, { useState } from 'react';
import { Card, Button, List, Tag, Alert, message, Modal, Spin } from 'antd';
import { SwapOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useRebalancingSuggestions, useApplyRebalancing } from '../../hooks/useBS';

interface RebalancingSuggestion {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  reason: string;
  priority: number;
  impact: string;
  documentCount: number;
  documentIds: string[];
}

export const RebalancingSuggestions: React.FC = () => {
  const { data: suggestions, isLoading, error, refetch } = useRebalancingSuggestions();
  const applyRebalancingMutation = useApplyRebalancing();
  const [showResultModal, setShowResultModal] = useState(false);
  const [rebalancingResult, setRebalancingResult] = useState<any>(null);

  const handleApplyRebalancing = async (suggestion: RebalancingSuggestion) => {
    try {
      const result = await applyRebalancingMutation.mutateAsync({
        suggestion: suggestion,
        toUserId: suggestion.to
      });
      
      setRebalancingResult(result);
      setShowResultModal(true);
      
      // Refetch suggestions after successful rebalancing
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      message.error('Erreur lors du rééquilibrage');
    }
  };

  if (error) {
    return (
      <Card title="Suggestions de rééquilibrage IA" style={{ width: '100%', maxWidth: '100%' }}>
        <Alert type="error" message="Erreur lors du chargement des suggestions" />
      </Card>
    );
  }

  return (
    <>
      <Card title="Suggestions de rééquilibrage IA" loading={isLoading} style={{ width: '100%', maxWidth: '100%' }}>
        {suggestions && suggestions.length === 0 && (
          <Alert 
            type="info" 
            message="Aucune suggestion pour le moment" 
            description="La charge de travail est actuellement équilibrée entre les gestionnaires."
          />
        )}
        
        {suggestions && suggestions.length > 0 && (
          <>
            <Alert 
              type="warning" 
              message={`${suggestions.length} suggestion(s) de rééquilibrage`}
              description="L'IA a détecté des déséquilibres dans la répartition des charges de travail."
              style={{ marginBottom: 16 }}
            />
            
            <List
              dataSource={suggestions}
              renderItem={(suggestion: RebalancingSuggestion) => (
                <List.Item
                  actions={[
                    <Button 
                      key="apply"
                      type="primary" 
                      size="small"
                      icon={<SwapOutlined />}
                      loading={applyRebalancingMutation.isPending}
                      onClick={() => handleApplyRebalancing(suggestion)}
                    >
                      Appliquer
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<SwapOutlined style={{ color: '#1890ff', fontSize: '24px' }} />}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Tag color="red" icon={<UserOutlined />}>
                          {suggestion.fromName}
                        </Tag>
                        <SwapOutlined style={{ color: '#999' }} />
                        <Tag color="green" icon={<UserOutlined />}>
                          {suggestion.toName}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Tag 
                            color="blue"
                            style={{ fontSize: '14px', padding: '4px 12px', fontWeight: 'bold' }}
                          >
                            📦 {suggestion.documentCount} documents
                          </Tag>
                          <Tag 
                            color={suggestion.priority === 1 ? 'red' : suggestion.priority === 2 ? 'orange' : 'blue'}
                            style={{ fontSize: '10px' }}
                          >
                            {suggestion.priority === 1 ? 'URGENT' : suggestion.priority === 2 ? 'IMPORTANT' : 'NORMAL'}
                          </Tag>
                          <Tag color="purple" style={{ fontSize: '10px' }}>
                            Impact: {suggestion.impact}
                          </Tag>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                          {suggestion.reason}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
        
        {suggestions && suggestions.length > 0 && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: 6,
            fontSize: '12px'
          }}>
            <strong>💡 Comment ça marche:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              L'IA analyse la charge de travail de chaque gestionnaire et suggère des transferts BULK pour optimiser la répartition.
            </p>
          </div>
        )}
      </Card>

      {/* Result Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
            <span>Rééquilibrage Réussi</span>
          </div>
        }
        open={showResultModal}
        onOk={() => setShowResultModal(false)}
        onCancel={() => setShowResultModal(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setShowResultModal(false)}>
            OK
          </Button>
        ]}
      >
        {rebalancingResult && (
          <div style={{ padding: '16px 0' }}>
            <Alert
              type="success"
              message="Transfert Effectué"
              description={
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: '14px', marginBottom: 12 }}>
                    <strong>{rebalancingResult.message}</strong>
                  </p>
                  {rebalancingResult.details && (
                    <div style={{ 
                      background: '#f6ffed', 
                      padding: 12, 
                      borderRadius: 6,
                      border: '1px solid #b7eb8f'
                    }}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>📊 Détails du transfert:</strong>
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                        <div>✅ <strong>{rebalancingResult.details.documentsTransferred}</strong> documents transférés</div>
                        <div>👤 De: <strong>{rebalancingResult.details.from}</strong></div>
                        <div>👤 Vers: <strong>{rebalancingResult.details.to}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        )}
      </Modal>
    </>
  );
};