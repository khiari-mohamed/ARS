import React from 'react';
import StatusBadge from '../../components/StatusBadge';
import BordereauSLAIndicators from '../../components/BordereauSLAIndicators';
import type { BordereauSLAIndicators as BordereauSLAIndicatorsType } from '../../types/sla';

interface LegacySLAEntry {
  type: string;
  status: 'green' | 'orange' | 'red';
  value: number;
}

interface SLAStatusPanelProps {
  slaStatus?: LegacySLAEntry[];
  bordereauSla?: BordereauSLAIndicatorsType;
  bordereauReference?: string;
}

const getSlaSummary = (slaStatus: LegacySLAEntry[]) => {
  let withinDeadline = 0, atRisk = 0, breached = 0;
  slaStatus.forEach((sla) => {
    if (sla.status === 'green') withinDeadline += sla.value || 1;
    else if (sla.status === 'orange') atRisk += sla.value || 1;
    else if (sla.status === 'red') breached += sla.value || 1;
  });
  return { withinDeadline, atRisk, breached };
};

const SLAStatusPanel: React.FC<SLAStatusPanelProps> = ({ slaStatus, bordereauSla, bordereauReference }) => {
  // New mode: a specific bordereau's four company SLA indicators.
  if (bordereauSla) {
    return (
      <div className="sla-panel-container">
        <h3 className="sla-panel-title">
          Conformité SLA{bordereauReference ? ` — ${bordereauReference}` : ''}
        </h3>
        <BordereauSLAIndicators sla={bordereauSla} variant="detailed" />
      </div>
    );
  }

  // Legacy mode: aggregate summary table (unchanged behaviour).
  const summary = getSlaSummary(slaStatus || []);
  return (
    <div className="sla-panel-container">
      <h3 className="sla-panel-title">Conformité SLA</h3>
      <div className="sla-panel-summary">
        <div>🟢 Dans le délai : {summary.withinDeadline}</div>
        <div>🟠 À risque : {summary.atRisk}</div>
        <div>🔴 Non conforme : {summary.breached}</div>
      </div>
      <div className="sla-panel-table-wrapper">
        <table className="sla-panel-table">
          <thead>
            <tr>
              <th className="sla-panel-th">Type</th>
              <th className="sla-panel-th">Statut</th>
              <th className="sla-panel-th">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {(slaStatus || []).map((sla, idx) => (
              <tr key={idx}>
                <td>{sla.type}</td>
                <td><StatusBadge status={sla.status} /></td>
                <td>{sla.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SLAStatusPanel;