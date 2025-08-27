import React, { useState } from 'react';
import { Input, Button, DatePicker, Select, Space, Badge, Row, Col } from 'antd';
import BSList from '../../components/BS/BSList';
import { useSlaAlerts, useNotifications } from '../../hooks/useBS';
import { NotificationCenter } from '../../components/BS/NotificationCenter';
import { PrioritiesDashboard } from '../../components/BS/PrioritiesDashboard';
import { RebalancingSuggestions } from '../../components/BS/RebalancingSuggestions';

const { RangePicker } = DatePicker;

const BSListPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    etat: undefined,
    prestataire: '',
    dateRange: null as [any, any] | null,
    page: 1,
    limit: 20
  });

  const { data: slaAlerts } = useSlaAlerts();
  const { data: notifications } = useNotifications();
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  React.useEffect(() => {
    // Fetch gestionnaires from BS module
    import('../../services/axios').then(({ LocalAPI }) => {
      LocalAPI.get('/bulletin-soin/gestionnaires')
        .then(res => setManagers(res.data || []))
        .catch(() => setManagers([]));
    });
  }, []);

  const slaCount = (slaAlerts?.overdue?.length || 0) + (slaAlerts?.approaching?.length || 0);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Filters Section */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Recherche BS, assuré, bénéficiaire..."
          value={filters.search}
          onSearch={v => handleFiltersChange({ search: v })}
          onChange={e => e.target.value === '' && handleFiltersChange({ search: '' })}
          allowClear
          style={{ width: 250 }}
        />
        <Select
          placeholder="Statut"
          style={{ width: 150 }}
          allowClear
          value={filters.etat}
          onChange={etat => handleFiltersChange({ etat })}
          options={[
            { value: 'IN_PROGRESS', label: 'En cours' },
            { value: 'EN_COURS', label: 'En cours' },
            { value: 'VALIDATED', label: 'Validé' },
            { value: 'REJECTED', label: 'Rejeté' },
            { value: 'CLOTURE', label: 'Clôturé' },
          ]}
        />
        <Input
          placeholder="Prestataire"
          style={{ width: 150 }}
          value={filters.prestataire}
          onChange={e => handleFiltersChange({ prestataire: e.target.value })}
        />
        <RangePicker
          value={filters.dateRange}
          onChange={dates => handleFiltersChange({ dateRange: dates })}
        />
        <Button
          type="primary"
          onClick={() => {
            const link = document.createElement('a');
            link.href = 'http://localhost:5000/api/bulletin-soin/export/excel';
            link.download = `BS_Export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          Exporter Excel
        </Button>
        <Badge count={slaCount} offset={[10, 0]}>
          <span style={{ fontWeight: 'bold', color: slaCount ? 'red' : 'inherit' }}>
            SLA Alertes
          </span>
        </Badge>
      </Space>

      {/* AI/Analytics Widgets */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <PrioritiesDashboard />
        </Col>
        <Col span={12}>
          <RebalancingSuggestions />
        </Col>
      </Row>

      {/* BS List Table */}
      <BSList params={filters} onParamsChange={setFilters} />

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <NotificationCenter notifications={notifications} />
        </div>
      )}
    </div>
  );
};

export default BSListPage;