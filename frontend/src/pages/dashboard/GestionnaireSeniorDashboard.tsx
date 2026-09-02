import { useEffect, useState, useMemo, useCallback } from "react";
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
  bordereauReference?: string;
  statutRaw?: string;
  bordereauStatutRaw?: string;
  bordereauId?: string;
}

const LOCKED_STATUT_RAW = 'VIREMENT_EXECUTE';

// A row is locked if its own raw statut, or its parent bordereau's raw statut, is VIREMENT_EXECUTE.
const isRowLocked = (row: Partial<Dossier> | null | undefined): boolean => {
  if (!row) return false;
  return row.statutRaw === LOCKED_STATUT_RAW || row.bordereauStatutRaw === LOCKED_STATUT_RAW;
};

// Merges the "Nouveau" and "En cours" raw statuses into a single filterable/displayed
// bucket "En cours". Applied consistently across every table's status filter so the
// dropdown option "En cours" always matches both underlying values.
const matchesStatutFilter = (rowStatut: string | undefined, selected: string) => {
  if (!selected) return true;
  if (selected === 'En cours') return rowStatut === 'Nouveau' || rowStatut === 'En cours';
  return rowStatut === selected;
};

const DOC_TYPE_META: { key: keyof DossierStats; label: string; docType: string }[] = [
  { key: 'prestation', label: 'Prestation', docType: 'BULLETIN_SOIN' },
  { key: 'adhesion', label: 'Adhésion', docType: 'ADHESION' },
  { key: 'complement', label: "Complément d'information", docType: 'COMPLEMENT_INFORMATION' },
  { key: 'resiliation', label: 'Résiliation', docType: 'DEMANDE_RESILIATION' },
  { key: 'reclamation', label: 'Réclamation', docType: 'RECLAMATION' },
  { key: 'avenant', label: 'Avenant', docType: 'CONTRAT_AVENANT' },
];

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
  const [selectedFilesForUpload, setSelectedFilesForUpload] = useState<File[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentDossier, setCurrentDossier] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const [loadingPdfDocId, setLoadingPdfDocId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [seniorAssignments, setSeniorAssignments] = useState<any[]>([]);
  const [reassignedDocuments, setReassignedDocuments] = useState<any[]>([]);
  const [loadingReassigned, setLoadingReassigned] = useState(false);
  const { user } = useAuth();

  // Actions menu states
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const [showRemplacerModal, setShowRemplacerModal] = useState(false);
  const [showReaffecterModal, setShowReaffecterModal] = useState(false);
  const [selectedDocForAction, setSelectedDocForAction] = useState<any>(null);
  const [remplacerFile, setRemplacerFile] = useState<File | null>(null);
  const [uploadingRemplacer, setUploadingRemplacer] = useState(false);
  const [showRetirerConfirmModal, setShowRetirerConfirmModal] = useState(false);

  // Réaffectation states
  const [selectedDocsForReaffect, setSelectedDocsForReaffect] = useState<string[]>([]);
  const [targetBordereauId, setTargetBordereauId] = useState<string>('');
  const [reaffectingDocs, setReaffectingDocs] = useState(false);
  const [filterDerniers, setFilterDerniers] = useState({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterBordereaux, setFilterBordereaux] = useState({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterDocuments, setFilterDocuments] = useState({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' });

  const uniqueStatuts = useMemo(() =>
    [...new Set([...dossiers, ...documents].map((d: any) => d.statut).filter(Boolean))].sort(),
    [dossiers, documents]
  );
  const uniqueDocumentStatuts = useMemo(() => {
    const statuts = [...new Set(documents.map((d: any) => d.statut).filter(Boolean))];
    const mappedStatuts = statuts.map(s => s === 'Nouveau' ? 'En cours' : s);
    return [...new Set(mappedStatuts)].sort();
  }, [documents]);
  const uniqueTypes = useMemo(() =>
    [...new Set([...dossiers, ...documents].map((d: any) => d.type).filter(Boolean))].sort(),
    [dossiers, documents]
  );

  // Filtered tables are derived with useMemo instead of an effect + setState pair:
  // avoids the extra render pass the previous effect-based approach triggered on every
  // filter keystroke and on every dossiers/documents reload.
  const filteredDerniersTable = useMemo(() => dossiers.filter((d: any) =>
    (!filterDerniers.reference || String(d.reference || '').trim().toLowerCase().includes(filterDerniers.reference.trim().toLowerCase())) &&
    (!filterDerniers.client || String(d.societe || d.client || '').trim().toLowerCase().includes(filterDerniers.client.trim().toLowerCase())) &&
    (!filterDerniers.type || d.type === filterDerniers.type) &&
    matchesStatutFilter(d.statut, filterDerniers.statut) &&
    (!filterDerniers.dateFrom || new Date(d.date) >= new Date(filterDerniers.dateFrom)) &&
    (!filterDerniers.dateTo || new Date(d.date) <= new Date(filterDerniers.dateTo))
  ), [dossiers, filterDerniers]);

  const filteredBordereauxTable = useMemo(() => dossiers.filter((d: any) =>
    (!filterBordereaux.reference || d.reference.toLowerCase().includes(filterBordereaux.reference.toLowerCase())) &&
    (!filterBordereaux.client || (d.societe || d.client || '').toLowerCase().includes(filterBordereaux.client.toLowerCase())) &&
    matchesStatutFilter(d.statut, filterBordereaux.statut) &&
    (!filterBordereaux.dateFrom || new Date(d.date) >= new Date(filterBordereaux.dateFrom)) &&
    (!filterBordereaux.dateTo || new Date(d.date) <= new Date(filterBordereaux.dateTo))
  ), [dossiers, filterBordereaux]);

  const filteredDocumentsTable = useMemo(() => documents.filter((d: any) => {
    const refMatch = !filterDocuments.reference || String(d.reference || '').trim().toLowerCase().includes(filterDocuments.reference.trim().toLowerCase());
    const bordRefMatch = !filterDocuments.bordereauReference || String(d.bordereauReference || '').trim().toLowerCase().includes(filterDocuments.bordereauReference.trim().toLowerCase());
    const clientSearchTerm = filterDocuments.client.trim().toLowerCase();
    const clientMatch = !filterDocuments.client ||
      String(d.societe || d.client || '').trim().toLowerCase().includes(clientSearchTerm) ||
      String(d.bordereauReference || '').trim().toLowerCase().includes(clientSearchTerm);
    const typeMatch = !filterDocuments.type || d.type === filterDocuments.type;
    const statutMatch = matchesStatutFilter(d.statut, filterDocuments.statut);
    const gestMatch = !filterDocuments.gestionnaire || (d.gestionnaire && String(d.gestionnaire).trim().toLowerCase().includes(filterDocuments.gestionnaire.trim().toLowerCase()));
    const dateFromMatch = !filterDocuments.dateFrom || new Date(d.date) >= new Date(filterDocuments.dateFrom);
    const dateToMatch = !filterDocuments.dateTo || new Date(d.date) <= new Date(filterDocuments.dateTo);
    return refMatch && bordRefMatch && clientMatch && typeMatch && statutMatch && gestMatch && dateFromMatch && dateToMatch;
  }), [documents, filterDocuments]);

  // Reset pagination whenever the active filter set for a table changes (matches
  // previous behavior) without re-running the (now memoized) filtering itself.
  useEffect(() => { setDerniersPage(1); }, [filterDerniers]);
  useEffect(() => { setDocumentsPage(1); }, [filterDocuments]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showActionsMenu && !target.closest('[data-actions-menu]')) {
        setShowActionsMenu(null);
        setSelectedDocForAction(null);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionsMenu]);

  const handleRetourScan = useCallback((dossierId: string) => {
    setSelectedDossierForRetour(dossierId);
    setRetourScanReason('');
    setShowRetourScanModal(true);
  }, []);

  const handleConfirmRetourScan = async () => {
    if (!selectedDossierForRetour || !retourScanReason.trim()) {
      alert('Veuillez saisir une raison pour le retour');
      return;
    }

    try {
      const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/return-to-scan', {
        dossierId: selectedDossierForRetour,
        reason: retourScanReason
      });

      if (response.data.success) {
        alert('Dossier retourné vers l\'équipe Scan avec succès. Les statuts des BS déjà traités sont conservés.');
        setShowRetourScanModal(false);
        setRetourScanReason('');
        setSelectedDossierForRetour(null);
        loadDashboardData();
      } else {
        alert(response.data.message || 'Erreur lors du retour vers Scan');
      }
    } catch (error: any) {
      console.error('Retour scan error:', error);
      alert(error.response?.data?.message || 'Erreur lors du retour vers Scan');
    }
  };

  const handleModifyStatus = useCallback((dossier: Dossier, isDocument: boolean = false) => {
    if (isRowLocked(dossier)) {
      alert('Action impossible: le virement a déjà été exécuté pour ce bordereau.');
      return;
    }
    setCurrentDossier({ ...dossier, isDocument });
    setShowStatusModal(true);
  }, []);

  const handleConfirmStatusChange = async (newStatus: string) => {
    if (!currentDossier) return;

    const currentScrollPosition = window.scrollY;
    const docId = currentDossier.id;

    try {
      const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/modify-dossier-status', {
        dossierId: currentDossier.id,
        newStatus
      });

      if (response.data.success) {
        setShowStatusModal(false);
        setCurrentDossier(null);
        setSuccessMessage('Statut modifié avec succès');
        setShowSuccessModal(true);

        setTimeout(() => setShowSuccessModal(false), 3000);

        await loadDashboardData();

        setTimeout(() => {
          window.scrollTo(0, currentScrollPosition);
          setHighlightedDocId(docId);
          setTimeout(() => setHighlightedDocId(null), 3000);
        }, 100);
      } else {
        alert(response.data.message || 'Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      console.error('Status modification error:', error);
      alert(error.response?.data?.message || 'Erreur lors de la modification du statut');
    }
  };

  const handleAddDocument = useCallback((dossier: Dossier) => {
    if (isRowLocked(dossier)) {
      alert('Action impossible: le virement a déjà été exécuté pour ce bordereau.');
      return;
    }
    setSelectedBordereauForDoc(dossier.id);
    setShowAddDocumentModal(true);
  }, []);

  const handleOpenActionsMenu = (doc: any, event: React.MouseEvent) => {
    if (isRowLocked(doc)) {
      return;
    }
    setSelectedDocForAction(doc);
    setShowActionsMenu(doc.id);

    const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
      setActionsMenuPosition('top');
    } else {
      setActionsMenuPosition('bottom');
    }
  };

  const handleCloseActionsMenu = () => {
    setShowActionsMenu(null);
    setSelectedDocForAction(null);
  };

  const handleRetirerFromMenu = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedDocForAction) return;
    setShowActionsMenu(null);
    setShowRetirerConfirmModal(true);
  };

  const handleConfirmRetirer = async () => {
    if (!selectedDocForAction) return;
    try {
      await LocalAPI.post('/bordereaux/chef-equipe/remove-document-from-bordereau', { documentId: selectedDocForAction.id });
      setShowRetirerConfirmModal(false);
      setSelectedDocForAction(null);
      setSuccessMessage('Document retiré avec succès');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
      loadDashboardData();
    } catch (err: any) {
      console.error('Error removing document:', err);
      alert(err.response?.data?.message || 'Erreur lors du retrait');
      setShowRetirerConfirmModal(false);
    }
  };

  const handleRemplacerClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleCloseActionsMenu();
    setShowRemplacerModal(true);
  };

  const handleReaffecterClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleCloseActionsMenu();
    setSelectedDocsForReaffect([selectedDocForAction.id]);
    setShowReaffecterModal(true);
  };

  const handleRemplacerUpload = async () => {
    if (!remplacerFile || !selectedDocForAction) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setUploadingRemplacer(true);
    const formData = new FormData();
    formData.append('file', remplacerFile);
    formData.append('documentId', selectedDocForAction.id);

    try {
      const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/remplacer-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert('Document remplacé avec succès');
        setShowRemplacerModal(false);
        setRemplacerFile(null);
        setSelectedDocForAction(null);
        loadDashboardData();
      }
    } catch (error: any) {
      console.error('Remplacer document error:', error);
      alert(error.response?.data?.message || 'Erreur lors du remplacement du document');
    } finally {
      setUploadingRemplacer(false);
    }
  };

  const handleReaffecterDocuments = async () => {
    if (!targetBordereauId || selectedDocsForReaffect.length === 0) {
      alert('Veuillez sélectionner un bordereau de destination');
      return;
    }

    setReaffectingDocs(true);
    try {
      const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/reaffecter-documents', {
        documentIds: selectedDocsForReaffect,
        targetBordereauId
      });

      if (response.data.success) {
        alert(`${selectedDocsForReaffect.length} document(s) réaffecté(s) avec succès`);
        setShowReaffecterModal(false);
        setSelectedDocsForReaffect([]);
        setTargetBordereauId('');
        setSelectedDocForAction(null);
        loadDashboardData();
      }
    } catch (error: any) {
      console.error('Réaffecter documents error:', error);
      alert(error.response?.data?.message || 'Erreur lors de la réaffectation');
    } finally {
      setReaffectingDocs(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocsForReaffect(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Bordereaux eligible as a réaffectation target: must belong to the senior's own
  // portfolio and must not be locked by an executed virement.
  const seniorBordereaux = useMemo(
    () => dossiers.filter((d: any) => d.isBordereau === true && !isRowLocked(d)),
    [dossiers]
  );

  const handleUploadDocument = async () => {
    if (!selectedBordereauForDoc || selectedFilesForUpload.length === 0) return;

    setUploadingDocument(true);
    const formData = new FormData();
    // Every selected file is appended under the same "files" key — the backend
    // accepts an unlimited number of them and creates one document per file.
    selectedFilesForUpload.forEach((file) => formData.append('files', file));
    formData.append('bordereauId', selectedBordereauForDoc);

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/upload-document-to-bordereau', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert(`${response.data.count || selectedFilesForUpload.length} document(s) uploadé(s) et ajouté(s) avec succès`);
        setShowAddDocumentModal(false);
        setSelectedBordereauForDoc(null);
        setSelectedFilesForUpload([]);
        loadDashboardData();
      }
    } catch (error: any) {
      console.error('Upload document error:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'upload du document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const timestamp = Date.now();
      const [statsResponse, dossiersResponse, corbeilleResponse, seniorAssignmentsResponse] = await Promise.all([
        LocalAPI.get(`/bordereaux/gestionnaire-senior/dashboard-stats?t=${timestamp}`),
        LocalAPI.get(`/bordereaux/gestionnaire-senior/dashboard-dossiers?t=${timestamp}`),
        LocalAPI.get(`/bordereaux/gestionnaire-senior/corbeille?t=${timestamp}`),
        LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments?t=${timestamp}`)
      ]);

      if (statsResponse.data) setStats(statsResponse.data);
      if (dossiersResponse.data) {
        const bordereaux = dossiersResponse.data.filter((d: any) => d.isBordereau === true);
        const documents = dossiersResponse.data.filter((d: any) => d.isDocument === true);

        setDossiers(bordereaux);
        setDocuments(documents);
      }
      if (corbeilleResponse.data && corbeilleResponse.data.stats) {
        setCorbeille({
          traites: corbeilleResponse.data.stats.traites || 0,
          enCours: corbeilleResponse.data.stats.enCours || 0,
          nonAffectes: corbeilleResponse.data.stats.nonAffectes || 0
        });
      }
      if (seniorAssignmentsResponse.data) {
        setSeniorAssignments(seniorAssignmentsResponse.data);
      }

      if (user?.id) {
        loadReassignedDocuments();
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReassignedDocuments = async () => {
    if (!user?.id) return;

    try {
      setLoadingReassigned(true);
      const response = await LocalAPI.get(`/super-admin/gestionnaire-senior/reassigned-documents?userId=${user.id}`);
      if (response.data.success) {
        setReassignedDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load reassigned documents:', error);
    } finally {
      setLoadingReassigned(false);
    }
  };

  if (loading) {
    return (
      <div className="gsd-root">
        <style>{GSD_STYLES}</style>
        <div className="gsd-loading">
          <div className="gsd-loading__spinner" />
          <p>Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  const derniersTotalPages = Math.max(1, Math.ceil(filteredDerniersTable.length / derniersPerPage));
  const bordereauxTotalPages = Math.max(1, Math.ceil(filteredBordereauxTable.length / bordereauxPerPage));
  const documentsTotalPages = Math.max(1, Math.ceil(filteredDocumentsTable.length / documentsPerPage));

  return (
    <div className="gsd-root">
      <style>{GSD_STYLES}</style>

      <header className="gsd-header">
        <div className="gsd-header__inner">
          <span className="gsd-header__eyebrow">Espace autonome</span>
          <h1>Tableau de bord — Gestionnaire Senior</h1>
          <p>Travail autonome · portefeuille de clients qui vous sont assignés</p>
        </div>
      </header>

      <div className="gsd-wrap">
        {/* Statistics Cards */}
        <section className="gsd-stats-grid" aria-label="Répartition par type de dossier">
          {DOC_TYPE_META.map(({ key, label, docType }) => {
            const reassignedCount = reassignedDocuments.filter(d => d.type === docType).length;
            const breakdown = stats[key]?.breakdown || {};
            return (
              <div key={key} className="gsd-stat-card">
                <div className="gsd-stat-card__head">
                  <h3>{label}</h3>
                  <div className="gsd-stat-card__badges">
                    <span className="gsd-stat-card__count">{stats[key]?.total || 0}</span>
                    {reassignedCount > 0 && (
                      <span className="gsd-stat-card__reassigned" title="Documents réaffectés">
                        +{reassignedCount} ↻
                      </span>
                    )}
                  </div>
                </div>
                <div className="gsd-stat-card__breakdown">
                  {Object.entries(breakdown).length === 0 && <span className="gsd-muted">Aucune donnée</span>}
                  {Object.entries(breakdown).map(([k, v]) => (
                    <div key={k} className="gsd-stat-card__row">
                      <span>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <div className="gsd-two-col">
          {/* My Senior Assignment Stats */}
          <section className="gsd-panel gsd-panel--green">
            <div className="gsd-panel__head">
              <h3><span className="gsd-panel__icon">★</span> Mes affectations senior</h3>
            </div>
            <div className="gsd-assignments-grid">
              {seniorAssignments
                .filter(assignment => assignment.gestionnaire === user?.fullName)
                .map((assignment, index) => (
                <div key={index} className="gsd-assignment-card">
                  <div className="gsd-assignment-card__name">{assignment.gestionnaire}</div>
                  <div className="gsd-assignment-card__total">
                    <span>Total affectés : <strong>{assignment.totalAssigned}</strong></span>
                    {reassignedDocuments.length > 0 && (
                      <span className="gsd-chip gsd-chip--blue" title="Documents réaffectés (non inclus dans le total)">
                        +{reassignedDocuments.length} ↻ réaffectés
                      </span>
                    )}
                  </div>
                  <div className="gsd-assignment-card__metrics">
                    <div className="gsd-metric-row gsd-metric-row--ok">
                      <span>✓ Traités</span><strong>{assignment.traites || 0}</strong>
                    </div>
                    <div className="gsd-metric-row gsd-metric-row--warn">
                      <span>⏳ En cours</span><strong>{assignment.enCours || 0}</strong>
                    </div>
                    <div className="gsd-metric-row gsd-metric-row--danger">
                      <span>↩ Retournés</span><strong>{assignment.retournes || 0}</strong>
                    </div>
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div className="gsd-assignment-card__returnedby">→ Retourné par : {assignment.returnedBy}</div>
                    )}
                  </div>
                  <div className="gsd-assignment-card__types">
                    <strong>Par type : </strong>
                    {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                  </div>
                </div>
              ))}
              {seniorAssignments.filter(a => a.gestionnaire === user?.fullName).length === 0 && (
                <div className="gsd-empty gsd-empty--green">
                  <div className="gsd-empty__icon">▢</div>
                  <p>Aucune affectation pour le moment</p>
                </div>
              )}
            </div>
          </section>

          {/* Reassigned Documents Section */}
          <section className="gsd-panel gsd-panel--blue">
            <div className="gsd-panel__head">
              <h3><span className="gsd-panel__icon">↻</span> Documents réaffectés à moi</h3>
              <button
                onClick={loadReassignedDocuments}
                disabled={loadingReassigned}
                className="gsd-btn gsd-btn--sm gsd-btn--blue"
              >
                {loadingReassigned ? 'Chargement…' : '↻ Actualiser'}
              </button>
            </div>

            {loadingReassigned ? (
              <div className="gsd-empty gsd-empty--blue">
                <div className="gsd-empty__icon">◔</div>
                <p>Chargement des documents réaffectés…</p>
              </div>
            ) : reassignedDocuments.length === 0 ? (
              <div className="gsd-empty gsd-empty--blue">
                <div className="gsd-empty__icon">⬜</div>
                <p>Aucun document réaffecté pour le moment</p>
              </div>
            ) : (
              <div className="gsd-reassigned-body">
                <div className="gsd-reassigned-summary">
                  <span>Total : {reassignedDocuments.length} document(s)</span>
                  <div className="gsd-reassigned-summary__tags">
                    <span className="gsd-tag gsd-tag--danger">En retard : {reassignedDocuments.filter(d => d.isOverdue).length}</span>
                    <span className="gsd-tag gsd-tag--ok">À jour : {reassignedDocuments.filter(d => !d.isOverdue).length}</span>
                  </div>
                </div>

                <div className="gsd-table-scroll">
                  <table className="gsd-table gsd-table--blue">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Bordereau</th>
                        <th>Client</th>
                        <th>Assigné le</th>
                        <th>Statut</th>
                        <th>Délai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reassignedDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td className="gsd-cell--ref">{doc.name}</td>
                          <td><span className="gsd-chip gsd-chip--blue">{doc.type}</span></td>
                          <td className="gsd-muted">{doc.bordereauReference}</td>
                          <td>{doc.clientName}</td>
                          <td className="gsd-muted">{doc.assignedAt ? new Date(doc.assignedAt).toLocaleDateString('fr-FR') : 'N/A'}</td>
                          <td>
                            <span className={`gsd-status gsd-status--${doc.status === 'TRAITE' ? 'ok' : doc.status === 'EN_COURS' ? 'warn' : 'info'}`}>
                              {doc.status || 'NOUVEAU'}
                            </span>
                          </td>
                          <td>
                            {doc.isOverdue ? (
                              <span className="gsd-tag gsd-tag--danger">En retard</span>
                            ) : doc.remainingDays !== undefined ? (
                              <span className={`gsd-tag ${doc.remainingDays <= 3 ? 'gsd-tag--warn' : 'gsd-tag--ok'}`}>{doc.remainingDays}j restants</span>
                            ) : (
                              <span className="gsd-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Corbeille Stats */}
        {corbeille && (
          <section className="gsd-panel">
            <div className="gsd-panel__head"><h3>Ma corbeille</h3></div>
            <div className="gsd-corbeille-grid">
              <div className="gsd-corbeille-card">
                <div className="gsd-corbeille-card__label">Bordereaux traités</div>
                <div className="gsd-corbeille-card__value gsd-corbeille-card__value--ok">{corbeille.traites || 0}</div>
              </div>
              <div className="gsd-corbeille-card">
                <div className="gsd-corbeille-card__label">Bordereaux en cours</div>
                <div className="gsd-corbeille-card__value gsd-corbeille-card__value--warn">{corbeille.enCours || 0}</div>
              </div>
            </div>
          </section>
        )}

        {/* Derniers Bordereaux Ajoutés */}
        <section className="gsd-panel">
          <div className="gsd-panel__head"><h3>Derniers bordereaux ajoutés</h3></div>
          <div className="gsd-filter-grid gsd-filter-grid--7">
            <input type="text" placeholder="Référence" value={filterDerniers.reference} onChange={(e) => setFilterDerniers({...filterDerniers, reference: e.target.value})} />
            <input type="text" placeholder="Client" value={filterDerniers.client} onChange={(e) => setFilterDerniers({...filterDerniers, client: e.target.value})} />
            <select value={filterDerniers.type} onChange={(e) => setFilterDerniers({...filterDerniers, type: e.target.value})}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDerniers.statut} onChange={(e) => setFilterDerniers({...filterDerniers, statut: e.target.value})}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterDerniers.dateFrom} onChange={(e) => setFilterDerniers({...filterDerniers, dateFrom: e.target.value})} />
            <input type="date" value={filterDerniers.dateTo} onChange={(e) => setFilterDerniers({...filterDerniers, dateTo: e.target.value})} />
            <button className="gsd-btn gsd-btn--ghost-danger" onClick={() => setFilterDerniers({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })}>Effacer</button>
          </div>
          <div className="gsd-table-scroll">
            <table className="gsd-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>% Finalisation</th>
                  <th>États dossiers</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDerniersTable.slice((derniersPage - 1) * derniersPerPage, derniersPage * derniersPerPage).map((dossier) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const locked = isRowLocked(dossier);
                  return (
                    <tr key={`recent-${dossier.id}`} className={locked ? 'gsd-row--locked' : undefined}>
                      <td className="gsd-cell--ref">{dossier.reference}</td>
                      <td>{dossier.client || dossier.societe || 'N/A'}</td>
                      <td>{dossier.type}</td>
                      <td>
                        <div className="gsd-progress">
                          <div className="gsd-progress__track">
                            <div className={`gsd-progress__fill gsd-progress__fill--${completionPercentage >= 80 ? 'ok' : completionPercentage >= 50 ? 'warn' : 'danger'}`} style={{ width: `${completionPercentage}%` }} />
                          </div>
                          <span>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="gsd-tag-row">
                          {dossierStates.length > 0 ? dossierStates.map((state, idx) => {
                            const count = (dossier as any).dossierStateCounts?.[state];
                            const total = (dossier as any).totalDocs;
                            const displayState = state === 'Nouveau' ? 'En cours' : state;
                            return (
                              <span key={idx} className={`gsd-tag gsd-tag--${displayState === 'Traité' ? 'ok' : displayState === 'En cours' ? 'warn' : 'danger'}`}>
                                {displayState} {count && total ? `${count}/${total}` : ''}
                              </span>
                            );
                          }) : <span className="gsd-muted">—</span>}
                        </div>
                        {locked && <span className="gsd-locked-badge">🔒 Virement exécuté</span>}
                      </td>
                      <td className="gsd-muted">{dossier.date}</td>
                      <td>
                        <button
                          onClick={() => handleModifyStatus(dossier, false)}
                          disabled={locked}
                          className="gsd-btn gsd-btn--sm gsd-btn--purple"
                          title={locked ? 'Virement déjà exécuté — action désactivée' : 'Modifier le statut'}
                        >
                          ✎ Statut
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDerniersTable.length === 0 && (
                  <tr><td colSpan={7} className="gsd-empty-row">Aucun bordereau ne correspond aux filtres actuels.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredDerniersTable.length > 0 && (
            <div className="gsd-pagination">
              <button disabled={derniersPage === 1} onClick={() => setDerniersPage(prev => Math.max(1, prev - 1))}>← Précédent</button>
              <span>Page {derniersPage} sur {derniersTotalPages}</span>
              <button disabled={derniersPage >= derniersTotalPages} onClick={() => setDerniersPage(prev => Math.min(derniersTotalPages, prev + 1))}>Suivant →</button>
            </div>
          )}
        </section>

        {/* Bordereaux */}
        <section className="gsd-panel">
          <div className="gsd-panel__head"><h3>Bordereaux</h3></div>
          <div className="gsd-filter-grid gsd-filter-grid--6">
            <input type="text" placeholder="Référence" value={filterBordereaux.reference} onChange={(e) => setFilterBordereaux({...filterBordereaux, reference: e.target.value})} />
            <input type="text" placeholder="Client" value={filterBordereaux.client} onChange={(e) => setFilterBordereaux({...filterBordereaux, client: e.target.value})} />
            <select value={filterBordereaux.statut} onChange={(e) => setFilterBordereaux({...filterBordereaux, statut: e.target.value})}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterBordereaux.dateFrom} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateFrom: e.target.value})} />
            <input type="date" value={filterBordereaux.dateTo} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateTo: e.target.value})} />
            <button className="gsd-btn gsd-btn--ghost-danger" onClick={() => setFilterBordereaux({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' })}>Effacer</button>
          </div>
          <div className="gsd-table-scroll">
            <table className="gsd-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Statut</th>
                  <th>% Finalisation</th>
                  <th>États dossiers</th>
                  <th>Priorité</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereauxTable.slice((bordereauxPage - 1) * bordereauxPerPage, bordereauxPage * bordereauxPerPage).map((dossier) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const locked = isRowLocked(dossier);
                  const priorityClass = dossier.priorite === 'Très' || dossier.priorite === 'Élevée' ? 'danger' : dossier.priorite === 'Moyenne' ? 'warn' : 'ok';
                  return (
                    <tr key={`bordereau-${dossier.id}`} className={locked ? 'gsd-row--locked' : undefined}>
                      <td className="gsd-cell--ref">{dossier.reference}</td>
                      <td>{dossier.client || dossier.societe || 'N/A'}</td>
                      <td>
                        <span className={`gsd-status gsd-status--${dossier.statut === 'Traité' ? 'ok' : (dossier.statut === 'En cours' || dossier.statut === 'Nouveau') ? 'warn' : 'info'}`}>
                          {dossier.statut === 'Nouveau' ? 'En cours' : dossier.statut}
                        </span>
                        {locked && <span className="gsd-locked-badge">🔒 Verrouillé</span>}
                      </td>
                      <td>
                        <div className="gsd-progress">
                          <div className="gsd-progress__track">
                            <div className={`gsd-progress__fill gsd-progress__fill--${completionPercentage >= 80 ? 'ok' : completionPercentage >= 50 ? 'warn' : 'danger'}`} style={{ width: `${completionPercentage}%` }} />
                          </div>
                          <span>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="gsd-tag-row">
                          {dossierStates.map((state, idx) => {
                            const count = (dossier as any).dossierStateCounts?.[state];
                            const total = (dossier as any).totalDocs;
                            const displayState = state === 'Nouveau' ? 'En cours' : state;
                            return (
                              <span key={idx} className={`gsd-tag gsd-tag--${displayState === 'Traité' ? 'ok' : displayState === 'En cours' ? 'warn' : 'danger'}`}>
                                {displayState} {count && total ? `${count}/${total}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td><span className={`gsd-tag gsd-tag--${priorityClass}`}>{dossier.priorite || 'Normale'}</span></td>
                      <td>
                        <div className="gsd-action-links">
                          <button
                            onClick={() => handleRetourScan(dossier.id)}
                            disabled={locked}
                            className="gsd-link gsd-link--purple"
                            title={locked ? 'Virement déjà exécuté — action désactivée' : 'Retourner ce bordereau au Scan'}
                          >
                            Retour Scan
                          </button>
                          <button
                            onClick={() => handleAddDocument(dossier)}
                            disabled={locked}
                            className="gsd-link gsd-link--green"
                            title={locked ? 'Virement déjà exécuté — action désactivée' : 'Ajouter un ou plusieurs documents'}
                          >
                            + Doc
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredBordereauxTable.length === 0 && (
                  <tr><td colSpan={7} className="gsd-empty-row">Aucun bordereau ne correspond aux filtres actuels.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredBordereauxTable.length > 0 && (
            <div className="gsd-pagination">
              <button disabled={bordereauxPage === 1} onClick={() => setBordereauxPage(prev => Math.max(1, prev - 1))}>← Précédent</button>
              <span>Page {bordereauxPage} sur {bordereauxTotalPages}</span>
              <button disabled={bordereauxPage >= bordereauxTotalPages} onClick={() => setBordereauxPage(prev => Math.min(bordereauxTotalPages, prev + 1))}>Suivant →</button>
            </div>
          )}
        </section>

        {/* Dossiers Individuels */}
        <section className="gsd-panel gsd-panel--flush">
          <div className="gsd-panel__head gsd-panel__head--bordered">
            <div>
              <h3>Dossiers individuels</h3>
              <p className="gsd-panel__subtitle">Affichage par dossier (non par bordereau)</p>
            </div>
          </div>
          <div className="gsd-filter-grid gsd-filter-grid--9 gsd-filter-grid--flush">
            <input type="text" placeholder="Réf. dossier" value={filterDocuments.reference} onChange={(e) => setFilterDocuments({...filterDocuments, reference: e.target.value})} />
            <input type="text" placeholder="Réf. bordereau" value={filterDocuments.bordereauReference} onChange={(e) => setFilterDocuments({...filterDocuments, bordereauReference: e.target.value})} />
            <input type="text" placeholder="Client" value={filterDocuments.client} onChange={(e) => setFilterDocuments({...filterDocuments, client: e.target.value})} />
            <select value={filterDocuments.type} onChange={(e) => setFilterDocuments({...filterDocuments, type: e.target.value})}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDocuments.statut} onChange={(e) => setFilterDocuments({...filterDocuments, statut: e.target.value})}>
              <option value="">Tous statuts</option>
              {uniqueDocumentStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Gestionnaire" value={filterDocuments.gestionnaire} onChange={(e) => setFilterDocuments({...filterDocuments, gestionnaire: e.target.value})} />
            <input type="date" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} />
            <input type="date" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} />
            <button className="gsd-btn gsd-btn--ghost-danger" onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })}>Effacer</button>
          </div>
          <div className="gsd-table-scroll">
            <table className="gsd-table gsd-table--brand">
              <thead>
                <tr>
                  <th>Réf. dossier</th>
                  <th>Réf. bordereau</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Statut dossier</th>
                  <th>Gestionnaire</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((documentsPage - 1) * documentsPerPage, documentsPage * documentsPerPage).map((doc) => {
                  const locked = isRowLocked(doc);
                  return (
                  <tr
                    key={doc.id}
                    className={[
                      highlightedDocId === doc.id ? 'gsd-row--highlight' : '',
                      locked ? 'gsd-row--locked' : ''
                    ].filter(Boolean).join(' ') || undefined}
                  >
                    <td className="gsd-cell--ref">{doc.reference}</td>
                    <td className="gsd-cell--ref-alt">{(doc as any).bordereauReference || 'N/A'}</td>
                    <td>{doc.client || doc.societe || 'N/A'}</td>
                    <td>{doc.type}</td>
                    <td>
                      <span className={`gsd-status gsd-status--${doc.statut === 'Traité' ? 'ok' : (doc.statut === 'En cours' || doc.statut === 'Nouveau') ? 'warn' : 'info'}`}>
                        {doc.statut === 'Nouveau' ? 'En cours' : doc.statut}
                      </span>
                      {locked && <span className="gsd-locked-badge gsd-locked-badge--icon">🔒</span>}
                    </td>
                    <td>{doc.gestionnaire || 'Non assigné'}</td>
                    <td className="gsd-muted">{doc.date}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="gsd-doc-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="gsd-btn gsd-btn--sm gsd-btn--blue"
                          disabled={loadingPdfDocId === doc.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLoadingPdfDocId(doc.id);
                            try {
                              const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${doc.id}?t=${Date.now()}`);
                              if (response.data.success && response.data.hasDocument) {
                                const serverBaseUrl = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') || window.location.origin;
                                const pdfPath = response.data.pdfUrl || '';
                                const resolvedPdfUrl = pdfPath.startsWith('http') ? pdfPath : `${serverBaseUrl}${pdfPath}`;
                                setPdfUrl(resolvedPdfUrl);
                                setCurrentDossier({ ...doc, isDocument: true });
                                setShowPdfModal(true);
                              } else {
                                const message = response.data?.error || 'PDF non disponible pour ce dossier (le document peut être absent ou encore en cours de génération).';
                                alert(message);
                              }
                            } catch (error: any) {
                              console.error('PDF view error:', error);
                              if (error.response?.status === 401 || error.response?.status === 403) {
                                alert('Session expirée ou droits insuffisants — reconnectez-vous.');
                              } else {
                                alert('Erreur lors de l\'ouverture du PDF. Vérifiez que le fichier existe bien et réessayez.');
                              }
                            } finally {
                              setLoadingPdfDocId(null);
                            }
                          }}
                        >
                          {loadingPdfDocId === doc.id ? '⏳ Chargement…' : '📄 Voir PDF'}
                        </button>
                        <div className="gsd-actions-menu-wrap" data-actions-menu onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={locked}
                            className="gsd-btn gsd-btn--sm gsd-btn--purple gsd-btn--block"
                            title={locked ? 'Virement déjà exécuté — actions désactivées' : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              const isOpen = showActionsMenu === doc.id;
                              if (isOpen) {
                                setShowActionsMenu(null);
                                setSelectedDocForAction(null);
                              } else {
                                handleOpenActionsMenu(doc, e);
                              }
                              return false;
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              return false;
                            }}
                          >
                            ⚙ Actions ▾
                          </button>
                          {showActionsMenu === doc.id && !locked && (
                            <div className={`gsd-dropdown gsd-dropdown--${actionsMenuPosition}`} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={!(doc as any).bordereauId}
                                title={!(doc as any).bordereauId ? 'Bordereau introuvable pour ce dossier' : 'Retourner ce dossier au Service Scan'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCloseActionsMenu();
                                  const bordereauId = (doc as any).bordereauId;
                                  if (bordereauId) handleRetourScan(bordereauId);
                                }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="gsd-dropdown__item gsd-dropdown__item--purple"
                              >
                                <span>↩</span><span>Retourner au Scan</span>
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); handleRetirerFromMenu(); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="gsd-dropdown__item gsd-dropdown__item--danger"
                              >
                                <span>🗑</span><span>Retirer</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemplacerClick(); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="gsd-dropdown__item gsd-dropdown__item--blue"
                              >
                                <span>↻</span><span>Remplacer</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReaffecterClick(); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="gsd-dropdown__item gsd-dropdown__item--purple"
                              >
                                <span>▤</span><span>Réaffecter</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {filteredDocumentsTable.length === 0 && (
                  <tr><td colSpan={8} className="gsd-empty-row">Aucun dossier ne correspond aux filtres actuels.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredDocumentsTable.length > 0 && (
            <div className="gsd-pagination">
              <button disabled={documentsPage === 1} onClick={() => setDocumentsPage(prev => Math.max(1, prev - 1))}>← Précédent</button>
              <span>Page {documentsPage} sur {documentsTotalPages}</span>
              <button disabled={documentsPage >= documentsTotalPages} onClick={() => setDocumentsPage(prev => Math.min(documentsTotalPages, prev + 1))}>Suivant →</button>
            </div>
          )}
        </section>
      </div>

      {/* Retour Scan Modal */}
      {showRetourScanModal && (
        <div className="gsd-overlay">
          <div className="gsd-modal">
            <div className="gsd-modal__head">
              <h3>↩ Retour vers l'équipe Scan</h3>
              <button className="gsd-modal__close" onClick={() => setShowRetourScanModal(false)}>×</button>
            </div>
            <div className="gsd-modal__body">
              <p className="gsd-modal__hint">
                Les statuts des BS déjà traités dans ce bordereau seront conservés — aucun changement automatique ne sera appliqué.
              </p>
              <label className="gsd-field-label">Raison du retour vers l'équipe Scan :</label>
              <textarea
                value={retourScanReason}
                onChange={(e) => setRetourScanReason(e.target.value)}
                placeholder="Veuillez expliquer la raison du retour…"
                className="gsd-textarea"
              />
            </div>
            <div className="gsd-modal__footer">
              <button className="gsd-btn gsd-btn--neutral" onClick={() => setShowRetourScanModal(false)}>Annuler</button>
              <button
                onClick={handleConfirmRetourScan}
                disabled={!retourScanReason.trim()}
                className="gsd-btn gsd-btn--brand"
              >
                Confirmer le retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocumentModal && (
        <div className="gsd-overlay">
          <div className="gsd-modal">
            <div className="gsd-modal__head">
              <h3>📎 Ajouter des documents (BS)</h3>
              <button className="gsd-modal__close" onClick={() => setShowAddDocumentModal(false)}>×</button>
            </div>
            <div className="gsd-modal__body">
              <label className="gsd-field-label">Sélectionner un ou plusieurs fichiers (aucune limite de nombre) :</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setSelectedFilesForUpload(files);
                }}
                disabled={uploadingDocument}
                className="gsd-file-input"
              />
              {selectedFilesForUpload.length > 0 && (
                <div className="gsd-file-list">
                  {selectedFilesForUpload.length} fichier(s) sélectionné(s) :
                  <ul>
                    {selectedFilesForUpload.map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {uploadingDocument && <div className="gsd-uploading">Upload en cours…</div>}
            </div>
            <div className="gsd-modal__footer">
              <button className="gsd-btn gsd-btn--neutral" disabled={uploadingDocument} onClick={() => setShowAddDocumentModal(false)}>Annuler</button>
              <button
                onClick={handleUploadDocument}
                disabled={uploadingDocument || selectedFilesForUpload.length === 0}
                className="gsd-btn gsd-btn--brand"
              >
                {uploadingDocument ? 'Upload en cours…' : `Uploader ${selectedFilesForUpload.length || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && pdfUrl && (
        <div className="gsd-overlay gsd-overlay--dark">
          <div className="gsd-pdf-modal">
            <div className="gsd-pdf-modal__head">
              <div>
                <h3>{currentDossier?.reference} — {currentDossier?.client || currentDossier?.societe}</h3>
                <p>Type : {currentDossier?.type} · Statut : {currentDossier?.statut}</p>
              </div>
              <div className="gsd-pdf-modal__actions">
                <button
                  disabled={isRowLocked(currentDossier)}
                  className="gsd-btn gsd-btn--ok"
                  onClick={async () => {
                    if (window.confirm('Êtes-vous sûr de vouloir marquer ce dossier comme Traité ?')) {
                      try {
                        const response = await LocalAPI.post('/bordereaux/gestionnaire-senior/modify-dossier-status', {
                          dossierId: currentDossier.id,
                          newStatus: 'Traité'
                        });

                        if (response.data.success) {
                          setSuccessMessage('Dossier marqué comme Traité avec succès');
                          setShowSuccessModal(true);
                          setTimeout(() => setShowSuccessModal(false), 3000);

                          setShowPdfModal(false);
                          setPdfUrl(null);
                          setCurrentDossier(null);

                          await loadDashboardData();
                        } else {
                          alert(response.data.message || 'Erreur lors de la modification du statut');
                        }
                      } catch (error: any) {
                        console.error('Status modification error:', error);
                        alert(error.response?.data?.message || 'Erreur lors de la modification du statut');
                      }
                    }
                  }}
                >
                  ✓ Traiter
                </button>
                <button
                  className="gsd-btn gsd-btn--danger"
                  onClick={() => { setShowPdfModal(false); setPdfUrl(null); setCurrentDossier(null); }}
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="gsd-pdf-modal__body">
              {pdfUrl ? (
                <iframe src={pdfUrl} title="PDF Viewer" />
              ) : (
                <div className="gsd-pdf-modal__loading">Chargement du PDF…</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="gsd-toast">
          <span className="gsd-toast__icon">✓</span>
          <span>{successMessage}</span>
          <button onClick={() => setShowSuccessModal(false)}>×</button>
        </div>
      )}

      {/* Status Modification Modal */}
      {showStatusModal && currentDossier && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--sm">
            <div className="gsd-modal__head">
              <h3>✎ Modifier le statut</h3>
              <button className="gsd-modal__close" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="gsd-modal__body">
              <p className="gsd-modal__summary">
                {currentDossier.isDocument ? 'Document' : 'Bordereau'} : <strong>{currentDossier.reference}</strong><br/>
                Client : <strong>{currentDossier.client || currentDossier.societe || 'N/A'}</strong><br/>
                Statut actuel : <strong>{currentDossier.statut}</strong>
              </p>
              <div className="gsd-status-options">
                {(currentDossier.isDocument
                  ? ['Nouveau', 'En cours', 'Traité', 'Rejeté', 'Retourné']
                  : ['Nouveau', 'En cours', 'Traité']
                ).map(status => (
                  <button key={status} onClick={() => handleConfirmStatusChange(status)} className="gsd-status-option">
                    {status === 'Nouveau' ? '●' : status === 'En cours' ? '⏳' : status === 'Traité' ? '✓' : status === 'Rejeté' ? '✕' : '↩'} {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="gsd-modal__footer">
              <button className="gsd-btn gsd-btn--neutral" onClick={() => setShowStatusModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Remplacer Document Modal */}
      {showRemplacerModal && selectedDocForAction && (
        <div className="gsd-overlay">
          <div className="gsd-modal">
            <div className="gsd-modal__head">
              <h3>↻ Remplacer le document</h3>
              <button className="gsd-modal__close" onClick={() => { setShowRemplacerModal(false); setRemplacerFile(null); setSelectedDocForAction(null); }}>×</button>
            </div>
            <div className="gsd-modal__body">
              <p className="gsd-modal__summary">
                Document actuel : <strong>{selectedDocForAction.reference}</strong><br/>
                Bordereau : <strong>{selectedDocForAction.bordereauReference}</strong><br/>
                Client : <strong>{selectedDocForAction.client || selectedDocForAction.societe}</strong>
              </p>
              <label className="gsd-field-label">Sélectionner le nouveau fichier :</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setRemplacerFile(e.target.files?.[0] || null)}
                disabled={uploadingRemplacer}
                className="gsd-file-input"
              />
              {remplacerFile && <div className="gsd-file-confirm">✓ Fichier sélectionné : {remplacerFile.name}</div>}
              {uploadingRemplacer && <div className="gsd-uploading">Remplacement en cours…</div>}
            </div>
            <div className="gsd-modal__footer">
              <button className="gsd-btn gsd-btn--neutral" disabled={uploadingRemplacer} onClick={() => { setShowRemplacerModal(false); setRemplacerFile(null); setSelectedDocForAction(null); }}>Annuler</button>
              <button onClick={handleRemplacerUpload} disabled={!remplacerFile || uploadingRemplacer} className="gsd-btn gsd-btn--brand">
                {uploadingRemplacer ? 'Remplacement…' : 'Remplacer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retirer Confirmation Modal */}
      {showRetirerConfirmModal && selectedDocForAction && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--sm">
            <div className="gsd-modal__head">
              <h3>⚠ Confirmer le retrait</h3>
              <button className="gsd-modal__close" onClick={() => { setShowRetirerConfirmModal(false); setSelectedDocForAction(null); }}>×</button>
            </div>
            <div className="gsd-modal__body">
              <p className="gsd-modal__summary">Êtes-vous sûr de vouloir retirer ce document ?</p>
              <div className="gsd-summary-box">
                <div><strong>Document :</strong> {selectedDocForAction.reference}</div>
                <div><strong>Bordereau :</strong> {selectedDocForAction.bordereauReference}</div>
                <div><strong>Client :</strong> {selectedDocForAction.client || selectedDocForAction.societe}</div>
              </div>
            </div>
            <div className="gsd-modal__footer">
              <button className="gsd-btn gsd-btn--neutral" onClick={() => { setShowRetirerConfirmModal(false); setSelectedDocForAction(null); }}>Annuler</button>
              <button className="gsd-btn gsd-btn--brand" onClick={handleConfirmRetirer}>🗑 Confirmer le retrait</button>
            </div>
          </div>
        </div>
      )}

      {/* Réaffecter Documents Modal */}
      {showReaffecterModal && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--lg">
            <div className="gsd-modal__head">
              <h3>▤ Réaffecter des documents</h3>
              <button className="gsd-modal__close" onClick={() => { setShowReaffecterModal(false); setSelectedDocsForReaffect([]); setTargetBordereauId(''); setSelectedDocForAction(null); }}>×</button>
            </div>
            <div className="gsd-modal__body">
              <p className="gsd-modal__hint">
                Sélectionnez les documents à réaffecter et choisissez le bordereau de destination (uniquement vos bordereaux, hors virements déjà exécutés).
              </p>

              <h4 className="gsd-modal__section-title">Documents disponibles ({selectedDocsForReaffect.length} sélectionné(s))</h4>
              <div className="gsd-doc-picker">
                {documents.filter(doc => !isRowLocked(doc)).map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocSelection(doc.id)}
                    className={`gsd-doc-picker__item ${selectedDocsForReaffect.includes(doc.id) ? 'gsd-doc-picker__item--selected' : ''}`}
                  >
                    <input type="checkbox" checked={selectedDocsForReaffect.includes(doc.id)} onChange={() => toggleDocSelection(doc.id)} />
                    <div className="gsd-doc-picker__info">
                      <div className="gsd-doc-picker__ref">{doc.reference}</div>
                      <div className="gsd-doc-picker__meta">Bordereau : {(doc as any).bordereauReference} | Client : {doc.client || doc.societe}</div>
                    </div>
                    <span className={`gsd-tag gsd-tag--${doc.statut === 'Traité' ? 'ok' : 'warn'}`}>{doc.statut === 'Nouveau' ? 'En cours' : doc.statut}</span>
                  </div>
                ))}
              </div>

              <h4 className="gsd-modal__section-title">Bordereau de destination</h4>
              <select value={targetBordereauId} onChange={(e) => setTargetBordereauId(e.target.value)} className="gsd-select-full">
                <option value="">-- Sélectionnez un bordereau --</option>
                {seniorBordereaux.map(bordereau => (
                  <option key={bordereau.id} value={bordereau.id}>
                    {bordereau.reference} - {bordereau.client || bordereau.societe} ({bordereau.type})
                  </option>
                ))}
              </select>
              {seniorBordereaux.length === 0 && (
                <p className="gsd-warning-text">⚠ Aucun bordereau disponible dans votre portefeuille</p>
              )}
            </div>
            <div className="gsd-modal__footer">
              <button
                onClick={() => { setShowReaffecterModal(false); setSelectedDocsForReaffect([]); setTargetBordereauId(''); setSelectedDocForAction(null); }}
                disabled={reaffectingDocs}
                className="gsd-btn gsd-btn--neutral"
              >
                Annuler
              </button>
              <button
                onClick={handleReaffecterDocuments}
                disabled={!targetBordereauId || selectedDocsForReaffect.length === 0 || reaffectingDocs}
                className="gsd-btn gsd-btn--brand"
              >
                {reaffectingDocs ? 'Réaffectation…' : `Réaffecter (${selectedDocsForReaffect.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Design system — "Registre" — a back-office identity built for dense,
// trustworthy financial/insurance data: ink-navy structure, a single
// restrained brand-red for calls to action, monospace reference codes (the
// signature element: every dossier/bordereau reference reads like a ledger
// entry), and a hatched lock treatment for VIREMENT_EXECUTE rows instead of
// merely graying out buttons — because "locked" should be legible as a state
// of the record, not just a disabled control.
// ---------------------------------------------------------------------------
const GSD_STYLES = `
  .gsd-root {
    --ink-900: #0F1B2D;
    --ink-700: #24344A;
    --ink-500: #5B6B82;
    --ink-300: #9AA7B8;
    --line: #E2E6EC;
    --surface: #FFFFFF;
    --canvas: #F3F5F9;
    --brand: #A82A2E;
    --brand-dark: #7E1F22;
    --ok: #1E8E5A;
    --ok-bg: #E7F5EE;
    --warn: #B4740E;
    --warn-bg: #FBF1DF;
    --danger: #B3272D;
    --danger-bg: #FBEAEA;
    --info: #2A5DA8;
    --info-bg: #E9F0FA;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--canvas);
    min-height: 100vh;
    color: var(--ink-900);
  }
  .gsd-root * { box-sizing: border-box; }
  .gsd-mono, .gsd-cell--ref, .gsd-cell--ref-alt { font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace; }

  .gsd-loading { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--ink-500); }
  .gsd-loading__spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--brand); animation: gsd-spin 0.8s linear infinite; }
  @keyframes gsd-spin { to { transform: rotate(360deg); } }

  .gsd-header { background: linear-gradient(180deg, var(--ink-900) 0%, #16263D 100%); padding: 28px 20px; border-bottom: 3px solid var(--brand); }
  .gsd-header__inner { max-width: 1400px; margin: 0 auto; }
  .gsd-header__eyebrow { display: inline-block; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #E8B4B4; background: rgba(168,42,46,0.25); padding: 3px 10px; border-radius: 3px; margin-bottom: 10px; }
  .gsd-header h1 { color: #fff; font-size: 24px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.01em; }
  .gsd-header p { color: #A9B6C9; font-size: 13.5px; margin: 0; }

  .gsd-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 60px; display: flex; flex-direction: column; gap: 20px; }

  .gsd-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .gsd-stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; border-top: 3px solid var(--brand); }
  .gsd-stat-card__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .gsd-stat-card__head h3 { font-size: 13.5px; font-weight: 600; margin: 0; color: var(--ink-700); }
  .gsd-stat-card__badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .gsd-stat-card__count { background: var(--ink-900); color: #fff; font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; padding: 3px 9px; border-radius: 20px; }
  .gsd-stat-card__reassigned { background: var(--info); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 20px; }
  .gsd-stat-card__breakdown { font-size: 12px; color: var(--ink-500); display: flex; flex-direction: column; gap: 2px; }
  .gsd-stat-card__row { display: flex; justify-content: space-between; }
  .gsd-muted { color: var(--ink-300); }

  .gsd-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 980px) { .gsd-two-col { grid-template-columns: 1fr; } }

  .gsd-panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
  .gsd-panel--flush { padding: 0; overflow: hidden; }
  .gsd-panel--green { border-top: 3px solid var(--ok); }
  .gsd-panel--blue { border-top: 3px solid var(--info); }
  .gsd-panel__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .gsd-panel__head--bordered { padding: 16px 20px; margin-bottom: 0; border-bottom: 1px solid var(--line); }
  .gsd-panel__head h3 { font-size: 16px; font-weight: 700; color: var(--ink-900); margin: 0; display: flex; align-items: center; gap: 8px; }
  .gsd-panel__icon { color: var(--brand); }
  .gsd-panel__subtitle { font-size: 12px; color: var(--ink-500); margin: 4px 0 0; }

  .gsd-assignments-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .gsd-assignment-card { background: var(--canvas); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
  .gsd-assignment-card__name { font-weight: 700; font-size: 14px; color: var(--ink-900); margin-bottom: 8px; }
  .gsd-assignment-card__total { font-size: 12.5px; color: var(--ok); font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .gsd-assignment-card__metrics { font-size: 12px; }
  .gsd-metric-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .gsd-metric-row--ok { color: var(--ok); }
  .gsd-metric-row--warn { color: var(--warn); }
  .gsd-metric-row--danger { color: var(--danger); }
  .gsd-assignment-card__returnedby { font-size: 11px; color: var(--danger); font-weight: 700; background: var(--danger-bg); padding: 4px 8px; border-radius: 4px; margin-top: 4px; }
  .gsd-assignment-card__types { font-size: 11px; color: var(--ink-500); margin-top: 10px; }

  .gsd-empty { text-align: center; padding: 28px; grid-column: 1 / -1; }
  .gsd-empty__icon { font-size: 26px; opacity: 0.4; margin-bottom: 6px; }
  .gsd-empty--green { color: var(--ok); }
  .gsd-empty--blue { color: var(--info); }
  .gsd-empty p { margin: 0; font-size: 13px; }

  .gsd-reassigned-summary { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 10px; background: var(--info-bg); border-radius: 6px; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--info); }
  .gsd-reassigned-summary__tags { display: flex; gap: 10px; font-size: 12px; }

  .gsd-corbeille-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .gsd-corbeille-card { background: var(--canvas); border-radius: 8px; padding: 14px; }
  .gsd-corbeille-card__label { font-size: 12px; color: var(--ink-500); margin-bottom: 4px; }
  .gsd-corbeille-card__value { font-size: 24px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; }
  .gsd-corbeille-card__value--ok { color: var(--ok); }
  .gsd-corbeille-card__value--warn { color: var(--warn); }

  .gsd-filter-grid { display: grid; gap: 8px; margin-bottom: 14px; padding: 12px; background: var(--canvas); border-radius: 8px; }
  .gsd-filter-grid--flush { border-radius: 0; margin-bottom: 0; }
  .gsd-filter-grid--6 { grid-template-columns: repeat(6, minmax(120px, 1fr)); }
  .gsd-filter-grid--7 { grid-template-columns: repeat(7, minmax(120px, 1fr)); }
  .gsd-filter-grid--9 { grid-template-columns: repeat(9, minmax(110px, 1fr)); }
  @media (max-width: 1100px) {
    .gsd-filter-grid--6, .gsd-filter-grid--7, .gsd-filter-grid--9 { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 640px) {
    .gsd-filter-grid--6, .gsd-filter-grid--7, .gsd-filter-grid--9 { grid-template-columns: 1fr 1fr; }
    .gsd-wrap { padding: 16px 12px 48px; }
  }
  .gsd-filter-grid input, .gsd-filter-grid select { padding: 7px 9px; border: 1px solid var(--line); border-radius: 5px; font-size: 12.5px; background: var(--surface); color: var(--ink-900); }
  .gsd-filter-grid input:focus, .gsd-filter-grid select:focus, .gsd-select-full:focus, .gsd-textarea:focus { outline: 2px solid var(--info); outline-offset: 1px; }

  .gsd-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .gsd-table { width: 100%; border-collapse: collapse; min-width: 720px; }
  .gsd-table thead tr { background: var(--ink-900); }
  .gsd-table--blue thead tr { background: var(--info); }
  .gsd-table--brand thead tr { background: var(--brand); }
  .gsd-table th { padding: 10px 10px; text-align: left; font-size: 11.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #fff; white-space: nowrap; }
  .gsd-table td { padding: 11px 10px; font-size: 13px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  .gsd-table tbody tr:nth-child(even) { background: #FAFBFD; }
  .gsd-table tbody tr:hover { background: #F0F3F8; }
  .gsd-cell--ref { font-weight: 600; color: var(--info); }
  .gsd-cell--ref-alt { font-weight: 600; color: var(--brand); }
  .gsd-empty-row { text-align: center; color: var(--ink-300); padding: 24px !important; font-style: italic; }

  .gsd-row--highlight { background: var(--ok-bg) !important; box-shadow: inset 3px 0 0 var(--ok); transition: background-color 0.3s ease; }
  .gsd-row--locked {
    background-image: repeating-linear-gradient(135deg, rgba(15,27,45,0.035) 0 6px, transparent 6px 12px);
    box-shadow: inset 3px 0 0 var(--ink-300);
  }
  .gsd-locked-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--ink-500); background: var(--canvas); border: 1px solid var(--line); padding: 2px 7px; border-radius: 20px; margin-left: 6px; }
  .gsd-locked-badge--icon { margin-left: 6px; padding: 2px 5px; }

  .gsd-status { display: inline-block; padding: 4px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .gsd-status--ok { background: var(--ok-bg); color: var(--ok); }
  .gsd-status--warn { background: var(--warn-bg); color: var(--warn); }
  .gsd-status--info { background: var(--info-bg); color: var(--info); }

  .gsd-tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 700; }
  .gsd-tag--ok { background: var(--ok-bg); color: var(--ok); }
  .gsd-tag--warn { background: var(--warn-bg); color: var(--warn); }
  .gsd-tag--danger { background: var(--danger-bg); color: var(--danger); }
  .gsd-tag--blue { background: var(--info-bg); color: var(--info); }
  .gsd-tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .gsd-chip { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .gsd-chip--blue { background: var(--info-bg); color: var(--info); }

  .gsd-progress { display: flex; align-items: center; gap: 8px; }
  .gsd-progress__track { width: 46px; height: 6px; background: var(--line); border-radius: 4px; overflow: hidden; }
  .gsd-progress__fill { height: 100%; }
  .gsd-progress__fill--ok { background: var(--ok); }
  .gsd-progress__fill--warn { background: var(--warn); }
  .gsd-progress__fill--danger { background: var(--danger); }
  .gsd-progress span { font-size: 11px; font-weight: 700; color: var(--ink-500); }

  .gsd-btn { border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; padding: 9px 16px; transition: opacity 0.15s ease, transform 0.1s ease; }
  .gsd-btn:not(:disabled):hover { transform: translateY(-1px); }
  .gsd-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .gsd-btn--sm { padding: 5px 10px; font-size: 11.5px; border-radius: 5px; }
  .gsd-btn--block { width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .gsd-btn--brand { background: var(--brand); color: #fff; }
  .gsd-btn--brand:not(:disabled):hover { background: var(--brand-dark); }
  .gsd-btn--blue { background: var(--info); color: #fff; }
  .gsd-btn--purple { background: #6E4A9E; color: #fff; }
  .gsd-btn--ok { background: var(--ok); color: #fff; }
  .gsd-btn--danger { background: var(--danger); color: #fff; }
  .gsd-btn--neutral { background: var(--canvas); color: var(--ink-700); border: 1px solid var(--line); }
  .gsd-btn--ghost-danger { background: transparent; color: var(--danger); border: 1px solid var(--danger); }

  .gsd-action-links { display: flex; gap: 12px; flex-wrap: wrap; }
  .gsd-link { background: none; border: none; text-decoration: underline; font-size: 12px; padding: 0; cursor: pointer; font-weight: 600; }
  .gsd-link:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
  .gsd-link--purple { color: #6E4A9E; }
  .gsd-link--green { color: var(--ok); }

  .gsd-doc-actions { display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
  .gsd-actions-menu-wrap { position: relative; }
  .gsd-dropdown { position: absolute; left: 0; z-index: 1000; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 8px 24px rgba(15,27,45,0.16); min-width: 180px; overflow: hidden; }
  .gsd-dropdown--bottom { top: 100%; margin-top: 4px; }
  .gsd-dropdown--top { bottom: 100%; margin-bottom: 4px; }
  .gsd-dropdown__item { width: 100%; padding: 11px 14px; border: none; background: var(--surface); text-align: left; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--ink-700); border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }
  .gsd-dropdown__item:last-child { border-bottom: none; }
  .gsd-dropdown__item:disabled { opacity: 0.4; cursor: not-allowed; }
  .gsd-dropdown__item--danger:hover { background: var(--danger-bg); }
  .gsd-dropdown__item--blue:hover { background: var(--info-bg); }
  .gsd-dropdown__item--purple:hover { background: #F1ECF9; }

  .gsd-pagination { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 16px 0 4px; flex-wrap: wrap; }
  .gsd-pagination button { padding: 7px 14px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink-700); font-size: 12.5px; cursor: pointer; }
  .gsd-pagination button:disabled { color: var(--ink-300); cursor: not-allowed; background: var(--canvas); }
  .gsd-pagination span { font-size: 12.5px; color: var(--ink-500); padding: 0 6px; }

  .gsd-overlay { position: fixed; inset: 0; background: rgba(15,27,45,0.55); z-index: 1002; display: flex; justify-content: center; align-items: center; padding: 16px; }
  .gsd-overlay--dark { background: rgba(15,27,45,0.78); z-index: 1004; }
  .gsd-modal { background: var(--surface); border-radius: 10px; padding: 22px; max-width: 500px; width: 100%; box-shadow: 0 12px 40px rgba(15,27,45,0.28); }
  .gsd-modal--sm { max-width: 400px; }
  .gsd-modal--lg { max-width: 720px; max-height: 82vh; overflow: auto; }
  .gsd-modal__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--line); padding-bottom: 14px; }
  .gsd-modal__head h3 { margin: 0; color: var(--brand); font-size: 17px; font-weight: 700; }
  .gsd-modal__close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--ink-500); line-height: 1; }
  .gsd-modal__body { margin-bottom: 18px; }
  .gsd-modal__hint { font-size: 12px; color: var(--ink-500); margin-bottom: 10px; }
  .gsd-modal__summary { font-size: 13.5px; margin-bottom: 14px; line-height: 1.6; color: var(--ink-700); }
  .gsd-modal__section-title { font-size: 14px; font-weight: 700; margin: 16px 0 10px; color: var(--ink-900); }
  .gsd-modal__footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid var(--line); }
  .gsd-field-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--ink-700); }
  .gsd-textarea { width: 100%; min-height: 110px; padding: 10px; border: 1px solid var(--line); border-radius: 6px; font-size: 13.5px; font-family: inherit; resize: vertical; }
  .gsd-file-input { width: 100%; padding: 12px; border: 2px dashed var(--line); border-radius: 6px; font-size: 13px; cursor: pointer; }
  .gsd-file-list { margin-top: 10px; color: var(--ink-700); font-size: 12.5px; }
  .gsd-file-list ul { margin-top: 6px; padding-left: 18px; max-height: 150px; overflow-y: auto; }
  .gsd-file-confirm { margin-top: 8px; font-size: 12px; color: var(--ok); }
  .gsd-uploading { margin-top: 10px; text-align: center; color: var(--ink-500); font-size: 13px; }
  .gsd-summary-box { background: var(--canvas); padding: 12px; border-radius: 6px; border: 1px solid var(--line); font-size: 12.5px; color: var(--ink-700); display: flex; flex-direction: column; gap: 4px; }
  .gsd-select-full { width: 100%; padding: 9px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px; }
  .gsd-warning-text { font-size: 12px; color: var(--danger); margin-top: 8px; }

  .gsd-status-options { display: grid; gap: 8px; }
  .gsd-status-option { padding: 11px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; background: var(--surface); font-size: 13.5px; font-weight: 600; text-align: left; transition: all 0.15s; color: var(--ink-700); }
  .gsd-status-option:hover { background: var(--canvas); border-color: var(--brand); }

  .gsd-doc-picker { max-height: 240px; overflow: auto; border: 1px solid var(--line); border-radius: 6px; padding: 8px; margin-bottom: 4px; }
  .gsd-doc-picker__item { display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 6px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; background: var(--surface); }
  .gsd-doc-picker__item--selected { background: var(--info-bg); border-color: var(--info); }
  .gsd-doc-picker__info { flex: 1; }
  .gsd-doc-picker__ref { font-size: 12.5px; font-weight: 700; color: var(--ink-900); }
  .gsd-doc-picker__meta { font-size: 11px; color: var(--ink-500); }

  .gsd-pdf-modal { background: var(--surface); border-radius: 10px; width: 92%; height: 90%; display: flex; flex-direction: column; overflow: hidden; }
  .gsd-pdf-modal__head { padding: 16px 20px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; background: var(--canvas); flex-wrap: wrap; gap: 10px; }
  .gsd-pdf-modal__head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink-900); }
  .gsd-pdf-modal__head p { margin: 4px 0 0; font-size: 12.5px; color: var(--ink-500); }
  .gsd-pdf-modal__actions { display: flex; gap: 8px; }
  .gsd-pdf-modal__body { flex: 1; padding: 16px; }
  .gsd-pdf-modal__body iframe { width: 100%; height: 100%; border: none; border-radius: 6px; }
  .gsd-pdf-modal__loading { display: flex; justify-content: center; align-items: center; height: 100%; color: var(--ink-500); }

  .gsd-toast { position: fixed; top: 20px; right: 20px; z-index: 1005; background: var(--ok); color: #fff; border-radius: 8px; padding: 14px 18px; box-shadow: 0 8px 24px rgba(15,27,45,0.22); display: flex; align-items: center; gap: 12px; min-width: 260px; font-size: 14px; font-weight: 600; }
  .gsd-toast__icon { font-size: 18px; }
  .gsd-toast button { margin-left: auto; background: rgba(255,255,255,0.22); border: none; color: #fff; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
`;

export default GestionnaireSeniorDashboard;