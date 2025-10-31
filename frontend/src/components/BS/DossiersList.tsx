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
import { useAuth } from '../../contexts/AuthContext';

const { Panel } = Collapse;
const { Text } = Typography;

// Documents Viewer Component
interface DocumentsViewerProps {
  dossierId: string;
  selectedDocuments?: string[];
  onDocumentSelect?: (documentId: string, checked: boolean) => void;
  onBulkSelect?: (documentIds: string[]) => void;
  onReassignClick?: (documentId: string) => void;
}

const DocumentsViewer: React.FC<DocumentsViewerProps> = ({ 
  dossierId, 
  selectedDocuments = [], 
  onDocumentSelect,
  onBulkSelect,
  onReassignClick
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

  const handleBulkSelectInBordereau = (count: number | 'all') => {
    const unassignedDocs = documents.filter(doc => !doc.assignedToUserId);
    console.log('Unassigned docs:', unassignedDocs.length, 'Total docs:', documents.length);
    const docsToSelect = count === 'all' ? unassignedDocs : unassignedDocs.slice(0, count);
    const docIds = docsToSelect.map(doc => doc.id);
    console.log('Selecting doc IDs:', docIds);
    
    if (onBulkSelect) {
      onBulkSelect(docIds);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        
        {onBulkSelect && (
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Sélection rapide:</Text>
            <Button size="small" onClick={() => handleBulkSelectInBordereau(20)}>20</Button>
            <Button size="small" onClick={() => handleBulkSelectInBordereau(30)}>30</Button>
            <Button size="small" onClick={() => handleBulkSelectInBordereau(50)}>50</Button>
            <Button size="small" onClick={() => handleBulkSelectInBordereau('all')}>Tout</Button>
          </Space>
        )}
      </div>
      <List
        style={{ marginTop: 8 }}
        dataSource={documents}
        renderItem={(doc: any) => {
          const isReturned = doc.status === 'RETOUR_ADMIN';
          return (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<FilePdfOutlined />}
                  onClick={() => handleViewPDF(doc.id, doc)}
                >
                  Voir PDF
                </Button>,
                isReturned && onReassignClick && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<UserOutlined />}
                    onClick={() => onReassignClick(doc.id)}
                  >
                    Réassigner
                  </Button>
                )
              ].filter(Boolean)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                {onDocumentSelect && (
                  <Checkbox
                    checked={selectedDocuments.includes(doc.id)}
                    disabled={!!doc.assignedToUserId && doc.status !== 'RETOUR_ADMIN'}
                    onChange={(e) => onDocumentSelect(doc.id, e.target.checked)}
                  />
                )}
                <List.Item.Meta
                  avatar={<FilePdfOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{doc.name || 'Document'}</span>
                      {doc.status === 'REJETE' && <Tag color="red">❌ Rejeté</Tag>}
                      {doc.status === 'RETOUR_ADMIN' && <Tag color="orange">↩️ Retourné</Tag>}
                      {doc.assignedToUserId && doc.status !== 'RETOUR_ADMIN' && (
                        <Tag icon={<UserOutlined />} color="green">
                          {doc.assignedTo?.fullName || 'Assigné'}
                        </Tag>
                      )}
                    </div>
                  }
                  description={`Type: ${doc.type || 'N/A'} | Uploadé le: ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : 'N/A'}${doc.assignedToUserId && doc.status !== 'RETOUR_ADMIN' ? ' | Assigné' : ' | Non assigné'}`}
                />
              </div>
            </List.Item>
          );
        }}
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
  const { user } = useAuth();
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
  const [documentStatusModalVisible, setDocumentStatusModalVisible] = useState(false);
  const [selectedDocumentStatus, setSelectedDocumentStatus] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    loadDossiers();
    loadGestionnaires();
    
    // Periodic check for virement execution (every 30 seconds)
    const virementCheckInterval = setInterval(() => {
      checkVirementStatusForAllBordereaux();
    }, 30000);
    
    return () => clearInterval(virementCheckInterval);
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
      setPagination({
        current: 1,
        pageSize: 5,
        total: dossiersWithDocuments.length
      });
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
      console.log('Loading gestionnaires for user role:', user?.role);
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
    // Check if this document is already assigned (except for returned documents)
    const allDocuments = dossiers.flatMap(d => d.documents || []);
    const document = allDocuments.find(doc => doc.id === bsId);
    
    if (document?.assignedToUserId && document.status !== 'RETOUR_ADMIN' && checked) {
      message.warning('Ce document est déjà assigné à un gestionnaire');
      return;
    }
    
    if (checked) {
      setSelectedBS(prev => [...prev, bsId]);
    } else {
      setSelectedBS(prev => prev.filter(id => id !== bsId));
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
        
        // Update status to EN_COURS for reassigned documents
        for (const docId of selectedBS) {
          await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
            dossierId: docId,
            newStatus: 'En cours'
          });
        }
        
        // Update bordereau status based on document assignments
        await updateBordereauStatusBasedOnDocuments(selectedBS);
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
    if (!selectedStatus || selectedDossiers.length === 0) {
      message.error('Veuillez sélectionner un statut et des bordereaux');
      return;
    }

    try {
      await LocalAPI.post('/bordereaux/bulk-update', {
        bordereauIds: selectedDossiers,
        updates: { statut: selectedStatus }
      });

      message.success('Statuts des bordereaux mis à jour avec succès');
      setStatusModalVisible(false);
      setSelectedStatus('');
      handleClearSelection();
      loadDossiers();
    } catch (error) {
      console.error('Error updating status:', error);
      message.error('Erreur lors de la mise à jour des statuts');
    }
  };

  // Automatic bordereau status update based on document states
  const updateBordereauStatusBasedOnDocuments = async (affectedDocIds: string[]) => {
    const affectedBordereaux = new Set<string>();
    for (const docId of affectedDocIds) {
      const bordereau = dossiers.find(d => d.documents?.some(doc => doc.id === docId));
      if (bordereau) affectedBordereaux.add(bordereau.id);
    }
    
    for (const bordereauId of affectedBordereaux) {
      try {
        // Get fresh document data and virement status
        const response = await LocalAPI.get(`/bordereaux/${bordereauId}`, {
          params: { include: 'documents,ordresVirement' }
        });
        const documents = response.data.documents || [];
        const ordresVirement = response.data.ordresVirement || [];
        
        if (documents.length === 0) continue;
        
        const allAssigned = documents.every((doc: any) => doc.assignedToUserId);
        const allTreatedOrRejected = documents.every((doc: any) => 
          doc.status === 'TRAITE' || doc.status === 'REJETE'
        );
        
        // Check if virement is executed
        const virementExecuted = ordresVirement.some((ov: any) => ov.etatVirement === 'EXECUTE');
        
        let newStatus = null;
        
        // Rule 1: If all documents assigned -> EN_COURS (from A_AFFECTER)
        if (allAssigned && response.data.statut === 'A_AFFECTER') {
          newStatus = 'EN_COURS';
        }
        // Rule 2: If all documents treated/rejected -> TRAITE (from EN_COURS)
        else if (allTreatedOrRejected && response.data.statut === 'EN_COURS') {
          newStatus = 'TRAITE';
        }
        // Rule 3: If virement executed -> CLOTURE (from TRAITE or VIREMENT_EXECUTE)
        else if (virementExecuted && (response.data.statut === 'TRAITE' || response.data.statut === 'VIREMENT_EXECUTE')) {
          newStatus = 'CLOTURE';
        }
        
        if (newStatus) {
          await LocalAPI.put(`/bordereaux/${bordereauId}`, { statut: newStatus });
        }
      } catch (error) {
        console.error(`Error updating bordereau ${bordereauId} status:`, error);
      }
    }
  };

  // Check virement status for all bordereaux and update to CLOTURE if executed
  const checkVirementStatusForAllBordereaux = async () => {
    try {
      const bordereauxToCheck = dossiers.filter(d => 
        d.statut === 'TRAITE' || d.statut === 'VIREMENT_EXECUTE'
      );
      
      for (const bordereau of bordereauxToCheck) {
        try {
          const response = await LocalAPI.get(`/bordereaux/${bordereau.id}`, {
            params: { include: 'ordresVirement' }
          });
          
          const ordresVirement = response.data.ordresVirement || [];
          const virementExecuted = ordresVirement.some((ov: any) => ov.etatVirement === 'EXECUTE');
          
          if (virementExecuted && (response.data.statut === 'TRAITE' || response.data.statut === 'VIREMENT_EXECUTE')) {
            await LocalAPI.put(`/bordereaux/${bordereau.id}`, { statut: 'CLOTURE' });
            console.log(`Bordereau ${bordereau.reference} automatically updated to CLOTURE`);
          }
        } catch (error) {
          console.error(`Error checking virement for bordereau ${bordereau.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in virement status check:', error);
    }
  };

  const handleBulkDocumentStatusUpdate = async () => {
    if (!selectedDocumentStatus || selectedBS.length === 0) {
      message.error('Veuillez sélectionner un statut et des documents');
      return;
    }

    try {
      for (const docId of selectedBS) {
        const statusMap: any = {
          'UPLOADED': 'Nouveau',
          'SCANNE': 'Scanné',
          'EN_COURS': 'En cours',
          'TRAITE': 'Traité',
          'REJETE': 'Rejeté',
          'RETOUR_ADMIN': 'Retourné'
        };
        await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
          dossierId: docId,
          newStatus: statusMap[selectedDocumentStatus] || selectedDocumentStatus
        });
      }

      // Update bordereau status based on document changes
      await updateBordereauStatusBasedOnDocuments(selectedBS);
      
      message.success('Statuts des documents mis à jour avec succès');
      setDocumentStatusModalVisible(false);
      setSelectedDocumentStatus('');
      handleClearSelection();
      loadDossiers();
    } catch (error) {
      console.error('Error updating document status:', error);
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

  const handleBulkSelectInBordereau = (documentIds: string[]) => {
    console.log('handleBulkSelectInBordereau called with:', documentIds);
    setSelectedBS(prev => {
      // Remove duplicates and add new selections
      const uniqueIds = [...new Set([...prev, ...documentIds])];
      console.log('Updated selectedBS:', uniqueIds);
      return uniqueIds;
    });
  };

  const handleReassignDocument = (documentId: string) => {
    setSelectedBS([documentId]);
    setAssignModalVisible(true);
  };

  const expandedRowRender = (dossier: Dossier) => {
    return (
      <div style={{ margin: '0 48px', padding: '16px', background: '#fafafa', borderRadius: '4px' }}>
        <DocumentsViewer 
          dossierId={dossier.id} 
          selectedDocuments={selectedBS}
          onDocumentSelect={handleSelectBS}
          onBulkSelect={handleBulkSelectInBordereau}
          onReassignClick={handleReassignDocument}
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
          <Button size="small" onClick={handleClearSelection}>Effacer sélection</Button>
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
            disabled={selectedDossiers.length === 0}
            onClick={() => setStatusModalVisible(true)}
          >
            Changer Statut Bordereau
          </Button>
          <Button
            icon={<CheckOutlined />}
            disabled={selectedBS.length === 0}
            onClick={() => setDocumentStatusModalVisible(true)}
          >
            Changer Statut Document
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

      {/* Bordereau Status Update Modal */}
      <Modal
        title="Changer le statut des bordereaux"
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
          <Text>Bordereaux sélectionnés: {selectedDossiers.length}</Text>
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
            { value: 'VIREMENT_EXECUTE', label: 'Virement exécuté' }
          ]}
        />
      </Modal>

      {/* Document Status Update Modal */}
      <Modal
        title="Changer le statut des documents"
        open={documentStatusModalVisible}
        onOk={handleBulkDocumentStatusUpdate}
        onCancel={() => {
          setDocumentStatusModalVisible(false);
          setSelectedDocumentStatus('');
        }}
        okText="Mettre à jour"
        cancelText="Annuler"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Documents sélectionnés: {selectedBS.length}</Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Sélectionner un statut"
          value={selectedDocumentStatus}
          onChange={setSelectedDocumentStatus}
          options={[
            { value: 'UPLOADED', label: 'Nouveau' },
            { value: 'SCANNE', label: 'Scanné' },
            { value: 'EN_COURS', label: 'En cours' },
            { value: 'TRAITE', label: 'Traité' },
            { value: 'REJETE', label: '❌ Rejeté' },
            { value: 'RETOUR_ADMIN', label: '↩️ Retourné' }
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
            
            <DocumentsViewer 
              dossierId={selectedDossier.id} 
              selectedDocuments={selectedBS}
              onDocumentSelect={handleSelectBS}
              onReassignClick={handleReassignDocument}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DossiersList;