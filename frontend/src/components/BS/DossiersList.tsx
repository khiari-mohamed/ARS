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
  Badge,
  List,
  Card
} from 'antd';
import { 
  EyeOutlined, 
  UserOutlined, 
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  RightOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { LocalAPI } from '../../services/axios';

const { Panel } = Collapse;
const { Text } = Typography;

// Documents Viewer Component
interface DocumentsViewerProps {
  dossierId: string;
  selectedDocuments?: string[];
  onDocumentSelect?: (documentId: string, checked: boolean) => void;
}

const DocumentsViewer: React.FC<DocumentsViewerProps> = ({ 
  dossierId, 
  selectedDocuments = [], 
  onDocumentSelect 
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [dossierId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await LocalAPI.get(`/bordereaux/${dossierId}`, {
        params: { include: 'documents,assignedTo' }
      });
      const documents = response.data.documents || [];
      // Make sure each document has assignment info
      const documentsWithAssignment = documents.map((doc: any) => ({
        ...doc,
        assignedToUserId: doc.assignedToUserId || null
      }));
      setDocuments(documentsWithAssignment);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = async (documentId: string, document: any) => {
    try {
      const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${documentId}`);
      if (response.data.success && response.data.pdfUrl) {
        // Use the same PDF modal as ChefEquipeDashboard
        const event = new CustomEvent('openPDFModal', {
          detail: {
            pdfUrl: response.data.pdfUrl,
            document: {
              id: documentId,
              reference: document.name,
              client: 'N/A', // Will be filled by parent
              type: document.type,
              statut: document.status || 'Nouveau'
            }
          }
        });
        window.dispatchEvent(event);
      } else {
        message.error(response.data.error || 'PDF non disponible');
      }
    } catch (error) {
      message.error('Erreur lors de l\'ouverture du PDF');
    }
  };

  if (documents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Text type="secondary">Aucun document disponible pour ce dossier</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        {onDocumentSelect && (
          <Checkbox
            checked={documents.length > 0 && documents.filter(doc => !doc.assignedToUserId).every(doc => selectedDocuments.includes(doc.id))}
            indeterminate={documents.some(doc => selectedDocuments.includes(doc.id) && !doc.assignedToUserId) && 
                          !documents.filter(doc => !doc.assignedToUserId).every(doc => selectedDocuments.includes(doc.id))}
            onChange={(e) => {
              documents.forEach(doc => {
                if (!doc.assignedToUserId) {
                  onDocumentSelect(doc.id, e.target.checked);
                }
              });
            }}
          />
        )}
        <Text strong style={{ fontSize: 16 }}>Documents ({documents.length})</Text>
      </div>
      <List
        style={{ marginTop: 8 }}
        dataSource={documents}
        renderItem={(doc: any) => (
          <List.Item
            actions={[
              <Button
                type="link"
                icon={<FilePdfOutlined />}
                onClick={() => handleViewPDF(doc.id, doc)}
              >
                Voir PDF
              </Button>
            ]}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              {onDocumentSelect && (
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  disabled={!!doc.assignedToUserId}
                  onChange={(e) => onDocumentSelect(doc.id, e.target.checked)}
                />
              )}
              <List.Item.Meta
                avatar={<FilePdfOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{doc.name || 'Document'}</span>
                    {doc.assignedToUserId && (
                      <Tag icon={<UserOutlined />} color="green">
                        {doc.assignedTo?.fullName || 'Assigné'}
                      </Tag>
                    )}
                  </div>
                }
                description={`Type: ${doc.type || 'N/A'} | Uploadé le: ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : 'N/A'}${doc.assignedToUserId ? ' | Assigné' : ' | Non assigné'}`}
              />
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

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
  documents?: any[];
  documentAssignments?: {
    total: number;
    assigned: number;
    unassigned: number;
    assignedTo: string[];
  };
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
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers');
      const items = response.data || [];
      
      // Get additional document details for each dossier
      const dossiersWithDocuments = await Promise.all(
        items.map(async (item: any) => {
          try {
            const docResponse = await LocalAPI.get(`/bordereaux/${item.id}`, {
              params: { include: 'documents,documents.assignedTo' }
            });
            const documents = docResponse.data.documents || [];
            const assignedDocs = documents.filter((doc: any) => doc.assignedToUserId);
            const assignedToUsers = [...new Set(assignedDocs.map((doc: any) => doc.assignedTo?.fullName).filter(Boolean))];
            
            return {
              id: item.id,
              reference: item.reference,
              client: { name: item.client },
              statut: item.statut,
              dateReception: item.date,
              nombreBS: documents.length,
              bulletinSoins: [],
              assignedToUserId: item.assignedToUserId,
              documents: documents,
              documentAssignments: {
                total: documents.length,
                assigned: assignedDocs.length,
                unassigned: documents.length - assignedDocs.length,
                assignedTo: assignedToUsers
              }
            };
          } catch (error) {
            console.error(`Error loading documents for ${item.id}:`, error);
            return {
              id: item.id,
              reference: item.reference,
              client: { name: item.client },
              statut: item.statut,
              dateReception: item.date,
              nombreBS: 0,
              bulletinSoins: [],
              assignedToUserId: item.assignedToUserId,
              documents: [],
              documentAssignments: {
                total: 0,
                assigned: 0,
                unassigned: 0,
                assignedTo: []
              }
            };
          }
        })
      );
      
      setDossiers(dossiersWithDocuments);
      setPagination(prev => ({
        ...prev,
        total: dossiersWithDocuments.length,
        current: 1,
        pageSize: 20
      }));
    } catch (error) {
      console.error('Error loading dossiers:', error);
      message.error('Erreur lors du chargement des dossiers');
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
    const dossier = dossiers.find(d => d.id === dossierId);
    
    // Check if dossier is already assigned to a gestionnaire
    if (dossier?.assignedToUserId && checked) {
      message.warning('Ce dossier est déjà assigné à un gestionnaire');
      return;
    }
    
    if (checked) {
      setSelectedDossiers(prev => [...prev, dossierId]);
      // Also select all BS in this dossier
      if (dossier) {
        const bsIds = dossier.bulletinSoins?.map(bs => bs.id) || [];
        setSelectedBS(prev => [...prev, ...bsIds]);
      }
    } else {
      setSelectedDossiers(prev => prev.filter(id => id !== dossierId));
      // Also deselect all BS in this dossier
      if (dossier) {
        const bsIds = dossier.bulletinSoins?.map(bs => bs.id) || [];
        setSelectedBS(prev => prev.filter(id => !bsIds.includes(id)));
      }
    }
  };

  const handleSelectBS = (bsId: string, checked: boolean) => {
    // Check if this document is already assigned
    const allDocuments = dossiers.flatMap(d => d.documents || []);
    const document = allDocuments.find(doc => doc.id === bsId);
    
    if (document?.assignedToUserId && checked) {
      message.warning('Ce document est déjà assigné à un gestionnaire');
      return;
    }
    
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
    if (!selectedAssignee || (selectedDossiers.length === 0 && selectedBS.length === 0)) {
      message.error('Veuillez sélectionner un gestionnaire et des éléments');
      return;
    }

    try {
      // Assign bordereaux if selected
      if (selectedDossiers.length > 0) {
        await LocalAPI.post('/bordereaux/bulk-assign', {
          bordereauIds: selectedDossiers,
          userId: selectedAssignee
        });
      }
      
      // Assign individual BS if selected
      if (selectedBS.length > 0) {
        await LocalAPI.post('/bordereaux/bulk-assign-documents', {
          documentIds: selectedBS,
          userId: selectedAssignee
        });
      }
      
      const totalAssigned = selectedDossiers.length + selectedBS.length;
      message.success(`${totalAssigned} élément(s) assigné(s) avec succès`);
      setAssignModalVisible(false);
      setSelectedAssignee('');
      handleClearSelection();
      loadDossiers();
    } catch (error) {
      console.error('Error assigning elements:', error);
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
    return (
      <div style={{ margin: '0 48px', padding: '16px', background: '#fafafa', borderRadius: '4px' }}>
        <DocumentsViewer 
          dossierId={dossier.id} 
          selectedDocuments={selectedBS}
          onDocumentSelect={handleSelectBS}
        />
      </div>
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
          disabled={!!dossier.assignedToUserId}
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
        <Badge count={dossier.nombreBS || 0} showZero />
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
      width: 200,
      render: (_: any, dossier: Dossier) => {
        const documents = dossier.documents || [];
        
        if (documents.length === 0) {
          return <Text type="secondary">Aucun document</Text>;
        }
        
        const assignedDocs = documents.filter(doc => doc.assignedToUserId);
        const assignedToUsers = [...new Set(assignedDocs.map(doc => doc.assignedTo?.fullName || 'Assigné').filter(Boolean))];
        
        if (assignedDocs.length === 0) {
          return <Text type="secondary">Non assigné</Text>;
        }
        
        if (assignedDocs.length === documents.length) {
          if (assignedToUsers.length === 1) {
            return (
              <Tag icon={<UserOutlined />} color="green">
                {assignedToUsers[0]}
              </Tag>
            );
          } else {
            return (
              <Tooltip title={assignedToUsers.join(', ')}>
                <Tag icon={<UserOutlined />} color="green">
                  {assignedToUsers.length} gestionnaires
                </Tag>
              </Tooltip>
            );
          }
        } else {
          return (
            <div>
              <Tag color="orange">
                {assignedDocs.length}/{documents.length} assignés
              </Tag>
              {assignedToUsers.length > 0 && (
                <Tooltip title={assignedToUsers.join(', ')}>
                  <Tag icon={<UserOutlined />} color="blue">
                    {assignedToUsers.length} gest.
                  </Tag>
                </Tooltip>
              )}
            </div>
          );
        }
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
            disabled={selectedDossiers.length === 0 && selectedBS.length === 0}
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
          <Text>Dossiers sélectionnés: {selectedDossiers.length}</Text><br/>
          <Text>BS individuels sélectionnés: {selectedBS.length}</Text><br/>
          <Text strong>Total à assigner: {selectedDossiers.length + selectedBS.length}</Text>
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
              <Text strong>Nombre Documents:</Text> {selectedDossier.nombreBS}
            </div>
            
            <DocumentsViewer dossierId={selectedDossier.id} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DossiersList;