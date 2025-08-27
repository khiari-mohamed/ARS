import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Alert, Progress } from 'antd';
import { 
  ScanOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useBSList } from '../../hooks/useBS';

interface BordereauItem {
  id: string;
  reference: string;
  nombreBS: number;
  dateReception: string;
  statut: string;
  clientName?: string;
}

const ScanDashboard: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const { data: bsData } = useBSList({ 
    statut: 'A_SCANNER,SCAN_EN_COURS,SCANNE',
    limit: 100 
  });
  
  // Mock bordereau data - in real app, fetch from bordereaux endpoint
  const bordereauxToScan: BordereauItem[] = [
    {
      id: '1',
      reference: 'REF-BS-2024-001',
      nombreBS: 15,
      dateReception: new Date().toISOString(),
      statut: 'A_SCANNER',
      clientName: 'Client A'
    },
    {
      id: '2', 
      reference: 'REF-BS-2024-002',
      nombreBS: 8,
      dateReception: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      statut: 'SCAN_EN_COURS',
      clientName: 'Client B'
    }
  ];

  const pendingScan = bordereauxToScan.filter(b => b.statut === 'A_SCANNER');
  const inProgress = bordereauxToScan.filter(b => b.statut === 'SCAN_EN_COURS');
  const completed = bordereauxToScan.filter(b => b.statut === 'SCANNE');
  const totalBS = bordereauxToScan.reduce((sum, b) => sum + b.nombreBS, 0);

  const handleStartScan = async (bordereauId: string) => {
    setProcessing(true);
    try {
      // Update status to SCAN_EN_COURS
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.patch(`/bordereaux/${bordereauId}`, {
        statut: 'SCAN_EN_COURS',
        dateDebutScan: new Date()
      });
      
      // Simulate OCR processing
      setTimeout(async () => {
        await LocalAPI.patch(`/bordereaux/${bordereauId}`, {
          statut: 'SCANNE',
          dateFinScan: new Date()
        });
        setProcessing(false);
      }, 3000);
      
    } catch (error) {
      setProcessing(false);
    }
  };

  const handleAutoAssign = async (bordereauId: string) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.post(`/bordereaux/${bordereauId}/auto-assign`);
    } catch (error) {
      console.error('Auto-assign failed:', error);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'A_SCANNER': return 'orange';
      case 'SCAN_EN_COURS': return 'blue';
      case 'SCANNE': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Nombre BS',
      dataIndex: 'nombreBS',
      key: 'nombreBS',
      render: (count: number) => (
        <Tag color="blue">{count} BS</Tag>
      ),
    },
    {
      title: 'Date réception',
      dataIndex: 'dateReception',
      key: 'dateReception',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut: string) => (
        <Tag color={getStatusColor(statut)}>
          {statut.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BordereauItem) => (
        <Space>
          {record.statut === 'A_SCANNER' && (
            <Button 
              type="primary" 
              icon={<ScanOutlined />}
              onClick={() => handleStartScan(record.id)}
              loading={processing}
            >
              Scanner
            </Button>
          )}
          {record.statut === 'SCAN_EN_COURS' && (
            <Tag color="blue">En cours...</Tag>
          )}
          {record.statut === 'SCANNE' && (
            <Button 
              type="default"
              icon={<RobotOutlined />}
              onClick={() => handleAutoAssign(record.id)}
            >
              Auto-assigner
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>Équipe SCAN - Numérisation BS</h1>
      
      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="À scanner"
              value={pendingScan.length}
              prefix={<ScanOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={inProgress.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scannés"
              value={completed.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total BS"
              value={totalBS}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {pendingScan.length > 5 && (
        <Alert
          type="warning"
          message="Charge de travail élevée"
          description={`${pendingScan.length} bordereaux en attente de scan. Considérer l'alerte au Super Admin.`}
          style={{ marginBottom: 24 }}
          showIcon
          action={
            <Button size="small" type="link">
              Alerter Super Admin
            </Button>
          }
        />
      )}

      <Row gutter={16}>
        <Col span={16}>
          <Card title="File d'attente de numérisation">
            <Table
              dataSource={bordereauxToScan}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="Processus de numérisation">
            <div style={{ marginBottom: 16 }}>
              <h4>Étapes automatisées:</h4>
              <ol style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <li>Scan + OCR des documents</li>
                <li>Indexation automatique</li>
                <li>Extraction des métadonnées</li>
                <li>Validation qualité</li>
                <li>Statut "Scanné"</li>
                <li>Auto-assignation au Chef</li>
              </ol>
            </div>
            
            <Alert
              type="info"
              message="Intégration PaperStream"
              description="Le système surveille automatiquement le dossier réseau pour détecter les nouveaux documents."
              showIcon
            />
          </Card>
          
          <Card title="Performance du jour" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Progression</span>
                <span>{completed.length}/{bordereauxToScan.length}</span>
              </div>
              <Progress 
                percent={bordereauxToScan.length > 0 ? (completed.length / bordereauxToScan.length) * 100 : 0}
                status="active"
              />
            </div>
            
            <Statistic
              title="BS traités"
              value={completed.reduce((sum, b) => sum + b.nombreBS, 0)}
              suffix={`/ ${totalBS}`}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ScanDashboard;