import React from 'react';
import KPIBox from '../../components/KPIBox';

interface KPIWidgetsProps {
  kpis: any;
}

const KPIWidgets: React.FC<KPIWidgetsProps> = ({ kpis }) => (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <KPIBox label="Bordereaux reçus" value={kpis.totalBordereaux} color="primary" />
    <KPIBox label="BS traités" value={kpis.bsProcessed} color="success" />
    <KPIBox label="BS rejetés" value={kpis.bsRejected} color="error" />
    <KPIBox label="Réclamations ouvertes" value={kpis.pendingReclamations} color="warning" />
    <KPIBox label="SLA Breaches" value={kpis.slaBreaches} color="error" />
    <KPIBox label="Virements en cours" value={kpis.overdueVirements} color="info" />
  </div>
);

export default KPIWidgets;
