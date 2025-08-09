import React from 'react';
import KPIBox from '../../components/KPIBox';

interface KPIWidgetsProps {
  kpis: any;
}

const KPIWidgets: React.FC<KPIWidgetsProps> = ({ kpis }) => (
  <div className="kpi-widgets kpi-widgets-grid">
    <KPIBox label="Bordereaux reçus" value={kpis.totalBordereaux} />
    <KPIBox label="BS traités" value={kpis.bsProcessed} />
    <KPIBox label="BS rejetés" value={kpis.bsRejected} />
    <KPIBox label="Réclamations ouvertes" value={kpis.pendingReclamations} />
    <KPIBox label="SLA Breaches" value={kpis.slaBreaches} />
    <KPIBox label="Virements en cours" value={kpis.overdueVirements} />
  </div>
);

export default KPIWidgets;
