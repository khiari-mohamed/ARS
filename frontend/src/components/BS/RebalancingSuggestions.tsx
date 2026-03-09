import React, { useState } from 'react';
import { Card, Button, List, Tag, Alert, message, Modal, Spin } from 'antd';
import {
  SwapOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  FileOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
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

  // ── Original logic (unchanged) ────────────────────────────────────────────
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

  // ── Visual-only helpers (display only, no logic) ──────────────────────────

  /** Priority label (same mapping as original) */
  const getPriorityLabel = (priority: number): string => {
    if (priority === 1) return 'URGENT';
    if (priority === 2) return 'IMPORTANT';
    return 'NORMAL';
  };

  /** Priority badge colour (same mapping as original) */
  const getPriorityColor = (priority: number): string => {
    if (priority === 1) return 'red';
    if (priority === 2) return 'orange';
    return 'blue';
  };

  /** Impact background accent */
  const getImpactStyle = (impact: string): React.CSSProperties => {
    const i = impact.toLowerCase();
    if (i.includes('élevé') || i.includes('eleve') || i.includes('high'))
      return { color: '#c0392b', backgroundColor: '#fff5f5', border: '1px solid #fca5a5' };
    if (i.includes('moyen') || i.includes('medium'))
      return { color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fcd34d' };
    return { color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #93c5fd' };
  };

  // ── Error state (unchanged structure) ─────────────────────────────────────
  if (error) {
    return (
      <Card title="Suggestions de rééquilibrage IA" style={{ width: '100%', maxWidth: '100%' }}>
        <Alert type="error" message="Erreur lors du chargement des suggestions" />
      </Card>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
            <span style={{ fontWeight: 700 }}>Suggestions de rééquilibrage IA</span>
            {suggestions && suggestions.length > 0 && (
              <Tag color="orange" style={{ marginLeft: 4, fontSize: 11, fontWeight: 600 }}>
                {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
              </Tag>
            )}
          </div>
        }
        loading={isLoading}
        style={{ width: '100%', maxWidth: '100%' }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* ── Empty state ──────────────────────────────────────────────── */}
        {suggestions && suggestions.length === 0 && (
          <Alert
            type="info"
            message="Aucune suggestion pour le moment"
            description="La charge de travail est actuellement équilibrée entre les gestionnaires."
          />
        )}

        {/* ── Suggestion list ───────────────────────────────────────────── */}
        {suggestions && suggestions.length > 0 && (
          <>
            {/* Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <WarningOutlined style={{ color: '#d97706', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 2 }}>
                  {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} de rééquilibrage
                </div>
                <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.4 }}>
                  L'IA a détecté des déséquilibres dans la répartition des charges de travail.
                </div>
              </div>
            </div>

            <List
              dataSource={suggestions}
              renderItem={(suggestion: RebalancingSuggestion) => (
                <List.Item
                  style={{
                    padding: '10px 8px',
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: '#fafafa',
                    border: '1px solid #e5e7eb',
                    alignItems: 'flex-start',
                    display: 'flex',
                    gap: 0,
                  }}
                  actions={[
                    <Button
                      key="apply"
                      type="primary"
                      size="small"
                      icon={<SwapOutlined />}
                      loading={applyRebalancingMutation.isPending}
                      onClick={() => handleApplyRebalancing(suggestion)}
                      style={{ fontSize: 11 }}
                    >
                      Appliquer
                    </Button>
                  ]}
                >
                  {/* Swap icon accent */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#fff7ed',
                      border: '2px solid #fdba74',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    <SwapOutlined style={{ color: '#ea580c', fontSize: 14 }} />
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* FROM → TO transfer line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <Tag
                        color="red"
                        icon={<UserOutlined />}
                        style={{ fontSize: 12, padding: '2px 8px', fontWeight: 700, margin: 0 }}
                      >
                        {suggestion.fromName}
                      </Tag>
                      <ArrowRightOutlined style={{ color: '#9ca3af', fontSize: 13, flexShrink: 0 }} />
                      <Tag
                        color="green"
                        icon={<UserOutlined />}
                        style={{ fontSize: 12, padding: '2px 8px', fontWeight: 700, margin: 0 }}
                      >
                        {suggestion.toName}
                      </Tag>
                    </div>

                    {/* Badges row: doc count + priority + impact */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {/* Document count */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #93c5fd',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#1d4ed8',
                        }}
                      >
                        <FileOutlined style={{ fontSize: 11 }} />
                        {suggestion.documentCount} documents
                      </div>

                      {/* Priority */}
                      <Tag
                        color={getPriorityColor(suggestion.priority)}
                        icon={suggestion.priority === 1 ? <ThunderboltOutlined /> : undefined}
                        style={{ fontSize: 11, padding: '2px 8px', fontWeight: 700, margin: 0 }}
                      >
                        {getPriorityLabel(suggestion.priority)}
                      </Tag>

                      {/* Impact */}
                      <div
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          ...getImpactStyle(suggestion.impact),
                        }}
                      >
                        Impact : {suggestion.impact}
                      </div>
                    </div>

                    {/* Reason text */}
                    <div
                      style={{
                        fontSize: 11,
                        color: '#4b5563',
                        lineHeight: 1.5,
                        padding: '5px 8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                      }}
                    >
                      {suggestion.reason}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}

        {/* ── "How it works" info bar ───────────────────────────────────── */}
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
                L'IA analyse la charge de travail de chaque gestionnaire et suggère des transferts BULK pour optimiser la répartition.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Result Modal (unchanged structure) ───────────────────────────── */}
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
