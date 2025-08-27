import React from 'react';
import { Card, List, Tag, Button, Spin, Alert } from 'antd';
import { UserOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAssignmentSuggestions } from '../../hooks/useBS';

interface AssignmentSuggestion {
  assignee: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  reasoning: string[];
}

interface AssignmentSuggestionsProps {
  onSelectAssignee?: (assigneeId: string) => void;
  showActions?: boolean;
}

export const AssignmentSuggestions: React.FC<AssignmentSuggestionsProps> = ({
  onSelectAssignee,
  showActions = true
}) => {
  const { data: suggestions, isLoading, error } = useAssignmentSuggestions() as {
    data: AssignmentSuggestion[] | undefined;
    isLoading: boolean;
    error: any;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'green';
      case 'medium': return 'orange';
      case 'low': return 'red';
      default: return 'default';
    }
  };

  const getScoreIcon = (score: number) => {
    if (score > 0.8) return <TrophyOutlined style={{ color: '#52c41a' }} />;
    if (score > 0.6) return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    return <UserOutlined style={{ color: '#ff4d4f' }} />;
  };

  if (error) {
    return (
      <Card title="Suggestions d'assignation IA">
        <Alert
          type="warning"
          message="Suggestions IA temporairement indisponibles"
          description="Le système d'IA est en cours d'initialisation. Veuillez réessayer dans quelques instants."
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title="Suggestions d'assignation IA" 
      extra={isLoading && <Spin size="small" />}
      style={{ height: '400px' }}
      bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '12px' }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
          <p style={{ marginTop: 8 }}>Analyse des performances...</p>
        </div>
      ) : (
        <>
          <List
            dataSource={suggestions || []}
            locale={{ emptyText: 'Aucune suggestion disponible.' }}
            renderItem={(suggestion: AssignmentSuggestion, index: number) => (
              <List.Item style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <List.Item.Meta
                  avatar={getScoreIcon(suggestion.score)}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{suggestion.assignee}</span>
                      <Tag color={getConfidenceColor(suggestion.confidence)} style={{ fontSize: '10px', padding: '0 4px' }}>
                        {suggestion.confidence.toUpperCase()}
                      </Tag>
                      <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>
                        Score: {suggestion.score.toFixed(2)}
                      </Tag>
                      {index === 0 && (
                        <Tag color="gold" style={{ fontSize: '10px', padding: '0 4px' }}>
                          <TrophyOutlined /> RECOMMANDÉ
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 4, fontSize: '10px' }}>
                        <strong>Raisons de la recommandation:</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 12, fontSize: '10px', lineHeight: '1.3' }}>
                        {suggestion.reasoning.slice(0, 4).map((reason, idx) => (
                          <li key={idx} style={{ marginBottom: 2 }}>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
          
          {suggestions && suggestions.length > 0 && (
            <div style={{ 
              marginTop: 8,
              padding: 8, 
              backgroundColor: '#f6ffed', 
              border: '1px solid #b7eb8f',
              borderRadius: 4,
              fontSize: '10px'
            }}>
              <strong>💡 Comment ça marche:</strong>
              <p style={{ margin: '2px 0 0 0', lineHeight: '1.3' }}>
                L'IA analyse la charge de travail, performances historiques et SLA.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};