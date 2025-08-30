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



  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      handleFiltersChange({ 
        dateStart: dates[0].format('YYYY-MM-DD'),
        dateEnd: dates[1].format('YYYY-MM-DD')
      });
    } else {
      handleFiltersChange({ dateStart: undefined, dateEnd: undefined });
    }
  };

  return (
    <div style={{ padding: '12px 8px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Filters Section */}
      <Space style={{ marginBottom: 16 }} wrap size="small">
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
          allowClear
        />
        <RangePicker
          value={filters.dateRange}
          onChange={dates => {
            setFilters(prev => ({ ...prev, dateRange: dates }));
            handleDateRangeChange(dates);
          }}
          format="DD/MM/YYYY"
          placeholder={['Date début', 'Date fin']}
        />
        <Button
          type="primary"
          onClick={() => {
            const link = document.createElement('a');
            link.href = 'http://localhost:5000/api/bulletin-soin/export/excel';
            link.download = `BS_Export_${new Date().toISOString().split('T')[0]}.xls`;
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
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12} style={{ marginBottom: '8px' }}>
          <PrioritiesDashboard />
        </Col>
        <Col xs={24} lg={12} style={{ marginBottom: '8px' }}>
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