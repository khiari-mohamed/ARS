import React from 'react';
import StatusBadge from '../../components/StatusBadge';

interface SLAStatusPanelProps {
  slaStatus: any[];
}

const getSlaSummary = (slaStatus: any[]) => {
  let withinDeadline = 0, atRisk = 0, breached = 0;
  slaStatus.forEach(sla => {
    if (sla.status === 'green') withinDeadline += sla.value || 1;
    else if (sla.status === 'orange') atRisk += sla.value || 1;
    else if (sla.status === 'red') breached += sla.value || 1;
  });
  return { withinDeadline, atRisk, breached };
};

const SLAStatusPanel: React.FC<SLAStatusPanelProps> = ({ slaStatus }) => {
  const summary = getSlaSummary(slaStatus);
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-2">SLA Compliance</h3>
      <div className="flex flex-col gap-2 mb-4">
        <div>🟢 Within deadline: {summary.withinDeadline}</div>
        <div>🟠 At risk: {summary.atRisk}</div>
        <div>🔴 Breached: {summary.breached}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {slaStatus.map((sla, idx) => (
            <tr key={idx}>
              <td>{sla.type}</td>
              <td><StatusBadge status={sla.status} /></td>
              <td>{sla.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SLAStatusPanel;
