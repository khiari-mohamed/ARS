import React from 'react';
import type { BordereauSLAIndicators as BordereauSLAIndicatorsType } from '../types/sla';
import { SLA_INDICATOR_LABELS, SLA_INDICATOR_ORDER } from '../types/sla';
import { getColorForIndicator, getIndicatorLabel, formatIndicatorDays } from '../utils/slaColor';

interface BordereauSLAIndicatorsProps {
  sla: BordereauSLAIndicatorsType;
  /** 'compact' = single-line badges for tables; 'detailed' = cards for a detail page */
  variant?: 'compact' | 'detailed';
}

/**
 * Renders the four company-mandated SLA indicators for a single bordereau:
 *   SLA de scan / SLA de traitement / SLA de règlement BO / SLA de règlement Finance
 * Replaces the previous single "SLA" badge that only ever showed règlement BO.
 */
const BordereauSLAIndicators: React.FC<BordereauSLAIndicatorsProps> = ({ sla, variant = 'compact' }) => {
  const items = SLA_INDICATOR_ORDER.map((key) => ({
    key,
    label: SLA_INDICATOR_LABELS[key],
    indicator: sla[key],
  }));

  if (variant === 'compact') {
    return (
      <div className="bordereau-sla-indicators bordereau-sla-indicators--compact" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(({ key, label, indicator }) => {
          const color = getColorForIndicator(indicator);
          const days = formatIndicatorDays(indicator);
          return (
            <span
              key={key}
              title={`${label}: ${getIndicatorLabel(indicator)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 12,
                border: `1px solid ${color}`,
                color,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}: {days}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bordereau-sla-indicators bordereau-sla-indicators--detailed" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {items.map(({ key, label, indicator }) => {
        const color = getColorForIndicator(indicator);
        const applicable = indicator?.applicable;
        return (
          <div
            key={key}
            style={{
              border: `1px solid ${color}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>
              {applicable ? formatIndicatorDays(indicator) : 'N/A'}
            </div>
            <div style={{ fontSize: 12, color }}>{getIndicatorLabel(indicator)}</div>
            {applicable && indicator?.daysRemaining !== null && indicator?.daysRemaining !== undefined && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                {indicator.daysRemaining >= 0
                  ? `${indicator.daysRemaining} j restants`
                  : `${Math.abs(indicator.daysRemaining)} j de dépassement`}
                {indicator.frozen ? ' (figé)' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BordereauSLAIndicators;