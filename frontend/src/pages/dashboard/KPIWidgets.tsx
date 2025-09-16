import React from 'react';
import KPIBox from '../../components/KPIBox';

interface KPIWidgetsProps {
  kpis: any;
}

const KPIWidgets: React.FC<KPIWidgetsProps> = ({ kpis }) => (
  <div className="kpi-widgets kpi-widgets-grid">
    <KPIBox 
      label="Bordereaux ARS Reçus" 
      value={kpis.totalBordereaux || 0} 
    />
    <KPIBox 
      label="Bulletins de Soins Traités" 
      value={kpis.bsProcessed || 0} 
    />
    <KPIBox 
      label="Dossiers en Difficulté" 
      value={kpis.bsRejected || 0} 
    />
    <KPIBox 
      label="Réclamations ARS Ouvertes" 
      value={kpis.pendingReclamations || 0} 
    />
    <KPIBox 
      label="Dépassements SLA ARS" 
      value={kpis.slaBreaches || 0} 
    />
    <KPIBox 
      label="Virements ARS en Attente" 
      value={kpis.overdueVirements || 0} 
    />
  </div>
);

export default KPIWidgets;
