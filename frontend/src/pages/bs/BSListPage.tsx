import React, { useState } from 'react';
import { Input, Button, DatePicker, Select, Space, Badge } from 'antd';
import BSList from '../../components/BS/BSList';
import { useSlaAlerts, useNotifications } from '../../hooks/useBS';
import { NotificationCenter } from '../../components/BS/NotificationCenter';
// ADD THESE IMPORTS:
import { PrioritiesDashboard } from '../../components/BS/PrioritiesDashboard';
import { RebalancingSuggestions } from '../../components/BS/RebalancingSuggestions';

const { RangePicker } = DatePicker;

const BSListPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: undefined,
    prestataire: '',
    dateRange: [] as any[],
  });

  const { data: slaAlerts } = useSlaAlerts();
  const { data: notifications } = useNotifications();
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  React.useEffect(() => {
    // Fetch managers (GESTIONNAIRE) from backend using LocalAPI
    import('../../services/axios').then(({ LocalAPI }) => {
      LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
        .then(res => setManagers(res.data || []))
        .catch(() => setManagers([]));
    });
  }, []);

  const slaCount = (slaAlerts?.overdue?.length || 0) + (slaAlerts?.approaching?.length || 0);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Recherche BS, assuré, bénéficiaire..."
          onSearch={v => setFilters(f => ({ ...f, search: v }))}
          allowClear
        />
        <Select
          placeholder="Statut"
          style={{ width: 120 }}
          allowClear
          onChange={status => setFilters(f => ({ ...f, status }))}
          options={[
            { value: 'IN_PROGRESS', label: 'En cours' },
            { value: 'VALIDATED', label: 'Validé' },
            { value: 'REJECTED', label: 'Rejeté' },
            { value: 'CLOTURE', label: 'Clôturé' },
          ]}
        />
        <Input
          placeholder="Prestataire"
          style={{ width: 150 }}
          onChange={e => setFilters(f => ({ ...f, prestataire: e.target.value }))}
        />
        <RangePicker
          onChange={dates => setFilters(f => ({ ...f, dateRange: dates ? dates : [] }))}
        />
        <Button
          onClick={() => window.open('http://197.14.56.112:8083/api/bulletin-soin/export/excel', '_blank')}
        >
          Exporter Excel
        </Button>
        <Badge count={slaCount} offset={[10, 0]}>
          <span style={{ fontWeight: 'bold', color: slaCount ? 'red' : 'inherit' }}>
            SLA Alertes
          </span>
        </Badge>
      </Space>
      {/* AI/CDC widgets at the top */}
      <div style={{ marginBottom: 32 }}>
        <PrioritiesDashboard />
        <RebalancingSuggestions />
      </div>
      <BSList params={filters} />
      <div style={{ marginTop: 24 }}>
        <NotificationCenter notifications={notifications || []} />
      </div>
    </div>
  );
};

export default BSListPage;