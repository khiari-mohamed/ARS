// Gestionnaire Senior Dashboard - Exact replica of Chef d'Équipe design but ONLY their own data
// Uses separate API endpoints: /bordereaux/gestionnaire-senior/*
import { useEffect, useState, useMemo } from "react";
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/chef-equipe.css";

interface DossierStats {
  prestation: { total: number; breakdown: { [key: string]: number } };
  adhesion: { total: number; breakdown: { [key: string]: number } };
  complement: { total: number; breakdown: { [key: string]: number } };
  resiliation: { total: number; breakdown: { [key: string]: number } };
  reclamation: { total: number; breakdown: { [key: string]: number } };
  avenant: { total: number; breakdown: { [key: string]: number } };
}

interface Dossier {
  id: string;
  reference: string;
  nom?: string;
  societe?: string;
  client?: string;
  type: string;
  statut: string;
  date: string;
  gestionnaire?: string;
  completionPercentage?: number;
  dossierStates?: string[];
  priorite?: string;
  joursEnCours?: number;
}

function GestionnaireSeniorDashboard() {
  const [stats, setStats] = useState<DossierStats>({
    prestation: { total: 0, breakdown: {} },
    adhesion: { total: 0, breakdown: {} },
    complement: { total: 0, breakdown: {} },
    resiliation: { total: 0, breakdown: {} },
    reclamation: { total: 0, breakdown: {} },
    avenant: { total: 0, breakdown: {} }
  });
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [documents, setDocuments] = useState<Dossier[]>([]);
  const [corbeille, setCorbeille] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [derniersPage, setDerniersPage] = useState(1);
  const [bordereauxPage, setBordereauxPage] = useState(1);
  const [documentsPage, setDocumentsPage] = useState(1);
  const derniersPerPage = 5;
  const bordereauxPerPage = 5;
  const documentsPerPage = 20;
  const [showRetourScanModal, setShowRetourScanModal] = useState(false);
  const [retourScanReason, setRetourScanReason] = useState('');
  const [selectedDossierForRetour, setSelectedDossierForRetour] = useState<string | null>(null);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [selectedBordereauForDoc, setSelectedBordereauForDoc] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentDossier, setCurrentDossier] = useState<any>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [seniorAssignments, setSeniorAssignments] = useState<any[]>([]);
  const { user } = useAuth();
  const [filterDerniers, setFilterDerniers] = useState({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterBordereaux, setFilterBordereaux] = useState({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterDocuments, setFilterDocuments] = useState({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' });
  const [filteredDerniersTable, setFilteredDerniersTable] = useState<Dossier[]>([]);
  const [filteredBordereauxTable, setFilteredBordereauxTable] = useState<Dossier[]>([]);
  const [filteredDocumentsTable, setFilteredDocumentsTable] = useState<Dossier[]>([]);
  const uniqueStatuts = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.statut).filter(Boolean))].sort(),
    [dossiers, documents]
  );
  const uniqueTypes = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.type).filter(Boolean))].sort(),
    [dossiers, documents]
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const f1 = dossiers.filter((d: any) =>
      (!filterDerniers.reference || String(d.reference || '').trim().toLowerCase().includes(filterDerniers.reference.trim().toLowerCase())) &&
      (!filterDerniers.client || String(d.societe || d.client || '').trim().toLowerCase().includes(filterDerniers.client.trim().toLowerCase())) &&
      (!filterDerniers.type || d.type === filterDerniers.type) &&
      (!filterDerniers.statut || d.statut === filterDerniers.statut) &&
      (!filterDerniers.dateFrom || new Date(d.date) >= new Date(filterDerniers.dateFrom)) &&
      (!filterDerniers.dateTo || new Date(d.date) <= new Date(filterDerniers.dateTo))
    );
    setFilteredDerniersTable(f1);
    setDerniersPage(1);

    const f2 = dossiers.filter((d: any) =>
      (!filterBordereaux.reference || d.reference.toLowerCase().includes(filterBordereaux.reference.toLowerCase())) &&
      (!filterBordereaux.client || (d.societe || d.client || '').toLowerCase().includes(filterBordereaux.client.toLowerCase())) &&
      (!filterBordereaux.statut || d.statut === filterBordereaux.statut) &&
      (!filterBordereaux.dateFrom || new Date(d.date) >= new Date(filterBordereaux.dateFrom)) &&
      (!filterBordereaux.dateTo || new Date(d.date) <= new Date(filterBordereaux.dateTo))
    );
    setFilteredBordereauxTable(f2);

    const f3 = documents.filter((d: any) =>
      (!filterDocuments.reference || String(d.reference || '').trim().toLowerCase().includes(filterDocuments.reference.trim().toLowerCase())) &&
      (!filterDocuments.bordereauReference || String(d.bordereauReference || '').trim().toLowerCase().includes(filterDocuments.bordereauReference.trim().toLowerCase())) &&
      (!filterDocuments.client || String(d.societe || d.client || '').trim().toLowerCase().includes(filterDocuments.client.trim().toLowerCase())) &&
      (!filterDocuments.type || d.type === filterDocuments.type) &&
      (!filterDocuments.statut || d.statut === filterDocuments.statut) &&
      (!filterDocuments.gestionnaire || (d.gestionnaire && String(d.gestionnaire).trim().toLowerCase().includes(filterDocuments.gestionnaire.trim().toLowerCase()))) &&
      (!filterDocuments.dateFrom || new Date(d.date) >= new Date(filterDocuments.dateFrom)) &&
      (!filterDocuments.dateTo || new Date(d.date) <= new Date(filterDocuments.dateTo))
    );
    setFilteredDocumentsTable(f3);
    setDocumentsPage(1);
  }, [filterDerniers, filterBordereaux, filterDocuments, dossiers, documents]);

  const handleRetourScan = (dossierId: string) => {
    setSelectedDossierForRetour(dossierId);
    setRetourScanReason('');
    setShowRetourScanModal(true);
  };

  const handleConfirmRetourScan = async () => {
    if (!selectedDossierForRetour || !retourScanReason.trim()) {
      alert('Veuillez saisir une raison pour le retour');
      return;
    }

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/return-to-scan', {
        dossierId: selectedDossierForRetour,
        reason: retourScanReason,
        setAsReturnedToScan: true
      });
      
      if (response.data.success) {
        alert('Dossier retourné vers l\'équipe Scan avec succès');
        setShowRetourScanModal(false);
        setRetourScanReason('');
        setSelectedDossierForRetour(null);
        loadDashboardData();
      } else {
        alert('Erreur lors du retour vers Scan');
      }
    } catch (error) {
      console.error('Retour scan error:', error);
      alert('Erreur lors du retour vers Scan');
    }
  };

  const handleModifyStatus = (dossier: Dossier, isDocument: boolean = false) => {
    setCurrentDossier({ ...dossier, isDocument });
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async (newStatus: string) => {
    if (!currentDossier) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/modify-dossier-status', {
        dossierId: currentDossier.id,
        newStatus
      });
      
      if (response.data.success) {
        alert('Statut modifié avec succès');
        loadDashboardData();
        setShowStatusModal(false);
        setCurrentDossier(null);
      } else {
        alert('Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Status modification error:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleAddDocument = (bordereauId: string) => {
    setSelectedBordereauForDoc(bordereauId);
    setShowAddDocumentModal(true);
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBordereauForDoc) return;

    setUploadingDocument(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bordereauId', selectedBordereauForDoc);

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/upload-document-to-bordereau', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert('Document uploadé et ajouté avec succès');
        setShowAddDocumentModal(false);
        setSelectedBordereauForDoc(null);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Upload document error:', error);
      alert('Erreur lors de l\'upload du document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, dossiersResponse, corbeilleResponse, seniorAssignmentsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/gestionnaire-senior/dashboard-stats'),
        LocalAPI.get('/bordereaux/gestionnaire-senior/dashboard-dossiers'),
        LocalAPI.get('/bordereaux/gestionnaire-senior/corbeille'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments')
      ]);
      
      console.log('📊 Stats Response:', statsResponse.data);
      console.log('📋 Dossiers Response:', dossiersResponse.data);
      console.log('📥 Corbeille Response:', corbeilleResponse.data);
      
      if (statsResponse.data) setStats(statsResponse.data);
      if (dossiersResponse.data) {
        console.log('📦 All data:', dossiersResponse.data);
        console.log('📦 First item:', dossiersResponse.data[0]);
        console.log('📦 Has isBordereau?', dossiersResponse.data[0]?.isBordereau);
        console.log('📦 Has isDocument?', dossiersResponse.data[0]?.isDocument);
        const bordereaux = dossiersResponse.data.filter((d: any) => d.isBordereau === true);
        const documents = dossiersResponse.data.filter((d: any) => d.isDocument === true);
        console.log('📦 Bordereaux filtered:', bordereaux.length, bordereaux);
        console.log('📄 Documents filtered:', documents.length, documents);
        setDossiers(bordereaux);
        setDocuments(documents);
        setFilteredDerniersTable(bordereaux);
        setFilteredBordereauxTable(bordereaux);
        setFilteredDocumentsTable(documents);
      }
      if (corbeilleResponse.data && corbeilleResponse.data.stats) {
        setCorbeille({
          traites: corbeilleResponse.data.stats.traites || 0,
          enCours: corbeilleResponse.data.stats.enCours || 0,
          nonAffectes: corbeilleResponse.data.stats.nonAffectes || 0
        });
      }
      if (seniorAssignmentsResponse.data) {
        console.log('⭐ Senior assignments received:', seniorAssignmentsResponse.data);
        setSeniorAssignments(seniorAssignmentsResponse.data);
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="chef-equipe-container">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666', fontSize: '18px' }}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: '#d52b36', color: 'white', padding: '20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Dashboard Gestionnaire Senior</h1>
        <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.9 }}>Travail autonome - Vos clients uniquement</p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {/* Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { key: 'prestation', label: 'Prestation', color: '#d52b36' },
            { key: 'adhesion', label: 'Adhésion', color: '#d52b36' },
            { key: 'complement', label: 'Complément de dossier', color: '#2196f3' },
            { key: 'resiliation', label: 'Résiliation', color: '#d52b36' },
            { key: 'reclamation', label: 'Réclamation', color: '#d52b36' },
            { key: 'avenant', label: 'Avenant', color: '#d52b36' }
          ].map(({ key, label, color }) => (
            <div key={key} style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{label}</h3>
                <span style={{ background: color, color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                  {stats[key as keyof DossierStats]?.total || 0}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {Object.entries(stats[key as keyof DossierStats]?.breakdown || {}).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{k}:</span> <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* My Senior Assignment Stats */}
        <div style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(76,175,80,0.2)', border: '2px solid #4caf50' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⭐</span>
              Mes Affectations Senior
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {seniorAssignments
              .filter(assignment => assignment.gestionnaire === user?.fullName)
              .map((assignment, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '8px', padding: '14px', border: '2px solid #4caf50', boxShadow: '0 2px 6px rgba(76,175,80,0.15)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>👤</span>
                  {assignment.gestionnaire}
                </div>
                <div style={{ fontSize: '13px', color: '#388e3c', marginBottom: '8px', fontWeight: '600' }}>
                  <strong>Total affectés:</strong> {assignment.totalAssigned}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#4caf50', fontWeight: '500' }}>✓ Traités:</span>
                    <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>{assignment.traites || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#ff9800', fontWeight: '500' }}>⏳ En cours:</span>
                    <span style={{ fontWeight: 'bold', color: '#f57c00' }}>{assignment.enCours || 0}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: '4px' }}>
                      <span style={{ color: '#dc3545', fontWeight: '500' }}>↩ Retournés:</span>
                      <span style={{ fontWeight: 'bold', color: '#c62828' }}>{assignment.retournes || 0}</span>
                    </div>
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold', marginLeft: '16px', marginTop: '2px', background: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>
                        → Retourné par: {assignment.returnedBy}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#388e3c', background: '#e8f5e9', padding: '6px 8px', borderRadius: '4px', marginTop: '8px' }}>
                  <strong>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
            {seniorAssignments.filter(a => a.gestionnaire === user?.fullName).length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#66bb6a', fontSize: '14px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📋</div>
                <p style={{ margin: 0 }}>Aucune affectation pour le moment</p>
              </div>
            )}
          </div>
        </div>

        {/* Corbeille Stats */}
        {corbeille && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>📥 Ma Corbeille</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Bordereaux Traités</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{corbeille.traites || 0}</div>
              </div>
              <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Bordereaux En Cours</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{corbeille.enCours || 0}</div>
              </div>
              {/* Gestionnaire Senior works autonomously - no "Non Affectés" needed */}
              {/* <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Dossiers Non Affectés</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>{corbeille.nonAffectes || 0}</div>
              </div> */}
            </div>
          </div>
        )}

        {/* Derniers Bordereaux Ajoutés */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Derniers Bordereaux Ajoutés</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <input type="text" placeholder="Référence" value={filterDerniers.reference} onChange={(e) => setFilterDerniers({...filterDerniers, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterDerniers.client} onChange={(e) => setFilterDerniers({...filterDerniers, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterDerniers.type} onChange={(e) => setFilterDerniers({...filterDerniers, type: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDerniers.statut} onChange={(e) => setFilterDerniers({...filterDerniers, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" placeholder="Date début" value={filterDerniers.dateFrom} onChange={(e) => setFilterDerniers({...filterDerniers, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterDerniers.dateTo} onChange={(e) => setFilterDerniers({...filterDerniers, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDerniers({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Référence</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>% Finalisation</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>États Dossiers</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDerniersTable.slice((derniersPage - 1) * derniersPerPage, derniersPage * derniersPerPage).map((dossier, index) => {
                  // Use dynamic completion percentage from backend
                  const completionPercentage = dossier.completionPercentage || 0;
                  // Use dynamic states from backend
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  return (
                    <tr key={`recent-${dossier.id}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client || dossier.societe || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.type}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates.length > 0 ? dossierStates.map((state, idx) => {
                            const count = (dossier as any).dossierStateCounts?.[state];
                            const total = (dossier as any).totalDocs;
                            return (
                              <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                                {state} {count && total ? `${count}/${total}` : ''}
                              </span>
                            );
                          }) : <span style={{ fontSize: '12px', color: '#999' }}>-</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.date}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <button 
                          onClick={() => handleModifyStatus(dossier, false)}
                          style={{ 
                            background: '#9c27b0', 
                            color: 'white', 
                            border: 'none', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ✏️ Statut
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredDerniersTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setDerniersPage(prev => Math.max(1, prev - 1))}
                disabled={derniersPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: derniersPage === 1 ? '#f5f5f5' : 'white',
                  color: derniersPage === 1 ? '#999' : '#333',
                  cursor: derniersPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {derniersPage} sur {Math.ceil(filteredDerniersTable.length / derniersPerPage)}
              </span>
              <button
                onClick={() => setDerniersPage(prev => Math.min(Math.ceil(filteredDerniersTable.length / derniersPerPage), prev + 1))}
                disabled={derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? '#f5f5f5' : 'white',
                  color: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? '#999' : '#333',
                  cursor: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Bordereaux */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Bordereaux</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <input type="text" placeholder="Référence" value={filterBordereaux.reference} onChange={(e) => setFilterBordereaux({...filterBordereaux, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterBordereaux.client} onChange={(e) => setFilterBordereaux({...filterBordereaux, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterBordereaux.statut} onChange={(e) => setFilterBordereaux({...filterBordereaux, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" placeholder="Date début" value={filterBordereaux.dateFrom} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterBordereaux.dateTo} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterBordereaux({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Référence</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Statut</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>% Finalisation</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>États Dossiers</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Priorité</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereauxTable.slice((bordereauxPage - 1) * bordereauxPerPage, bordereauxPage * bordereauxPerPage).map((dossier, index) => {
                  // Use dynamic completion percentage from backend
                  const completionPercentage = dossier.completionPercentage || 0;
                  // Use dynamic states from backend
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const getPriorityColor = (priorite?: string) => {
                    switch (priorite) {
                      case 'Très': case 'Élevée': return '#f44336';
                      case 'Moyenne': return '#ff9800';
                      default: return '#4caf50';
                    }
                  };
                  return (
                    <tr key={`bordereau-${dossier.id}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client || dossier.societe || 'N/A'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ background: dossier.statut === 'Traité' ? '#4caf50' : dossier.statut === 'En cours' ? '#ff9800' : '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dossier.statut}</span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates.map((state, idx) => {
                            const count = (dossier as any).dossierStateCounts?.[state];
                            const total = (dossier as any).totalDocs;
                            return (
                              <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                                {state} {count && total ? `${count}/${total}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ 
                          background: getPriorityColor(dossier.priorite), 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          {dossier.priorite || 'Normale'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleRetourScan(dossier.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#9c27b0', textDecoration: 'underline' }} title="Retour Scan">Retour Scan</button>
                          <button onClick={() => handleAddDocument(dossier.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4caf50', textDecoration: 'underline' }} title="Ajouter Document">+ Doc</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredBordereauxTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setBordereauxPage(prev => Math.max(1, prev - 1))}
                disabled={bordereauxPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: bordereauxPage === 1 ? '#f5f5f5' : 'white',
                  color: bordereauxPage === 1 ? '#999' : '#333',
                  cursor: bordereauxPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {bordereauxPage} sur {Math.ceil(filteredBordereauxTable.length / bordereauxPerPage)}
              </span>
              <button
                onClick={() => setBordereauxPage(prev => Math.min(Math.ceil(filteredBordereauxTable.length / bordereauxPerPage), prev + 1))}
                disabled={bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? '#f5f5f5' : 'white',
                  color: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? '#999' : '#333',
                  cursor: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers Individuels */}
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Dossiers Individuels</h3>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Affichage par dossier (non par bordereau)</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px', padding: '12px', background: '#f8f9fa' }}>
            <input type="text" placeholder="Réf. Dossier" value={filterDocuments.reference} onChange={(e) => setFilterDocuments({...filterDocuments, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Réf. Bordereau" value={filterDocuments.bordereauReference} onChange={(e) => setFilterDocuments({...filterDocuments, bordereauReference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterDocuments.client} onChange={(e) => setFilterDocuments({...filterDocuments, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterDocuments.type} onChange={(e) => setFilterDocuments({...filterDocuments, type: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDocuments.statut} onChange={(e) => setFilterDocuments({...filterDocuments, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Gestionnaire" value={filterDocuments.gestionnaire} onChange={(e) => setFilterDocuments({...filterDocuments, gestionnaire: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date début" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#d52b36', color: 'white' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Réf. Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Réf. Bordereau</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Statut Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Gestionnaire</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((documentsPage - 1) * documentsPerPage, documentsPage * documentsPerPage).map((document, index) => (
                  <tr key={document.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{document.reference}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#9c27b0' }}>{(document as any).bordereauReference || 'N/A'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.client || document.societe || 'N/A'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.type}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        background: document.statut === 'Traité' ? '#4caf50' : document.statut === 'En cours' ? '#ff9800' : '#2196f3', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}>
                        {document.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.gestionnaire || 'Non assigné'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.date}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button 
                          onClick={async () => {
                            try {
                              const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${document.id}`);
                              if (response.data.success && response.data.hasDocument) {
                                const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
                                setPdfUrl(`${serverBaseUrl}${response.data.pdfUrl}`);
                                setCurrentDossier(document);
                                setShowPdfModal(true);
                              } else {
                                alert(response.data.error || 'PDF non disponible pour ce dossier');
                              }
                            } catch (error) {
                              console.error('PDF view error:', error);
                              alert('Erreur lors de l\'ouverture du PDF');
                            }
                          }}
                          style={{ 
                            background: '#2196f3', 
                            color: 'white', 
                            border: 'none', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          📄 Voir PDF
                        </button>
                        <button 
                          onClick={() => handleModifyStatus(document, true)}
                          style={{ 
                            background: '#9c27b0', 
                            color: 'white', 
                            border: 'none', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ✏️ Statut
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Êtes-vous sûr de vouloir retirer ce document ?')) {
                              try {
                                await LocalAPI.post('/bordereaux/chef-equipe/remove-document-from-bordereau', { documentId: document.id });
                                alert('Document retiré avec succès');
                                loadDashboardData();
                              } catch (err) {
                                console.error('Error removing document:', err);
                                alert('Erreur lors du retrait');
                              }
                            }
                          }}
                          style={{ 
                            background: '#f44336', 
                            color: 'white', 
                            border: 'none', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          🗑️ Retirer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDocumentsTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setDocumentsPage(prev => Math.max(1, prev - 1))}
                disabled={documentsPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: documentsPage === 1 ? '#f5f5f5' : 'white',
                  color: documentsPage === 1 ? '#999' : '#333',
                  cursor: documentsPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {documentsPage} sur {Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
              </span>
              <button
                onClick={() => setDocumentsPage(prev => Math.min(Math.ceil(filteredDocumentsTable.length / documentsPerPage), prev + 1))}
                disabled={documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? '#f5f5f5' : 'white',
                  color: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? '#999' : '#333',
                  cursor: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Retour Scan Modal */}
      {showRetourScanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                ↩️ Retour vers l'équipe Scan
              </h3>
              <button
                onClick={() => setShowRetourScanModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#333'
              }}>
                Raison du retour vers l'équipe Scan:
              </label>
              <textarea
                value={retourScanReason}
                onChange={(e) => setRetourScanReason(e.target.value)}
                placeholder="Veuillez expliquer la raison du retour..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowRetourScanModal(false)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRetourScan}
                disabled={!retourScanReason.trim()}
                style={{
                  background: retourScanReason.trim() ? '#d52b36' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: retourScanReason.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Confirmer le retour
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Document Modal */}
      {showAddDocumentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                📎 Ajouter un Document
              </h3>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#333'
              }}>
                Sélectionner un fichier:
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUploadDocument}
                disabled={uploadingDocument}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer'
                }}
              />
              {uploadingDocument && (
                <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <p>Upload en cours...</p>
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                disabled={uploadingDocument}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* PDF Viewer Modal */}
      {showPdfModal && pdfUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1004,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            height: '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  {currentDossier?.reference} - {currentDossier?.client || currentDossier?.societe}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                  Type: {currentDossier?.type} | Statut: {currentDossier?.statut}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfUrl(null);
                  setCurrentDossier(null);
                }}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Fermer
              </button>
            </div>
            
            {/* PDF Viewer */}
            <div style={{ flex: 1, padding: '16px' }}>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  title="PDF Viewer"
                />
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  fontSize: '18px',
                  color: '#666'
                }}>
                  Chargement du PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Status Modification Modal */}
      {showStatusModal && currentDossier && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1003,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                ✏️ Modifier le Statut
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                {currentDossier.isDocument ? 'Document' : 'Bordereau'}: <strong>{currentDossier.reference}</strong><br/>
                Client: <strong>{currentDossier.client || currentDossier.societe || 'N/A'}</strong><br/>
                Statut actuel: <strong>{currentDossier.statut}</strong>
              </p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {(currentDossier.isDocument 
                  ? ['Nouveau', 'En cours', 'Traité', 'Rejeté', 'Retourné']
                  : ['Nouveau', 'En cours', 'Traité']
                ).map(status => (
                  <button
                    key={status}
                    onClick={() => handleConfirmStatusChange(status)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                      e.currentTarget.style.borderColor = '#d52b36';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {status === 'Nouveau' ? '🆕' : status === 'En cours' ? '⏳' : status === 'Traité' ? '✅' : status === 'Rejeté' ? '❌' : '↩️'} {status}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionnaireSeniorDashboard;
