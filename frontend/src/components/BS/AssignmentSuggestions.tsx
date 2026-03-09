import React from 'react';
import { Card, List, Tag, Button, Spin, Alert, Progress } from 'antd';
import {
  UserOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  StarFilled,
  InfoCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
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

  // ── Original logic functions (unchanged) ─────────────────────────────────
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

  // ── Visual-only helpers (display only, no logic) ──────────────────────────

  /** Progress bar colour based on score */
  const getScoreProgressColor = (score: number) => {
    if (score > 0.7) return '#52c41a';
    if (score > 0.5) return '#faad14';
    return '#ff7a45';
  };

  /** Rank badge colours: gold → silver → bronze → grey */
  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: '#ffd700', text: '#7c5700', border: '#f0b800' };
    if (index === 1) return { bg: '#c0c0c0', text: '#444', border: '#a8a8a8' };
    if (index === 2) return { bg: '#cd7f32', text: '#fff', border: '#b06000' };
    return { bg: '#f0f0f0', text: '#555', border: '#d9d9d9' };
  };

  /** Small contextual emoji for each reasoning line */
  const getReasoningIcon = (reason: string): string => {
    const r = reason.toLowerCase();
    if (r.includes('efficacit')) return '⚡';
    if (r.includes('charge') || r.includes('élément')) return '📋';
    if (r.includes('retard')) return '⏱️';
    if (r.includes('sla')) return '✅';
    return '•';
  };

  /** Translate confidence level to French */
  const getConfidenceLabel = (confidence: string): string => {
    switch (confidence) {
      case 'high': return 'ÉLEVÉ';
      case 'medium': return 'MOYEN';
      case 'low': return 'FAIBLE';
      default: return confidence.toUpperCase();
    }
  };

  // ── Error state (unchanged structure) ─────────────────────────────────────
  if (error) {
    return (
      <Card title="Suggestions d'assignation IA" style={{ width: '100%', maxWidth: '100%' }}>
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ color: '#6366f1', fontSize: 16 }} />
          <span style={{ fontWeight: 700 }}>Suggestions d'assignation IA</span>
          {suggestions && suggestions.length > 0 && (
            <Tag color="purple" style={{ marginLeft: 4, fontSize: 11, fontWeight: 600 }}>
              {suggestions.length} candidat{suggestions.length > 1 ? 's' : ''}
            </Tag>
          )}
        </div>
      }
      extra={isLoading && <Spin size="small" />}
      style={{ height: '400px', width: '100%', maxWidth: '100%' }}
      bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '10px 12px' }}
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
            renderItem={(suggestion: AssignmentSuggestion, index: number) => {
              const rankStyle = getRankStyle(index);
              const isTop = index === 0;
              const scorePercent = Math.round(suggestion.score * 100);

              return (
                <List.Item
                  style={{
                    padding: '10px 8px',
                    marginBottom: 6,
                    borderRadius: 8,
                    backgroundColor: isTop ? '#fffbf0' : '#fafafa',
                    border: `1px solid ${isTop ? '#ffe58f' : '#f0f0f0'}`,
                    alignItems: 'flex-start',
                    display: 'flex',
                    gap: 0,
                  }}
                >
                  {/* ── Rank badge ─────────────────────────────────────── */}
                  <div
                    style={{
                      minWidth: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: rankStyle.bg,
                      border: `2px solid ${rankStyle.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: rankStyle.text,
                      marginRight: 10,
                      marginTop: 2,
                      flexShrink: 0,
                      boxShadow: isTop ? '0 2px 6px rgba(255,215,0,0.4)' : 'none',
                    }}
                  >
                    #{index + 1}
                  </div>

                  {/* ── Main content ──────────────────────────────────── */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Header: name + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        {suggestion.assignee}
                      </span>
                      <Tag
                        color={getConfidenceColor(suggestion.confidence)}
                        style={{ fontSize: 10, padding: '1px 6px', fontWeight: 700, margin: 0, lineHeight: '16px' }}
                      >
                        {getConfidenceLabel(suggestion.confidence)}
                      </Tag>
                      {isTop && (
                        <Tag
                          color="gold"
                          style={{ fontSize: 10, padding: '1px 6px', margin: 0, fontWeight: 700, lineHeight: '16px' }}
                        >
                          <StarFilled style={{ fontSize: 9, marginRight: 2 }} />
                          RECOMMANDÉ
                        </Tag>
                      )}
                      {/* Keep original score icon in a subtle way */}
                      <span style={{ marginLeft: 'auto', fontSize: 14 }}>
                        {getScoreIcon(suggestion.score)}
                      </span>
                    </div>

                    {/* Score progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap', width: 42, flexShrink: 0 }}>
                        Score :
                      </span>
                      <Progress
                        percent={scorePercent}
                        size="small"
                        strokeColor={getScoreProgressColor(suggestion.score)}
                        style={{ flex: 1, margin: 0 }}
                        format={() => (
                          <span style={{ fontSize: 10, fontWeight: 700, color: getScoreProgressColor(suggestion.score) }}>
                            {suggestion.score.toFixed(2)}
                          </span>
                        )}
                      />
                    </div>

                    {/* Reasoning items */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 3, letterSpacing: '0.02em' }}>
                        Raisons de la recommandation :
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                        {suggestion.reasoning.slice(0, 4).map((reason, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 4,
                              padding: '3px 6px',
                              borderRadius: 4,
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              fontSize: 10,
                              lineHeight: '1.4',
                              color: '#374151',
                            }}
                          >
                            <span style={{ flexShrink: 0, fontSize: 11 }}>{getReasoningIcon(reason)}</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Assign button (when showActions) ─────────────── */}
                  {showActions && onSelectAssignee && (
                    <Button
                      type={isTop ? 'primary' : 'default'}
                      size="small"
                      onClick={() => onSelectAssignee(suggestion.assignee)}
                      style={{ marginLeft: 8, flexShrink: 0, marginTop: 2, fontSize: 11 }}
                    >
                      Assigner
                    </Button>
                  )}
                </List.Item>
              );
            }}
          />

          {/* ── "How it works" info bar ──────────────────────────────── */}
          {suggestions && suggestions.length > 0 && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}
            >
              <InfoCircleOutlined style={{ color: '#0284c7', marginTop: 1, flexShrink: 0, fontSize: 13 }} />
              <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                <strong style={{ color: '#0369a1' }}>💡 Comment ça marche :</strong>
                <span style={{ color: '#374151', marginLeft: 4 }}>
                  L'IA analyse la charge de travail, performances historiques et SLA pour classer les gestionnaires du plus au moins disponible.
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
