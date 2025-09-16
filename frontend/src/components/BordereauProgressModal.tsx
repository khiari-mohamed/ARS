import React, { useState, useEffect } from 'react';
import { Modal, Progress, Card, Row, Col, Tag, Table, Button, message, Descriptions } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';

interface BordereauProgressModalProps {
  bordereauId: string;
  open: boolean;
  onClose: () => void;
}

interface BSItem {
  id: string;
  numBs: string;
  etat: string;
  nomAssure: string;
  totalPec: number;
  processedAt?: string;
}

interface ProgressData {
  total: number;
  traites: number;
  rejetes: number;
  enCours: number;
  completionRate: number;
  scanStatus: string;
}

const BordereauProgressModal: React.FC<BordereauProgressModalProps> = ({ 
  bordereauId, 
  open, 
  onClose 
}) => {
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [bsList, setBsList] = useState<BSItem[]>([]);

  useEffect(() => {
    if (!open || !bordereauId) return;
    
    const loadBordereauProgress = async () => {
      try {
        const { LocalAPI } = await import('../services/axios');
        
        // Fetch bordereau details
        const bordereauResponse = await LocalAPI.get(`/bordereaux/${bordereauId}`);
        const bordereauData = bordereauResponse.data;
        setBordereau(bordereauData);
        
        // Fetch BS list
        const bsResponse = await LocalAPI.get(`/bordereaux/${bordereauId}/bs`);
        const bsData = bsResponse.data;
        setBsList(bsData);
        
        // Calculate progress
        const total = bsData.length;
        const traites = bsData.filter((bs: BSItem) => bs.etat === 'VALIDATED').length;
        const rejetes = bsData.filter((bs: BSItem) => bs.etat === 'REJECTED').length;
        const enCours = total - traites - rejetes;
        const completionRate = total > 0 ? Math.round(((traites + rejetes) / total) * 100) : 0;
        
        let scanStatus = 'NON_SCANNE';
        if (completionRate > 0 && completionRate < 100) scanStatus = 'SCAN_EN_COURS';
        if (completionRate === 100) scanStatus = 'SCAN_FINALISE';
        
        setProgressData({ total, traites, rejetes, enCours, completionRate, scanStatus });
        
      } catch (error) {
        console.error('Error loading bordereau progress:', error);
        message.error('Erreur lors du chargement de la progression');
      } finally {
        setLoading(false);
      }
    };

    loadBordereauProgress();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadBordereauProgress, 30000);
    return () => clearInterval(interval);
  }, [bordereauId, open]);

  const getScanStatusColor = (status: string) => {
    switch (status) {
      case 'NON_SCANNE': return 'orange';
      case 'SCAN_EN_COURS': return 'blue';
      case 'SCAN_FINALISE': return 'green';
      default: return 'default';
    }
  };

  const getScanStatusText = (status: string) => {
    switch (status) {
      case 'NON_SCANNE': return 'Non scanné';
      case 'SCAN_EN_COURS': return 'Scan en cours';
      case 'SCAN_FINALISE': return 'Scan finalisé';
      default: return status;
    }
  };

  const getBSStatusColor = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'success';
      case 'REJECTED': return 'error';
      case 'IN_PROGRESS': return 'processing';
      default: return 'default';
    }
  };

  const getBSStatusText = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'Traité';
      case 'REJECTED': return 'Rejeté';
      case 'IN_PROGRESS': return 'En cours';
      default: return status;
    }
  };

  const columns = [
    {
      title: 'N° BS',
      dataIndex: 'numBs',
      key: 'numBs',
      width: 120,
    },
    {
      title: 'Assuré',
      dataIndex: 'nomAssure',
      key: 'nomAssure',
      ellipsis: true,
    },
    {
      title: 'Montant',
      dataIndex: 'totalPec',
      key: 'totalPec',
      width: 100,
      render: (amount: number) => amount ? `${amount.toFixed(3)} DT` : 'N/A',
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      width: 120,
      render: (status: string) => (
        <Tag 
          color={getBSStatusColor(status)}
          icon={
            status === 'VALIDATED' ? <CheckCircleOutlined /> :
            status === 'REJECTED' ? <CloseCircleOutlined /> :
            <SyncOutlined spin />
          }
        >
          {getBSStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Traité le',
      dataIndex: 'processedAt',
      key: 'processedAt',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('fr-FR') : '-',
    },
  ];

  return (
    <Modal
      title={`Progression - Bordereau ${bordereau?.reference || ''}`}
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          Fermer
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <SyncOutlined spin style={{ fontSize: 24 }} />
          <div style={{ marginTop: 16 }}>Chargement de la progression...</div>
        </div>
      ) : (
        <div>
          {/* Progress Overview */}
          {progressData && (
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                        Progression: {progressData.completionRate}%
                      </span>
                      <Tag color={getScanStatusColor(progressData.scanStatus)}>
                        {getScanStatusText(progressData.scanStatus)}
                      </Tag>
                    </div>
                    <Progress 
                      percent={progressData.completionRate}
                      status={progressData.completionRate === 100 ? 'success' : 'active'}
                      strokeWidth={10}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      {progressData.traites + progressData.rejetes} / {progressData.total} BS traités
                    </div>
                  </div>
                </Col>
                
                <Col span={12}>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                          {progressData.traites}
                        </div>
                        <div style={{ fontSize: 12, color: '#52c41a' }}>✅ Traités</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#fff2f0' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                          {progressData.rejetes}
                        </div>
                        <div style={{ fontSize: 12, color: '#ff4d4f' }}>❌ Rejetés</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                          {progressData.enCours}
                        </div>
                        <div style={{ fontSize: 12, color: '#1890ff' }}>⏳ En cours</div>
                      </Card>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card>
          )}
          
          {/* Bordereau Info */}
          {bordereau && (
            <Descriptions 
              title="Informations du Bordereau" 
              bordered 
              column={3}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Référence">{bordereau.reference}</Descriptions.Item>
              <Descriptions.Item label="Client">{bordereau.client?.name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Date réception">
                {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
              </Descriptions.Item>
              <Descriptions.Item label="Délai règlement">
                {bordereau.delaiReglement} jours
              </Descriptions.Item>
              <Descriptions.Item label="Assigné à">
                {bordereau.currentHandler?.fullName || 'Non assigné'}
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color="blue">{bordereau.statut}</Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
          
          {/* BS List */}
          <Card title={`Liste des BS (${bsList.length})`}>
            <Table
              dataSource={bsList}
              columns={columns}
              rowKey="id"
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} sur ${total} BS`
              }}
              size="small"
              scroll={{ y: 400 }}
            />
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default BordereauProgressModal;