import React, { useEffect, useState } from 'react';
import { fetchVirements } from '../../api/financeService';
import { Virement } from '../../types/finance';

const FinanceDashboard: React.FC = () => {
  const [pending, setPending] = useState(0);
  const [confirmed, setConfirmed] = useState(0);

  useEffect(() => {
    fetchVirements({}).then((data) => {
      setPending(data.filter((v) => v.status === 'pending').length);
      setConfirmed(data.filter((v) => v.status === 'confirmed').length);
    });
  }, []);

  return (
    <div className="finance-dashboard">
      <div className="dashboard-widget">
        <h3>Virements en attente</h3>
        <span className="pending-count">{pending}</span>
      </div>
      <div className="dashboard-widget">
        <h3>Virements confirmés</h3>
        <span className="confirmed-count">{confirmed}</span>
      </div>
    </div>
  );
};

export default FinanceDashboard;