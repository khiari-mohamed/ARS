/*import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Alert, Tabs, Progress, Modal, message, notification } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useBSList, useSlaAlerts, usePriorities, usePerformanceMetrics } from '../../hooks/useBS';
import { BSStatusTag } from '../../components/BS/BSStatusTag';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchGestionnaireCorbeille, fetchGestionnaireGlobalBasket, searchGestionnaireDossiers, fetchGestionnaireExtendedCorbeille, fetchGestionnaireAIPriorities } from '../../services/bordereauxService';

const { TabPane } = Tabs;

interface BSItem {
  id: string;
  numBs: string;
  nomAssure: string;
  nomBeneficiaire: string;
  etat: string;
  dueDate?: string;
  dateCreation: string;
  totalPec: number;
}

interface PriorityBS extends BSItem {
  priority_score?: number;
}

const GestionnaireDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('corbeille');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [corbeilleData, setCorbeilleData] = useState<any>(null);
  const [loadingCorbeille, setLoadingCorbeille] = useState(true);
  const [globalBasketData, setGlobalBasketData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSociete, setSelectedSociete] = useState('Toutes les sociétés');
  const [extendedCorbeilleData, setExtendedCorbeilleData] = useState<any>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [aiPriorities, setAiPriorities] = useState<any[]>([]);
  
  useEffect(() => {
    loadCorbeilleData();
    loadGlobalBasketData();
    loadExtendedCorbeilleData();
    loadAIPriorities();
  }, []);
  
  const loadCorbeilleData = async () => {
    try {
      const data = await fetchGestionnaireCorbeille();
      setCorbeilleData(data);
    } catch (error) {
      console.error('Error loading corbeille data:', error);
    } finally {
      setLoadingCorbeille(false);
    }
  };

  const loadGlobalBasketData = async () => {
    try {
      const data = await fetchGestionnaireGlobalBasket();
      setGlobalBasketData(data);
    } catch (error) {
      console.error('Error loading global basket data:', error);
    }
  };

  const loadExtendedCorbeilleData = async () => {
    try {
      const data = await fetchGestionnaireExtendedCorbeille();
      setExtendedCorbeilleData(data);
    } catch (error) {
      console.error('Error loading extended corbeille data:', error);
    }
  };

  const loadAIPriorities = async () => {
    try {
      const data = await fetchGestionnaireAIPriorities();
      setAiPriorities(data || []);
    } catch (error) {
      console.error('Error loading AI priorities:', error);
    }
  };

  const handleSearch = async () => {
    const effectiveQuery = searchQuery.trim() || (selectedSociete !== 'Toutes les sociétés' ? selectedSociete : '');
    
    if (!effectiveQuery) {
      setSearchResults([]);
      return;
    }
    
    try {
      const filters = selectedSociete !== 'Toutes les sociétés' ? { societe: selectedSociete } : undefined;
      const results = await searchGestionnaireDossiers(effectiveQuery, filters);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching dossiers:', error);
      setSearchResults([]);
    }
  };

  const handleMarkAsProcessed = async (bsId: string) => {
    const loadingMessage = message.loading('Marquage en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/bs/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bsId, status: 'TRAITE' })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'BS marqué comme traité');
        loadCorbeilleData();
        loadExtendedCorbeilleData();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du marquage');
      }
    } catch (error) {
      loadingMessage();
      console.error('Error marking BS as processed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleProcessBordereau = async (bordereauId: string) => {
    const loadingMessage = message.loading('Traitement en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauId, 
          action: 'TRAITE'
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'Bordereau traité avec succès');
        loadCorbeilleData();
        loadExtendedCorbeilleData();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du traitement');
      }
    } catch (error) {
      loadingMessage();
      console.error('Process bordereau failed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleReturnToChef = async (bordereauId: string) => {
    const reason = prompt('Raison du retour au chef d\'équipe:');
    if (!reason) return;
    
    const loadingMessage = message.loading('Retour en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauId, 
          action: 'RETOURNE_CHEF',
          reason 
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'Dossier retourné au chef');
        loadCorbeilleData();
        loadExtendedCorbeilleData();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du retour');
      }
    } catch (error) {
      loadingMessage();
      console.error('Return to chef failed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleViewBordereauDetails = async (bordereauId: string) => {
    const loadingMessage = message.loading('Chargement des détails...', 0);
    
    try {
      const response = await fetch(`/api/workflow/gestionnaire/bordereau/${bordereauId}/details`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      loadingMessage();
      
      if (response.ok) {
        const details = await response.json();
        
        // Show details in a modal
        Modal.info({
          title: `Détails du bordereau ${details.reference}`,
          width: 800,
          content: (
            <div>
              <p><strong>Client:</strong> {details.client?.name}</p>
              <p><strong>Statut:</strong> <BSStatusTag status={details.statut} /></p>
              <p><strong>Date réception:</strong> {new Date(details.dateReception).toLocaleDateString()}</p>
              <p><strong>Nombre BS:</strong> {details.nombreBS}</p>
              <p><strong>SLA:</strong> {details.slaInfo?.slaStatus}</p>
              <p><strong>Progression:</strong> {details.bsStats?.completionRate}%</p>
              {details.BulletinSoin?.length > 0 && (
                <div>
                  <h4>Bulletins de soins:</h4>
                  <ul>
                    {details.BulletinSoin.slice(0, 5).map((bs: any) => (
                      <li key={bs.id}>{bs.numBs} - {bs.nomAssure} ({bs.etat})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          okText: 'Fermer'
        });
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du chargement des détails');
      }
    } catch (error) {
      loadingMessage();
      console.error('View details failed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleEditBordereau = async (bordereauId: string) => {
    let formData = {
      priority: 1,
      delaiReglement: 30,
      nombreBS: 1,
      dateLimiteTraitement: '',
      dateReceptionBO: '',
      dateReceptionEquipeSante: '',
      nombreJourTraitement: 0
    };
    let selectedFiles: File[] = [];
    
    Modal.confirm({
      title: 'Éditer le bordereau',
      width: 800,
      content: (
        <div style={{ marginTop: 16, maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label>Priorité:</label>
              <select 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                defaultValue={1}
                onChange={(e) => formData.priority = parseInt(e.target.value)}
              >
                <option value={1}>Normale</option>
                <option value={2}>Haute</option>
                <option value={3}>Urgente</option>
              </select>
            </div>
            <div>
              <label>Délai règlement (jours):</label>
              <input 
                type="number" 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                defaultValue={30}
                onChange={(e) => formData.delaiReglement = parseInt(e.target.value) || 30}
              />
            </div>
            <div>
              <label>Nombre BS:</label>
              <input 
                type="number" 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                defaultValue={1}
                onChange={(e) => formData.nombreBS = parseInt(e.target.value) || 1}
              />
            </div>
            <div>
              <label>Nombre jours traitement:</label>
              <input 
                type="number" 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                defaultValue={0}
                onChange={(e) => formData.nombreJourTraitement = parseInt(e.target.value) || 0}
              />
            </div>
            <div>
              <label>Date limite traitement:</label>
              <input 
                type="date" 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                onChange={(e) => formData.dateLimiteTraitement = e.target.value}
              />
            </div>
            <div>
              <label>Date réception BO:</label>
              <input 
                type="date" 
                style={{ width: '100%', marginTop: 4, padding: 8 }}
                onChange={(e) => formData.dateReceptionBO = e.target.value}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label>Date réception équipe santé:</label>
            <input 
              type="date" 
              style={{ width: '100%', marginTop: 4, padding: 8 }}
              onChange={(e) => formData.dateReceptionEquipeSante = e.target.value}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <label>Documents supplémentaires:</label>
            <input 
              type="file" 
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ width: '100%', marginTop: 4, padding: 8 }}
              onChange={(e) => selectedFiles = Array.from(e.target.files || [])}
            />
            <small style={{ color: '#666' }}>Formats acceptés: PDF, Images, Documents Word</small>
          </div>
        </div>
      ),
      onOk: async () => {
        const loadingMessage = message.loading('Sauvegarde...', 0);
        
        try {
          // First update bordereau data
          const response = await fetch(`/api/workflow/gestionnaire/bordereau/${bordereauId}/edit`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
          }
          
          let uploadMessage = '';
          if (selectedFiles.length > 0) {
            uploadMessage = ` (${selectedFiles.length} fichier(s) sélectionné(s) - upload à implémenter)`;
          }
          
          loadingMessage();
          const result = await response.json();
          message.success(`${result.message}${uploadMessage}`);
          loadGlobalBasketData(); // Refresh data
          
        } catch (error) {
          loadingMessage();
          console.error('Edit failed:', error);
          message.error((error as Error).message || 'Erreur de connexion');
        }
      },
      okText: 'Sauvegarder',
      cancelText: 'Annuler'
    });
  };

  const handleReassignToMe = async (bordereauId: string) => {
    const loadingMessage = message.loading('Réassignation en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/bulk-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauIds: [bordereauId],
          operation: 'ASSIGN_TO_ME'
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.successCount > 0) {
          message.success('Dossier réassigné avec succès');
          loadCorbeilleData();
          loadExtendedCorbeilleData();
        } else {
          message.error(result.message || 'Erreur lors de la réassignation');
        }
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors de la réassignation');
      }
    } catch (error) {
      loadingMessage();
      console.error('Reassign failed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleBulkActions = () => {
    if (selectedRows.length === 0) {
      message.warning('Veuillez sélectionner au moins un élément');
      return;
    }
    setShowBulkModal(true);
  };

  const downloadCSV = (data: any[], filename: string) => {
    const headers = ['Référence', 'Client', 'Statut', 'Date Réception', 'Nombre BS', 'Taux Complétion'];
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.reference || '',
        item.clientName || '',
        item.statut || '',
        item.dateReception ? new Date(item.dateReception).toLocaleDateString() : '',
        item.nombreBS || 0,
        `${item.completionRate || 0}%`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkOperation = async (operation: string) => {
    if (selectedRows.length === 0) {
      message.warning('Aucun élément sélectionné');
      return;
    }
    
    const loadingMessage = message.loading('Traitement en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/bulk-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauIds: selectedRows,
          operation 
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Check if operation actually succeeded
          if (result.successCount === 0 && result.errorCount > 0) {
            // All operations failed
            notification.error({
              message: 'Opération échouée',
              description: `Tous les ${result.errorCount} éléments ont échoué. Vérifiez que tous les BS sont traités.`,
              duration: 6
            });
          } else if (operation === 'EXPORT_SELECTED') {
            // Handle export operation specially
            const exportData = result.results
              .filter((r: any) => r.success && r.exportData)
              .map((r: any) => r.exportData);
            
            if (exportData.length > 0) {
              const filename = `bordereaux_export_${new Date().toISOString().split('T')[0]}.csv`;
              downloadCSV(exportData, filename);
              
              notification.success({
                message: 'Export réussi',
                description: `${exportData.length} éléments exportés vers ${filename}`,
                duration: 4
              });
            } else {
              notification.warning({
                message: 'Aucune donnée à exporter',
                description: 'Aucun élément valide trouvé pour l\'export',
                duration: 4
              });
            }
          } else if (result.successCount > 0) {
            // Some or all operations succeeded
            notification.success({
              message: 'Opération réussie',
              description: `${result.successCount} éléments traités avec succès`,
              duration: 4
            });
            
            if (result.errorCount > 0) {
              notification.warning({
                message: 'Attention',
                description: `${result.errorCount} éléments n'ont pas pu être traités`,
                duration: 6
              });
            }
          }
        } else {
          notification.error({
            message: 'Erreur',
            description: result.message || 'Opération échouée',
            duration: 4
          });
        }
        
        setSelectedRows([]);
        setShowBulkModal(false);
        
        // Always reload data to show current state (except for export)
        if (operation !== 'EXPORT_SELECTED') {
          loadCorbeilleData();
          loadExtendedCorbeilleData();
          loadAIPriorities();
        }
      } else {
        const errorData = await response.json();
        notification.error({
          message: 'Erreur serveur',
          description: errorData.message || 'Une erreur est survenue',
          duration: 4
        });
      }
    } catch (error) {
      loadingMessage();
      console.error('Bulk operation failed:', error);
      notification.error({
        message: 'Erreur de connexion',
        description: 'Impossible de contacter le serveur',
        duration: 4
      });
    }
  };
  
  // Data hooks
  const { data: bsData } = useBSList({ 
    ownerId: user?.id,
    limit: 100 
  }) as { data: { items: BSItem[] } | undefined };
  
  const { data: slaAlerts } = useSlaAlerts();
  const { data: priorities } = usePriorities(user?.id || '') as { data: PriorityBS[] | undefined };
  const { data: performance } = usePerformanceMetrics({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Computed data
  const bsList = bsData?.items || [];
  const enCoursBS = bsList.filter(bs => bs.etat === 'IN_PROGRESS' || bs.etat === 'EN_COURS');
  const traitesBS = bsList.filter(bs => bs.etat === 'VALIDATED' || bs.etat === 'TRAITE');
  const retournesBS = bsList.filter(bs => bs.etat === 'REJECTED' || bs.etat === 'RETOUR_ADMIN');
  
  // My SLA alerts
  const myOverdueBS = slaAlerts?.overdue?.filter((bs: any) => bs.ownerId === user?.id) || [];
  const myApproachingBS = slaAlerts?.approaching?.filter((bs: any) => bs.ownerId === user?.id) || [];

  // Performance metrics
  const todayProcessed = performance?.find((p: any) => p.processedById === user?.id)?._count?.id || 0;
  const monthlyTarget = 50;
  const monthlyProcessed = traitesBS.length;
  const performanceRate = monthlyTarget > 0 ? (monthlyProcessed / monthlyTarget) * 100 : 0;

  const getUrgencyLevel = (dueDate?: string) => {
    if (!dueDate) return 'normal';
    const now = new Date();
    const due = new Date(dueDate);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'urgent';
    if (hoursLeft < 72) return 'soon';
    return 'normal';
  };

  const corbeilleColumns = [
    {
      title: 'Numéro BS',
      dataIndex: 'numBs',
      key: 'numBs',
      render: (numBs: string, record: BSItem) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/bs/${record.id}`)}
          style={{ padding: 0 }}
        >
          {numBs}
        </Button>
      ),
    },
    {
      title: 'Assuré',
      dataIndex: 'nomAssure',
      key: 'nomAssure',
    },
    {
      title: 'Bénéficiaire',
      dataIndex: 'nomBeneficiaire',
      key: 'nomBeneficiaire',
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      render: (etat: string) => <BSStatusTag status={etat as any} />,
    },
    {
      title: 'Échéance',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: string) => {
        if (!dueDate) return '-';
        const urgency = getUrgencyLevel(dueDate);
        const urgencyColors = {
          overdue: 'red',
          urgent: 'red',
          soon: 'orange',
          normal: 'green'
        };
        const urgencyIcons = {
          overdue: <ExclamationCircleOutlined />,
          urgent: <WarningOutlined />,
          soon: <ClockCircleOutlined />,
          normal: <CheckCircleOutlined />
        };
        
        return (
          <Tag 
            color={urgencyColors[urgency]} 
            icon={urgencyIcons[urgency]}
          >
            {new Date(dueDate).toLocaleDateString()}
          </Tag>
        );
      },
    },
    {
      title: 'Montant',
      dataIndex: 'totalPec',
      key: 'totalPec',
      render: (amount: number) => `${amount?.toFixed(2) || 0} DT`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BSItem) => (
        <Space>
          <Button 
            size="small" 
            type="primary"
            onClick={() => navigate(`/bs/${record.id}/processing`)}
          >
            Traiter
          </Button>
          <Button 
            size="small" 
            onClick={() => handleMarkAsProcessed(record.id)}
          >
            Marquer traité
          </Button>
          <Button 
            size="small" 
            danger
            onClick={() => handleReturnToChef(record.id)}
          >
            Retourner
          </Button>
        </Space>
      ),
    },
  ];

  const prioritiesColumns = [
    {
      title: 'Priorité IA',
      key: 'priority',
      render: (_: any, record: PriorityBS, index: number) => (
        <Tag color={index < 3 ? 'red' : index < 6 ? 'orange' : 'blue'}>
          #{index + 1}
        </Tag>
      ),
    },
    ...corbeilleColumns.slice(0, -1),
    {
      title: 'Score IA',
      dataIndex: 'priority_score',
      key: 'priority_score',
      render: (score: number) => score ? score.toFixed(2) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PriorityBS) => (
        <Button 
          size="small" 
          type="primary"
          onClick={() => navigate(`/bs/${record.id}/processing`)}
        >
          Traiter
        </Button>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedRows,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedRows(selectedRowKeys as string[]);
    },
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Mon tableau de bord - Gestionnaire</h1>
      
      <Alert 
        type="warning" 
        message="Accès Gestionnaire" 
        description="Votre accès est limité aux dossiers qui vous sont personnellement affectés. Vous ne pouvez pas voir les données d'équipe ou globales."
        style={{ marginBottom: 16 }}
        showIcon 
      />
      
     
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={enCoursBS.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traités ce mois"
              value={monthlyProcessed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En retard SLA"
              value={myOverdueBS.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traités aujourd'hui"
              value={todayProcessed}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Performance mensuelle">
            <Progress
              percent={Math.min(performanceRate, 100)}
              status={performanceRate >= 100 ? 'success' : performanceRate >= 80 ? 'active' : 'exception'}
              format={() => `${monthlyProcessed}/${monthlyTarget}`}
            />
            <p style={{ marginTop: 8, color: '#666' }}>
              Objectif mensuel: {monthlyTarget} BS
            </p>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Alertes SLA">
            {myOverdueBS.length === 0 && myApproachingBS.length === 0 ? (
              <Alert type="success" message="Aucune alerte SLA" showIcon />
            ) : (
              <div>
                {myOverdueBS.length > 0 && (
                  <Alert 
                    type="error" 
                    message={`${myOverdueBS.length} BS en retard`}
                    style={{ marginBottom: 8 }}
                    showIcon 
                  />
                )}
                {myApproachingBS.length > 0 && (
                  <Alert 
                    type="warning" 
                    message={`${myApproachingBS.length} BS proches de l'échéance`}
                    showIcon 
                  />
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

    
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Corbeille Globale" style={{ background: 'linear-gradient(135deg, #ffebee 0%, #f44336 100%)', border: 'none' }}>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>📁</div>
                  <Statistic
                    title="Total Dossiers"
                    value={globalBasketData?.totalDossiers || 0}
                    valueStyle={{ color: '#d32f2f', fontSize: '32px', fontWeight: 'bold' }}
                  />
                </div>
              </Col>
              <Col span={18}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                      {globalBasketData?.typeBreakdown?.prestation || 0}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Prestation</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                      {globalBasketData?.typeBreakdown?.reclamation || 0}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Réclamation</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                      {globalBasketData?.typeBreakdown?.complement || 0}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Complément Dossier</div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Recherche & Filtres">
            <Row gutter={16} align="middle">
              <Col span={8}>
                <input
                  type="text"
                  placeholder="Rechercher par référence, GED, société, compagnie, nom, prénom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </Col>
              <Col span={6}>
                <select
                  value={selectedSociete}
                  onChange={(e) => setSelectedSociete(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option>Toutes les sociétés</option>
                  {globalBasketData?.recentDossiers?.map((d: any) => d.societe).filter((v: any, i: any, a: any) => a.indexOf(v) === i).map((societe: string) => (
                    <option key={societe} value={societe}>{societe}</option>
                  ))}
                </select>
              </Col>
              <Col span={3}>
                <Button type="primary" onClick={handleSearch} style={{ width: '100%' }}>
                  🔍 Rechercher
                </Button>
              </Col>
              <Col span={3}>
                <Button onClick={() => { setSearchQuery(''); setSearchResults([]); setSelectedSociete('Toutes les sociétés'); }} style={{ width: '100%' }}>
                  ❌ Effacer
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<ExclamationCircleOutlined />} onClick={handleBulkActions} style={{ width: '100%' }}>
                  ⚙️ Actions
                </Button>
              </Col>
            </Row>
            {searchQuery.trim() && (
              <div style={{ marginTop: 16 }}>
                <h4>Résultats de recherche ({searchResults.length})</h4>
                {searchResults.length > 0 ? (
                  <Table
                    dataSource={searchResults}
                    columns={[
                      { title: 'Référence', dataIndex: 'reference', key: 'reference' },
                      { title: 'Réf GED', dataIndex: 'gedRef', key: 'gedRef' },
                      { title: 'Société', dataIndex: 'societe', key: 'societe' },
                      { title: 'Type', dataIndex: 'type', key: 'type' },
                      { title: 'Statut', dataIndex: 'statut', key: 'statut', render: (statut) => <BSStatusTag status={statut} /> },
                      { title: 'Date', dataIndex: 'dateDepot', key: 'dateDepot', render: (date) => new Date(date).toLocaleDateString() }
                    ]}
                    pagination={{ pageSize: 5 }}
                    size="small"
                  />
                ) : (
                  <Alert type="info" message={`Aucun résultat trouvé pour '${searchQuery}'`} />
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Derniers Dossiers Ajoutés">
            <Table
              dataSource={searchResults.length > 0 ? searchResults : (globalBasketData?.recentDossiers || [])}
              columns={[
                { title: 'Réf Dossier', dataIndex: 'reference', key: 'reference' },
                { title: 'Réf GED', dataIndex: 'gedRef', key: 'gedRef' },
                { title: 'Société', dataIndex: 'societe', key: 'societe' },
                { title: 'Compagnie', dataIndex: 'compagnie', key: 'compagnie' },
                { title: 'Nom', dataIndex: 'nom', key: 'nom' },
                { title: 'Prénom', dataIndex: 'prenom', key: 'prenom' },
                { title: 'Type', dataIndex: 'type', key: 'type' },
                { title: 'Statut', dataIndex: 'statut', key: 'statut', render: (statut) => <BSStatusTag status={statut} /> },
                { title: 'Date dépôt', dataIndex: 'dateDepot', key: 'dateDepot', render: (date) => new Date(date).toLocaleDateString() },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, record: any) => (
                    <Space>
                      <Button 
                        size="small" 
                        icon={<FileTextOutlined />} 
                        onClick={() => handleViewBordereauDetails(record.id)}
                        title="Voir détails"
                      >
                        👁️
                      </Button>
                      <Button 
                        size="small" 
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleEditBordereau(record.id)}
                        title="Éditer"
                      >
                        ✏️
                      </Button>
                    </Space>
                  )
                }
              ]}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={`En cours (${corbeilleData?.assignedItems?.length || 0})`} key="corbeille">
          <Card title="Ma corbeille personnelle">
            <Table
              dataSource={corbeilleData?.assignedItems || []}
              rowSelection={rowSelection}
              columns={[
                { title: 'Référence', dataIndex: 'reference', key: 'reference' },
                { title: 'Réf GED', dataIndex: 'gedRef', key: 'gedRef' },
                { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
                { title: 'Compagnie', dataIndex: 'compagnie', key: 'compagnie' },
                { title: 'Société', dataIndex: 'societe', key: 'societe' },
                { title: 'Statut', dataIndex: 'etat', key: 'etat', render: (etat) => <BSStatusTag status={etat} /> },
                { title: 'Date dépôt', dataIndex: 'dateCreation', key: 'dateCreation', render: (date) => new Date(date).toLocaleDateString() },
                { title: 'Montant', dataIndex: 'totalPec', key: 'totalPec', render: (amount) => `${amount?.toFixed(2) || 0} DT` },
                { title: 'Actions', key: 'actions', render: (_, record: any) => (
                  <Space>
                    <Button size="small" type="primary" onClick={() => handleProcessBordereau(record.id)}>Traiter</Button>
                    <Button size="small" danger onClick={() => handleReturnToChef(record.id)}>Retourner au chef</Button>
                  </Space>
                )}
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab={`Traités (${corbeilleData?.processedItems?.length || 0})`} key="traites">
          <Card title="BS traités">
            <Table
              dataSource={corbeilleData?.processedItems || []}
              columns={[
                { title: 'Référence', dataIndex: 'reference', key: 'reference' },
                { title: 'Réf GED', dataIndex: 'gedRef', key: 'gedRef' },
                { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
                { title: 'Statut', dataIndex: 'etat', key: 'etat', render: (etat) => <BSStatusTag status={etat} /> },
                { title: 'Date dépôt', dataIndex: 'dateCreation', key: 'dateCreation', render: (date) => new Date(date).toLocaleDateString() },
                { title: 'Montant', dataIndex: 'totalPec', key: 'totalPec', render: (amount) => `${amount?.toFixed(2) || 0} DT` }
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab={`Retournés (${corbeilleData?.returnedItems?.length || 0})`} key="retournes">
          <Card title="BS retournés">
            <Table
              dataSource={corbeilleData?.returnedItems || []}
              columns={[
                { title: 'Référence', dataIndex: 'reference', key: 'reference' },
                { title: 'Réf GED', dataIndex: 'gedRef', key: 'gedRef' },
                { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
                { title: 'Compagnie', dataIndex: 'compagnie', key: 'compagnie' },
                { title: 'Société', dataIndex: 'societe', key: 'societe' },
                { title: 'Statut', dataIndex: 'etat', key: 'etat', render: (etat) => <BSStatusTag status={etat} /> },
                { title: 'Date dépôt', dataIndex: 'dateCreation', key: 'dateCreation', render: (date) => new Date(date).toLocaleDateString() },
                { title: 'Montant', dataIndex: 'totalPec', key: 'totalPec', render: (amount) => `${amount?.toFixed(2) || 0} DT` },
                { title: 'Actions', key: 'actions', render: (_, record: any) => (
                  <Space>
                    <Button size="small" type="primary" onClick={() => handleProcessBordereau(record.id)}>Traiter</Button>
                    <Button size="small" onClick={() => handleReassignToMe(record.id)}>Me réassigner</Button>
                  </Space>
                )}
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="Priorités IA" key="priorities">
          <Card 
            title="Priorités suggérées par l'IA"
            extra={
              <Tag color="blue">
                <TrophyOutlined /> Recommandations intelligentes
              </Tag>
            }
          >
            <Alert
              type="info"
              message="Ordre de traitement optimisé"
              description="L'IA analyse les SLA, l'importance client et la complexité pour suggérer l'ordre optimal de traitement."
              style={{ marginBottom: 16 }}
              showIcon
            />
            <Table
              dataSource={aiPriorities}
              columns={[
                {
                  title: 'Priorité IA',
                  key: 'priority',
                  render: (_: any, record: any, index: number) => (
                    <Tag color={index < 3 ? 'red' : index < 6 ? 'orange' : 'blue'}>
                      #{index + 1}
                    </Tag>
                  ),
                },
                { title: 'Référence', dataIndex: 'reference', key: 'reference' },
                { title: 'Assuré', dataIndex: 'nomAssure', key: 'nomAssure' },
                { title: 'Bénéficiaire', dataIndex: 'nomBeneficiaire', key: 'nomBeneficiaire' },
                { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
                { title: 'Statut', dataIndex: 'etat', key: 'etat', render: (etat: string) => <BSStatusTag status={etat as any} /> },
                { title: 'Montant', dataIndex: 'totalPec', key: 'totalPec', render: (amount: number) => `${amount?.toFixed(2) || 0} DT` },
                {
                  title: 'Score IA',
                  dataIndex: 'priority_score',
                  key: 'priority_score',
                  render: (score: number) => (
                    <Tag color={score >= 80 ? 'red' : score >= 60 ? 'orange' : 'blue'}>
                      {score?.toFixed(1) || 0}
                    </Tag>
                  ),
                },
                {
                  title: 'Raison IA',
                  dataIndex: 'aiReason',
                  key: 'aiReason',
                  render: (reason: string) => (
                    <span style={{ fontSize: '12px', color: '#666' }}>{reason}</span>
                  ),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_: any, record: any) => (
                    <Button 
                      size="small" 
                      type="primary"
                      onClick={() => handleProcessBordereau(record.id)}
                    >
                      Traiter
                    </Button>
                  ),
                },
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="Actions en lot"
        open={showBulkModal}
        onCancel={() => setShowBulkModal(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>{selectedRows.length}</strong> éléments sélectionnés</p>
        </div>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            block 
            onClick={() => {
              Modal.confirm({
                title: 'Confirmer l\'action',
                content: `Êtes-vous sûr de vouloir marquer ${selectedRows.length} éléments comme traités ?`,
                onOk: () => handleBulkOperation('MARK_PROCESSED'),
                okText: 'Confirmer',
                cancelText: 'Annuler'
              });
            }}
            disabled={selectedRows.length === 0}
          >
            ✓ Marquer tous comme traités
          </Button>
          
          <Button 
            block 
            onClick={() => {
              Modal.confirm({
                title: 'Confirmer l\'assignation',
                content: `Êtes-vous sûr de vouloir vous assigner ${selectedRows.length} éléments ?`,
                onOk: () => handleBulkOperation('ASSIGN_TO_ME'),
                okText: 'Confirmer',
                cancelText: 'Annuler'
              });
            }}
            disabled={selectedRows.length === 0}
          >
            👤 M'assigner tous
          </Button>
          
          <Button 
            danger 
            block 
            onClick={() => {
              Modal.confirm({
                title: 'Confirmer le retour',
                content: `Êtes-vous sûr de vouloir retourner ${selectedRows.length} éléments au chef d'équipe ?`,
                onOk: () => handleBulkOperation('RETURN_TO_CHEF'),
                okText: 'Confirmer',
                cancelText: 'Annuler'
              });
            }}
            disabled={selectedRows.length === 0}
          >
            ↩️ Retourner tous au chef d'équipe
          </Button>
          
          <Button 
            block 
            onClick={() => handleBulkOperation('EXPORT_SELECTED')}
            disabled={selectedRows.length === 0}
          >
            📥 Exporter la sélection
          </Button>
        </Space>
      </Modal>

      <style>{`
        .row-overdue {
          background-color: #fff2f0 !important;
        }
        .row-urgent {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};

export default GestionnaireDashboard;
*/

export {};