import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Alert, Progress, Modal, Upload, message } from 'antd';
import { 
  ScanOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  UploadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useBSList } from '../../hooks/useBS';

interface BordereauItem {
  id: string;
  reference: string;
  nombreBS: number;
  dateReception: string;
  statut: string;
  clientName?: string;
  scanStatus?: string;
  completionRate?: number;
}

const ScanDashboard: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [bordereauxData, setBordereauxData] = useState<BordereauItem[]>([]);
  const [manualUploadModal, setManualUploadModal] = useState(false);
  const [selectedBordereau, setSelectedBordereau] = useState<string | null>(null);
  
  const { data: bsData } = useBSList({ 
    statut: 'A_SCANNER,SCAN_EN_COURS,SCANNE',
    limit: 100 
  });
  
  // Fetch bordereaux ready for scan
  useEffect(() => {
    const fetchBordereaux = async () => {
      try {
        const { LocalAPI } = await import('../../services/axios');
        const response = await LocalAPI.get('/bordereaux/scan/ready-for-import');
        setBordereauxData(response.data);
      } catch (error) {
        console.error('Failed to fetch bordereaux:', error);
        message.error('Erreur lors du chargement des bordereaux');
        setBordereauxData([]);
      }
    };
    
    fetchBordereaux();
    const interval = setInterval(fetchBordereaux, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const bordereauxToScan = bordereauxData;

  const pendingScan = bordereauxToScan.filter(b => b.scanStatus === 'NON_SCANNE');
  const inProgress = bordereauxToScan.filter(b => b.scanStatus === 'SCAN_EN_COURS');
  const completed = bordereauxToScan.filter(b => b.scanStatus === 'SCAN_FINALISE');
  const totalBS = bordereauxToScan.reduce((sum, b) => sum + b.nombreBS, 0);
  const avgCompletion = bordereauxToScan.length > 0 
    ? bordereauxToScan.reduce((sum, b) => sum + (b.completionRate || 0), 0) / bordereauxToScan.length 
    : 0;

  const handleStartScan = async (bordereauId: string) => {
    setProcessing(true);
    try {
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.put(`/bordereaux/${bordereauId}/scan-status`, {
        scanStatus: 'SCAN_EN_COURS'
      });
      
      message.success('Scan démarré avec succès');
      // Refresh data
      const response = await LocalAPI.get('/bordereaux/scan/ready-for-import');
      setBordereauxData(response.data);
      
    } catch (error) {
      message.error('Erreur lors du démarrage du scan');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizeScan = async (bordereauId: string) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.put(`/bordereaux/${bordereauId}/scan-status`, {
        scanStatus: 'SCAN_FINALISE'
      });
      
      message.success('Scan finalisé avec succès');
      // Refresh data
      const response = await LocalAPI.get('/bordereaux/scan/ready-for-import');
      setBordereauxData(response.data);
      
    } catch (error) {
      message.error('Erreur lors de la finalisation du scan');
    }
  };

  const handleManualUpload = (bordereauId: string) => {
    setSelectedBordereau(bordereauId);
    setManualUploadModal(true);
  };

  const handleUploadComplete = async (info: any) => {
    if (info.file.status === 'done') {
      message.success('Documents uploadés avec succès');
      setManualUploadModal(false);
      setSelectedBordereau(null);
      
      // Refresh data
      try {
        const { LocalAPI } = await import('../../services/axios');
        const response = await LocalAPI.get('/bordereaux/scan/ready-for-import');
        setBordereauxData(response.data);
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    } else if (info.file.status === 'error') {
      message.error('Erreur lors de l\'upload');
    }
  };

  const handleAddMoreBS = async (bordereauId: string) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      // This would open a modal to add more BS to existing bordereau
      message.info('Fonctionnalité d\'ajout de BS en cours de développement');
    } catch (error) {
      message.error('Erreur lors de l\'ajout de BS');
    }
  };

  const handleAutoAssign = async (bordereauId: string) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.post(`/bordereaux/${bordereauId}/auto-assign`);
      
      if (response.data.success) {
        message.success(`Bordereau auto-assigné à ${response.data.assignedTo} (${response.data.method || 'AI'})`);
        
        // Refresh data to update the table
        const refreshResponse = await LocalAPI.get('/bordereaux/scan/ready-for-import');
        setBordereauxData(refreshResponse.data);
      } else {
        message.error(`Échec de l'auto-assignation: ${response.data.error || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Auto-assign failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'auto-assignation';
      message.error(`Erreur: ${errorMessage}`);
    }
  };

  const getStatusColor = (scanStatus: string) => {
    switch (scanStatus) {
      case 'NON_SCANNE': return 'orange';
      case 'SCAN_EN_COURS': return 'blue';
      case 'SCAN_FINALISE': return 'green';
      default: return 'default';
    }
  };

  const getScanStatusText = (scanStatus: string) => {
    switch (scanStatus) {
      case 'NON_SCANNE': return 'Non scanné';
      case 'SCAN_EN_COURS': return 'Scan en cours';
      case 'SCAN_FINALISE': return 'Scan finalisé';
      default: return scanStatus;
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
      title: 'Statut Scan',
      dataIndex: 'scanStatus',
      key: 'scanStatus',
      render: (scanStatus: string) => (
        <Tag color={getStatusColor(scanStatus)}>
          {getScanStatusText(scanStatus)}
        </Tag>
      ),
    },
    {
      title: 'Progression',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (rate: number) => (
        <Progress percent={rate || 0} size="small" />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BordereauItem) => (
        <Space>
          {record.scanStatus === 'NON_SCANNE' && (
            <>
              <Button 
                type="primary" 
                icon={<ScanOutlined />}
                onClick={() => handleStartScan(record.id)}
                loading={processing}
                size="small"
              >
                Démarrer Scan
              </Button>
              <Button 
                icon={<UploadOutlined />}
                onClick={() => handleManualUpload(record.id)}
                size="small"
              >
                Upload Manuel
              </Button>
            </>
          )}
          {record.scanStatus === 'SCAN_EN_COURS' && (
            <>
              <Button 
                icon={<PlusOutlined />}
                onClick={() => handleAddMoreBS(record.id)}
                size="small"
              >
                + Ajouter BS
              </Button>
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleFinalizeScan(record.id)}
                size="small"
              >
                Finaliser
              </Button>
            </>
          )}
          {record.scanStatus === 'SCAN_FINALISE' && (
            <Button 
              type="default"
              icon={<RobotOutlined />}
              onClick={() => handleAutoAssign(record.id)}
              size="small"
              loading={processing}
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
              title="Non scannés"
              value={pendingScan.length}
              prefix={<ScanOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scan en cours"
              value={inProgress.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scan finalisés"
              value={completed.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Progression moyenne"
              value={Math.round(avgCompletion)}
              suffix="%"
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
          <Card 
            title="Gestion des Bordereaux - Équipe SCAN" 
            extra={
              <Button 
                type="primary" 
                icon={<ScanOutlined />}
                onClick={() => window.location.reload()}
              >
                Actualiser
              </Button>
            }
          >
            <Table
              dataSource={bordereauxToScan}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 800 }}
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

      {/* Manual Upload Modal */}
      <Modal
        title="Upload Manuel de Documents"
        open={manualUploadModal}
        onCancel={() => {
          setManualUploadModal(false);
          setSelectedBordereau(null);
        }}
        footer={null}
        width={600}
      >
        {selectedBordereau && (
          <div>
            <Alert
              message="Upload Progressif"
              description="Vous pouvez uploader des documents en plusieurs fois pour le même bordereau. Le statut et la progression seront mis à jour automatiquement."
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Upload.Dragger
              name="documents"
              multiple
              action={`/api/bordereaux/${selectedBordereau}/add-bs`}
              onChange={handleUploadComplete}
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">
                Cliquez ou glissez les fichiers ici pour les uploader
              </p>
              <p className="ant-upload-hint">
                Formats acceptés: PDF, JPG, PNG, TIFF
              </p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScanDashboard;