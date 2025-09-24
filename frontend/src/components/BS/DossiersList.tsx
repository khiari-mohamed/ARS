import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Checkbox, 
  Button, 
  Space, 
  Select, 
  Tag, 
  Tooltip, 
  message,
  Modal,
  Typography,
  Collapse,
  Badge
} from 'antd';
import { 
  EyeOutlined, 
  UserOutlined, 
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';
import { LocalAPI } from '../../services/axios';

const { Panel } = Collapse;
const { Text } = Typography;

interface BS {
  id: string;
  numBs: string;
  nomAssure: string;
  nomBeneficiaire: string;
  etat: string;
  totalPec: number;
  dateCreation: string;
}

interface Dossier {
  id: string;
  reference: string;
  client: {
    name: string;
  };
  statut: string;
  dateReception: string;
  nombreBS: number;
  bulletinSoins: BS[];
  assignedToUserId?: string;
}

interface DossiersListProps {
  params: any;
  onParamsChange?: (params: any) => void;
}

const DossiersList: React.FC<DossiersListProps> = ({ params, onParamsChange }) => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDossiers, setSelectedDossiers] = useState<string[]>([]);
  const [selectedBS, setSelectedBS] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [gestionnaires, setGestionnaires] = useState<{id: string; fullName: string}[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    loadDossiers();
    loadGestionnaires();
  }, [params]);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const response = await LocalAPI.get('/bordereaux', {
        params: {
          ...params,
          include: 'bulletinSoins,client',
          archived: false // Only show non-archived bordereaux
        }
      });
      
      const data = response.data;
      const items = Array.isArray(data) ? data : data.items || [];
      
      // Map the response to match our interface
      const mappedDossiers = items.map((item: any) => ({
        id: item.id,
        reference: item.reference,
        client: item.client,
        statut: item.statut,
        dateReception: item.dateReception,
        nombreBS: item.nombreBS || 0,
        bulletinSoins: item.bulletinSoins || item.BulletinSoin || [],
        assignedToUserId: item.assignedToUserId
      }));
      
      setDossiers(mappedDossiers);
      setPagination(prev => ({
        ...prev,
        total: data.total || items.length,
        current: data.page || 1,
        pageSize: data.limit || 20
      }));
    } catch (error) {
      console.error('Error loading dossiers:', error);
      message.error('Erreur lors du chargement des dossiers');
      // Set empty data on error
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGestionnaires = async () => {
    try {
      console.log('Loading gestionnaires...');
      const response = await LocalAPI.get('/bulletin-soin/gestionnaires');
      console.log('Gestionnaires response:', response.data);
      const gestionnaires = response.data?.data || response.data || [];
      setGestionnaires(gestionnaires);
    } catch (error) {
      console.error('Error loading gestionnaires:', error);
      setGestionnaires([]);
    }
  };

  const handleSelectDossier = (dossierId: string, checked: boolean) => {
    if (checked) {
      setSelectedDossiers(prev => [...prev, dossierId]);
      // Also select all BS in this dossier
      const dossier = dossiers.find(d => d.id === dossierId);
      if (dossier) {
        const bsIds = dossier.bulletinSoins?.map(bs => bs.id) || [];
        setSelectedBS(prev => [...prev, ...bsIds]);
      }
    } else {
      setSelectedDossiers(prev => prev.filter(id => id !== dossierId));
      // Also deselect all BS in this dossier
      const dossier = dossiers.find(d => d.id === dossierId);
      if (dossier) {
        const bsIds = dossier.bulletinSoins?.map(bs => bs.id) || [];
        setSelectedBS(prev => prev.filter(id => !bsIds.includes(id)));
      }
    }
  };

  const handleSelectBS = (bsId: string, checked: boolean) => {
    if (checked) {
      setSelectedBS(prev => [...prev, bsId]);
    } else {
      setSelectedBS(prev => prev.filter(id => id !== bsId));
    }
  };

  const handleBulkSelect = (count: number | 'all') => {
    if (count === 'all') {
      const allDossierIds = dossiers.map(d => d.id);
      const allBSIds = dossiers.flatMap(d => d.bulletinSoins?.map(bs => bs.id) || []);
      setSelectedDossiers(allDossierIds);
      setSelectedBS(allBSIds);
    } else {
      const selectedDossierIds = dossiers.slice(0, count).map(d => d.id);
      const selectedBSIds = dossiers.slice(0, count).flatMap(d => d.bulletinSoins?.map(bs => bs.id) || []);
      setSelectedDossiers(selectedDossierIds);
      setSelectedBS(selectedBSIds);
    }
  };

  const handleClearSelection = () => {
    setSelectedDossiers([]);
    setSelectedBS([]);
  };

  const handleBulkAssign = async () => {
    if (!selectedAssignee || selectedDossiers.length === 0) {
      message.error('Veuillez sélectionner un gestionnaire et des dossiers');
      return;
    }

    try {
      await LocalAPI.post('/bordereaux/bulk-assign', {
        bordereauIds: selectedDossiers,
        userId: selectedAssignee
      });
      
      message.success(`${selectedDossiers.length} dossier(s) assigné(s) avec succès`);
      setAssignModalVisible(false);
      setSelectedAssignee('');
      handleClearSelection();
      loadDossiers();
    } catch (error) {
      console.error('Error assigning dossiers:', error);
      message.error('Erreur lors de l\'assignation');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedStatus || (selectedDossiers.length === 0 && selectedBS.length === 0)) {
      message.error('Veuillez sélectionner un statut et des éléments');
      return;
    }

    try {
      // Update dossier status
      if (selectedDossiers.length > 0) {
        await LocalAPI.post('/bordereaux/bulk-update', {
          bordereauIds: selectedDossiers,
          updates: { statut: selectedStatus }
        });
      }

      // Update BS status
      if (selectedBS.length > 0) {
        for (const bsId of selectedBS) {
          await LocalAPI.patch(`/bulletin-soin/${bsId}`, {
            etat: selectedStatus
          });
        }
      }

      message.success('Statuts mis à jour avec succès');
      setStatusModalVisible(false);
      setSelectedStatus('');
      handleClearSelection();
      loadDossiers();
    } catch (error) {
      console.error('Error updating status:', error);
      message.error('Erreur lors de la mise à jour des statuts');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'EN_ATTENTE': 'orange',
      'A_SCANNER': 'blue',
      'SCAN_EN_COURS': 'processing',
      'SCANNE': 'cyan',
      'A_AFFECTER': 'purple',
      'ASSIGNE': 'geekblue',
      'EN_COURS': 'processing',
      'TRAITE': 'success',
      'CLOTURE': 'default',
      'IN_PROGRESS': 'processing',
      'VALIDATED': 'success',
      'REJECTED': 'error',
      'PRET_VIREMENT': 'cyan',
      'VIREMENT_EN_COURS': 'processing',
      'VIREMENT_EXECUTE': 'success'
    };
    return colors[status] || 'default';
  };

  const expandedRowRender = (dossier: Dossier) => {
    const bsColumns = [
      {
        title: (
          <Checkbox
            checked={dossier.bulletinSoins?.every(bs => selectedBS.includes(bs.id))}
            indeterminate={dossier.bulletinSoins?.some(bs => selectedBS.includes(bs.id)) && 
                          !dossier.bulletinSoins?.every(bs => selectedBS.includes(bs.id))}
            onChange={(e) => {
              const bsIds = dossier.bulletinSoins?.map(bs => bs.id) || [];
              if (e.target.checked) {
                setSelectedBS(prev => [...prev, ...bsIds.filter(id => !prev.includes(id))]);
              } else {
                setSelectedBS(prev => prev.filter(id => !bsIds.includes(id)));
              }
            }}
          />
        ),
        width: 50,
        render: (_: any, bs: BS) => (
          <Checkbox
            checked={selectedBS.includes(bs.id)}
            onChange={(e) => handleSelectBS(bs.id, e.target.checked)}
          />
        )
      },
      {
        title: 'Numéro BS',
        dataIndex: 'numBs',
        key: 'numBs',
        width: 120
      },
      {
        title: 'Assuré',
        dataIndex: 'nomAssure',
        key: 'nomAssure',
        width: 150
      },
      {
        title: 'Bénéficiaire',
        dataIndex: 'nomBeneficiaire',
        key: 'nomBeneficiaire',
        width: 150
      },
      {
        title: 'Montant',
        dataIndex: 'totalPec',
        key: 'totalPec',
        width: 100,
        render: (amount: number) => amount ? `${amount.toFixed(3)} DT` : '-'
      },
      {
        title: 'Statut',
        dataIndex: 'etat',
        key: 'etat',
        width: 120,
        render: (status: string) => (
          <Tag color={getStatusColor(status)}>
            {status}
          </Tag>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_: any, bs: BS) => (
          <Space>
            <Tooltip title="Voir détails">
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => {
                  setSelectedDossier(dossier);
                  setDetailsModalVisible(true);
                }}
              />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <Table
        columns={bsColumns}
        dataSource={dossier.bulletinSoins || []}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ margin: '0 48px' }}
      />
    );
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedDossiers.length === dossiers.length && dossiers.length > 0}
          indeterminate={selectedDossiers.length > 0 && selectedDossiers.length < dossiers.length}
          onChange={(e) => {
            if (e.target.checked) {
              const allIds = dossiers.map(d => d.id);
              const allBSIds = dossiers.flatMap(d => d.bulletinSoins?.map(bs => bs.id) || []);
              setSelectedDossiers(allIds);
              setSelectedBS(allBSIds);
            } else {
              handleClearSelection();
            }
          }}
        />
      ),
      width: 50,
      render: (_: any, dossier: Dossier) => (
        <Checkbox
          checked={selectedDossiers.includes(dossier.id)}
          onChange={(e) => handleSelectDossier(dossier.id, e.target.checked)}
        />
      )
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      render: (text: string, dossier: Dossier) => (
        <Space>
          <Button
            type="text"
            icon={expandedRows.includes(dossier.id) ? <DownOutlined /> : <RightOutlined />}
            size="small"
            onClick={() => {
              if (expandedRows.includes(dossier.id)) {
                setExpandedRows(prev => prev.filter(id => id !== dossier.id));
              } else {
                setExpandedRows(prev => [...prev, dossier.id]);
              }
            }}
          />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Client',
      key: 'client',
      width: 200,
      render: (_: any, dossier: Dossier) => dossier.client?.name || 'N/A'
    },
    {
      title: 'Statut Dossier',
      dataIndex: 'statut',
      key: 'statut',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'BS',
      key: 'bs',
      width: 80,
      render: (_: any, dossier: Dossier) => (
        <Badge count={dossier.bulletinSoins?.length || 0} showZero />
      )
    },
    {
      title: 'Date Réception',
      dataIndex: 'dateReception',
      key: 'dateReception',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('fr-FR') : '-'
    },
    {
      title: 'Assigné à',
      key: 'assignedTo',
      width: 150,
      render: (_: any, dossier: Dossier) => {
        const assignedUser = gestionnaires.find(g => g.id === dossier.assignedToUserId);
        return assignedUser ? (
          <Tag icon={<UserOutlined />} color="blue">
            {assignedUser.fullName}
          </Tag>
        ) : (
          <Text type="secondary">Non assigné</Text>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, dossier: Dossier) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedDossier(dossier);
                setDetailsModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Bulk Actions */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space wrap>
          <Text strong>Sélection fluide:</Text>
          <Button size="small" onClick={() => handleBulkSelect(20)}>20</Button>
          <Button size="small" onClick={() => handleBulkSelect(30)}>30</Button>
          <Button size="small" onClick={() => handleBulkSelect(50)}>50</Button>
          <Button size="small" onClick={() => handleBulkSelect('all')}>Tout</Button>
          <Button size="small" onClick={handleClearSelection}>Effacer</Button>
        </Space>
        
        <Space>
          <Text>
            Sélectionnés: {selectedDossiers.length} dossier(s), {selectedBS.length} BS
          </Text>
          <Button
            type="primary"
            icon={<UserOutlined />}
            disabled={selectedDossiers.length === 0}
            onClick={() => setAssignModalVisible(true)}
          >
            Assigner
          </Button>
          <Button
            icon={<CheckOutlined />}
            disabled={selectedDossiers.length === 0 && selectedBS.length === 0}
            onClick={() => setStatusModalVisible(true)}
          >
            Changer Statut
          </Button>
        </Space>
      </div>

      {/* Dossiers Table */}
      <Table
        columns={columns}
        dataSource={dossiers}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedRows,
          onExpand: (expanded, record) => {
            if (expanded) {
              setExpandedRows(prev => [...prev, record.id]);
            } else {
              setExpandedRows(prev => prev.filter(id => id !== record.id));
            }
          },
          showExpandColumn: false
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} dossiers`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
            onParamsChange && onParamsChange({ ...params, page, limit: pageSize });
          }
        }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* Assignment Modal */}
      <Modal
        title="Assigner les dossiers sélectionnés"
        open={assignModalVisible}
        onOk={handleBulkAssign}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedAssignee('');
        }}
        okText="Assigner"
        cancelText="Annuler"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Dossiers sélectionnés: {selectedDossiers.length}</Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Sélectionner un gestionnaire"
          value={selectedAssignee}
          onChange={setSelectedAssignee}
          options={gestionnaires.map(g => ({
            value: g.id,
            label: g.fullName
          }))}
        />
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title="Changer le statut"
        open={statusModalVisible}
        onOk={handleBulkStatusUpdate}
        onCancel={() => {
          setStatusModalVisible(false);
          setSelectedStatus('');
        }}
        okText="Mettre à jour"
        cancelText="Annuler"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Éléments sélectionnés: {selectedDossiers.length} dossier(s), {selectedBS.length} BS</Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Sélectionner un statut"
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: 'A_SCANNER', label: 'À scanner' },
            { value: 'SCAN_EN_COURS', label: 'En cours de scan' },
            { value: 'SCANNE', label: 'Scanné' },
            { value: 'A_AFFECTER', label: 'À affecter' },
            { value: 'ASSIGNE', label: 'Assigné' },
            { value: 'EN_COURS', label: 'En cours de traitement' },
            { value: 'TRAITE', label: 'Traité' },
            { value: 'CLOTURE', label: 'Clôturé' }
          ]}
        />
      </Modal>

      {/* Details Modal */}
      <Modal
        title={`Détails du Dossier - ${selectedDossier?.reference}`}
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedDossier(null);
        }}
        footer={null}
        width={800}
      >
        {selectedDossier && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Référence:</Text> {selectedDossier.reference}<br/>
              <Text strong>Client:</Text> {selectedDossier.client?.name}<br/>
              <Text strong>Statut:</Text> <Tag color={getStatusColor(selectedDossier.statut)}>{selectedDossier.statut}</Tag><br/>
              <Text strong>Date Réception:</Text> {new Date(selectedDossier.dateReception).toLocaleDateString('fr-FR')}<br/>
              <Text strong>Nombre BS:</Text> {selectedDossier.nombreBS}<br/>
              <Text strong>Assigné à:</Text> {gestionnaires.find(g => g.id === selectedDossier.assignedToUserId)?.fullName || 'Non assigné'}
            </div>
            
            {selectedDossier.bulletinSoins && selectedDossier.bulletinSoins.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 16 }}>Bulletins de Soins ({selectedDossier.bulletinSoins.length})</Text>
                <Table
                  dataSource={selectedDossier.bulletinSoins}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  style={{ marginTop: 8 }}
                  columns={[
                    {
                      title: 'Numéro BS',
                      dataIndex: 'numBs',
                      width: 120
                    },
                    {
                      title: 'Assuré',
                      dataIndex: 'nomAssure',
                      width: 150
                    },
                    {
                      title: 'Bénéficiaire', 
                      dataIndex: 'nomBeneficiaire',
                      width: 150
                    },
                    {
                      title: 'Montant',
                      dataIndex: 'totalPec',
                      width: 100,
                      render: (amount: number) => amount ? `${amount.toFixed(3)} DT` : '-'
                    },
                    {
                      title: 'Statut',
                      dataIndex: 'etat',
                      width: 120,
                      render: (status: string) => (
                        <Tag color={getStatusColor(status)}>
                          {status}
                        </Tag>
                      )
                    }
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DossiersList;