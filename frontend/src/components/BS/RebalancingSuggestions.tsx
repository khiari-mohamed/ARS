import React from 'react';
import { Card, Button, List, Tag, Alert, message } from 'antd';
import { SwapOutlined, UserOutlined } from '@ant-design/icons';
import { useRebalancingSuggestions, useApplyRebalancing } from '../../hooks/useBS';

interface RebalancingSuggestion {
  bsId: string;
  bsNumBs: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  reason: string;
  priority: number;
  impact: string;
}

export const RebalancingSuggestions: React.FC = () => {
  const { data: suggestions, isLoading, error } = useRebalancingSuggestions();
  const applyRebalancingMutation = useApplyRebalancing();

  const handleApplyRebalancing = async (suggestion: RebalancingSuggestion) => {
    try {
      await applyRebalancingMutation.mutateAsync({
        bsId: suggestion.bsId,
        toUserId: suggestion.to
      });
      message.success(`BS ${suggestion.bsNumBs} transféré vers ${suggestion.toName}`);
    } catch (error) {
      message.error('Erreur lors du transfert du BS');
    }
  };

  if (error) {
    return (
      <Card title="Suggestions de rééquilibrage IA">
        <Alert type="error" message="Erreur lors du chargement des suggestions" />
      </Card>
    );
  }

  return (
    <Card title="Suggestions de rééquilibrage IA" loading={isLoading}>
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
                  avatar={<SwapOutlined style={{ color: '#1890ff' }} />}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>BS:</strong> {suggestion.bsNumBs}
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
            L'IA analyse la charge de travail de chaque gestionnaire et suggère des transferts pour optimiser la répartition.
          </p>
        </div>
      )}
    </Card>
  );
};