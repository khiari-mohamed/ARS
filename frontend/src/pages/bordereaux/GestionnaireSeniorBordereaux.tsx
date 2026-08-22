
import { useEffect, useMemo, useState } from "react";
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Autocomplete } from '@mui/material';
import { Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import "../../styles/chef-equipe.css";
import BordereauSLAIndicators from '../../components/BordereauSLAIndicators';
import type { BordereauSLAIndicators as BordereauSLAIndicatorsType, SLAIndicator } from '../../types/sla';

// ---------------------------------------------------------------------------
// Statuts considered "bordereau traité" — kept identical to the literal array
// already used throughout this file for tabs/stats/counts, so grouping
// behaviour is unchanged. A separate, slightly broader set is used only for
// deciding when SLA end-dates are applicable (adds PAYE, which the schema
// also treats as a completed state).
// ---------------------------------------------------------------------------
const TAB_TRAITE_STATUTS = ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'];
const SLA_COMPLETE_STATUTS = ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'];

type SlaStatus = 'GREEN' | 'ORANGE' | 'RED' | 'PENDING';

const daysBetween = (start?: string | Date | null, end?: string | Date | null): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
};

const buildIndicator = (days: number | null, thresholdDays: number): SLAIndicator => {
  if (days === null) {
    return {
      applicable: false,
      frozen: false,
      overdue: false,
      daysElapsed: null,
      daysRemaining: null,
      percentElapsed: null,
      status: null,
    };
  }

  const status: SLAIndicator['status'] = days <= thresholdDays ? 'GREEN' : 'RED';
  return {
    applicable: true,
    frozen: true,
    overdue: days > thresholdDays,
    daysElapsed: days,
    daysRemaining: Math.max(thresholdDays - days, 0),
    percentElapsed: Math.round((days / thresholdDays) * 100),
    status,
  };
};

// Prefer the bordereau's own dateExecutionVirement; fall back to the first
// EXECUTE order de virement's dateEtatFinal if the direct field isn't set.
const getVirementExecutionDate = (bordereau: any): string | Date | null => {
  if (bordereau.dateExecutionVirement) return bordereau.dateExecutionVirement;
  const executed = (bordereau.ordresVirement || []).find(
    (ov: any) => ov.etatVirement === 'EXECUTE' && ov.dateEtatFinal
  );
  return executed?.dateEtatFinal || null;
};

/**
 * Computes the 4 SLA indicators exactly as specified:
 * - SLA Scan          = dateFinScan − dateReception
 * - SLA Traitement     = dateCloture (bordereau traité) − dateReception
 * - SLA Règlement BO   = date d'exécution du virement (bordereau traité) − dateReception
 * - SLA Règlement Fin. = date d'exécution du virement − dateCloture (finalisation traitement)
 */
const computeBordereauSLA = (bordereau: any): BordereauSLAIndicatorsType => {
  const delai = bordereau.delaiReglement || 30;
  const isTraite = SLA_COMPLETE_STATUTS.includes(bordereau.statut);
  const traitementEndDate = isTraite ? (bordereau.dateCloture || bordereau.dateReelleCloture) : null;
  const virementDate = isTraite ? getVirementExecutionDate(bordereau) : null;

  return {
    slaScan: buildIndicator(daysBetween(bordereau.dateReception, bordereau.dateFinScan), delai),
    slaTraitement: buildIndicator(daysBetween(bordereau.dateReception, traitementEndDate), delai),
    slaReglementBO: buildIndicator(daysBetween(bordereau.dateReception, virementDate), delai),
    slaReglementFinance: buildIndicator(
      traitementEndDate ? daysBetween(traitementEndDate, virementDate) : null,
      delai
    ),
  } as BordereauSLAIndicatorsType;
};

// Fixed "Durée de traitement": dateCloture − dateReception, only meaningful
// once the bordereau is actually traité. This replaces the previously
// unreliable bordereau.dureeTraitement backend field with a value computed
// directly from the same raw dates driving the SLA indicators above, so the
// number shown here and the "SLA Traitement" badge can never disagree.
const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
  const isTraite = SLA_COMPLETE_STATUTS.includes(bordereau.statut);
  const endDate = isTraite ? (bordereau.dateCloture || bordereau.dateReelleCloture) : null;
  const days = daysBetween(bordereau.dateReception, endDate);
  const delai = bordereau.delaiReglement || 30;
  return { days, isOnTime: days !== null && days <= delai };
};

// Overall status used only for the SLA filter dropdown (kept 3-state to
// preserve the existing filter UX): for a completed bordereau, judged on the
// financial-completion SLA; for one still in progress, judged on elapsed
// time against the contractual delay.
const getOverallSlaStatus = (bordereau: any): 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'UNKNOWN' => {
  const delai = bordereau.delaiReglement || 30;
  const isTraite = SLA_COMPLETE_STATUTS.includes(bordereau.statut);

  if (isTraite) {
    const virementDate = getVirementExecutionDate(bordereau);
    const days = daysBetween(bordereau.dateReception, virementDate);
    if (days === null) return 'UNKNOWN';
    return days <= delai ? 'ON_TIME' : 'OVERDUE';
  }

  const elapsed = daysBetween(bordereau.dateReception, new Date());
  if (elapsed === null) return 'UNKNOWN';
  if (elapsed > delai) return 'OVERDUE';
  if (elapsed > delai * 0.8) return 'AT_RISK';
  return 'ON_TIME';
};

function GestionnaireSeniorBordereaux() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'en-cours' | 'traites'>('en-cours');
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'en-cours' | 'traites'>('en-cours');
  const [statsModalData, setStatsModalData] = useState<any[]>([]);

  const [clients, setClients] = useState<any[]>([]);
  const [referenceFilter, setReferenceFilter] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [virementFilter, setVirementFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState<'all' | 'respecte' | 'a_risque' | 'en_retard'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
    loadClients();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/bordereaux/gestionnaire-senior/corbeille');
      const data = response.data;
      const allBordereaux = [...(data.enCours || []), ...(data.traites || [])];
      setTeamBordereaux(allBordereaux);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const clientsData = await fetchClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const openStatsModal = (type: 'en-cours' | 'traites') => {
    const data = type === 'en-cours'
      ? teamBordereaux.filter(b => !TAB_TRAITE_STATUTS.includes(b.statut))
      : teamBordereaux.filter(b => TAB_TRAITE_STATUTS.includes(b.statut));
    setStatsModalType(type);
    setStatsModalData(data);
    setShowStatsModal(true);
  };

  // Pure derivation — recomputed only when an actual input changes, instead
  // of the previous pattern of a separate `filteredData` state kept in sync
  // via a useEffect. Identical output, fewer renders.
  const filteredData = useMemo(() => {
    let filtered = [...teamBordereaux];

    if (referenceFilter) {
      filtered = filtered.filter(b => b.reference?.toLowerCase().includes(referenceFilter.toLowerCase()));
    }
    if (selectedClient) {
      filtered = filtered.filter(b => b.clientId === selectedClient);
    }
    if (virementFilter) {
      if (virementFilter === 'NONE') {
        filtered = filtered.filter(b => !b.ordresVirement || b.ordresVirement.length === 0);
      } else {
        filtered = filtered.filter(
          b => b.ordresVirement && b.ordresVirement.length > 0 && b.ordresVirement[0].etatVirement === virementFilter
        );
      }
    }
    if (slaFilter !== 'all') {
      filtered = filtered.filter(b => {
        const status = getOverallSlaStatus(b);
        if (slaFilter === 'en_retard') return status === 'OVERDUE';
        if (slaFilter === 'a_risque') return status === 'AT_RISK';
        if (slaFilter === 'respecte') return status === 'ON_TIME';
        return true;
      });
    }
    if (dateFrom) {
      filtered = filtered.filter(b => new Date(b.dateReception) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(b => new Date(b.dateReception) <= new Date(dateTo));
    }

    return filtered;
  }, [teamBordereaux, referenceFilter, selectedClient, virementFilter, slaFilter, dateFrom, dateTo]);

  const tabData = useMemo(() => {
    return activeTab === 'en-cours'
      ? filteredData.filter(b => !TAB_TRAITE_STATUTS.includes(b.statut))
      : filteredData.filter(b => TAB_TRAITE_STATUTS.includes(b.statut));
  }, [filteredData, activeTab]);

  const resetFilters = () => {
    setReferenceFilter('');
    setSelectedClient('');
    setVirementFilter('');
    setSlaFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportExcel = () => {
    const rows = tabData.map(b => {
      const sla = computeBordereauSLA(b);
      const duree = getDureeTraitement(b);
      return {
        'Client / Prestataire': b.client?.name || 'N/A',
        'Référence Bordereau': b.reference,
        'Date réception': b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : '-',
        'Bulletins de soins': b.nombreBS || 0,
        'Date fin de scan': b.dateFinScan ? new Date(b.dateFinScan).toLocaleDateString('fr-FR') : '-',
        'Délai contractuel (j)': b.delaiReglement || 0,
        'Durée de traitement (j)': duree.days ?? '-',
        'SLA Scan (j)': sla.slaScan?.daysElapsed ?? '-',
        'SLA Scan Statut': sla.slaScan?.status ?? '-',
        'SLA Traitement (j)': sla.slaTraitement?.daysElapsed ?? '-',
        'SLA Traitement Statut': sla.slaTraitement?.status ?? '-',
        'SLA Règlement BO (j)': sla.slaReglementBO?.daysElapsed ?? '-',
        'SLA Règlement BO Statut': sla.slaReglementBO?.status ?? '-',
        'SLA Règlement Finance (j)': sla.slaReglementFinance?.daysElapsed ?? '-',
        'SLA Règlement Finance Statut': sla.slaReglementFinance?.status ?? '-',
        'Statut Virement': b.ordresVirement?.[0]?.etatVirement || 'Aucun',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bordereaux');
    const tabLabel = activeTab === 'en-cours' ? 'en-cours' : 'traites';
    XLSX.writeFile(workbook, `bordereaux_${tabLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const slaBadge = (status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'UNKNOWN') => {
    if (status === 'UNKNOWN') return <span className="gsd-tag gsd-tag--neutral">—</span>;
    if (status === 'OVERDUE') return <span className="gsd-status gsd-status--danger">● En retard</span>;
    if (status === 'AT_RISK') return <span className="gsd-status gsd-status--warn">▲ À risque</span>;
    return <span className="gsd-status gsd-status--ok">✓ Respecté</span>;
  };

  const virementBadge = (bordereau: any) => {
    const virement = bordereau.ordresVirement?.[0];
    if (!virement) return <span className="gsd-tag gsd-tag--neutral">Pas de virement</span>;
    const map: Record<string, { cls: string; icon: string; label: string }> = {
      EXECUTE: { cls: 'gsd-status--ok', icon: '✅', label: 'Exécuté' },
      REJETE: { cls: 'gsd-status--danger', icon: '❌', label: 'Rejeté' },
      EN_COURS: { cls: 'gsd-status--warn', icon: '🔄', label: 'En cours' },
      EN_COURS_VALIDATION: { cls: 'gsd-status--info', icon: '⏳', label: 'En attente' },
    };
    const cfg = map[virement.etatVirement] || map.EN_COURS_VALIDATION;
    return <span className={`gsd-status ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>;
  };

  const dureeBadge = (bordereau: any) => {
    const duree = getDureeTraitement(bordereau);
    if (duree.days === null) return <span className="gsd-tag gsd-tag--neutral">En cours</span>;
    return (
      <span className={`gsd-status ${duree.isOnTime ? 'gsd-status--ok' : 'gsd-status--danger'}`}>
        {duree.days} j
      </span>
    );
  };

  const enCoursCount = teamBordereaux.filter(b => !TAB_TRAITE_STATUTS.includes(b.statut)).length;
  const traitesCount = teamBordereaux.filter(b => TAB_TRAITE_STATUTS.includes(b.statut)).length;

  return (
    <div className="gsd-root">
      <style>{`
        .gsd-root {
          --ink-900:#0F1B2D; --ink-700:#24344A; --ink-500:#5B6B82; --ink-300:#9AA7B8;
          --line:#E2E6EC; --surface:#FFFFFF; --canvas:#F3F5F9;
          --brand:#A82A2E; --brand-dark:#7E1F22;
          --ok:#1E8E5A; --ok-bg:#E7F5EE; --warn:#B4740E; --warn-bg:#FBF1DF;
          --danger:#B3272D; --danger-bg:#FBEAEA; --info:#2A5DA8; --info-bg:#E9F0FA;
          font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          background: var(--canvas); min-height: 100vh; color: var(--ink-900);
          padding: 24px 20px 60px;
        }
        .gsd-root * { box-sizing: border-box; }
        @media (max-width: 640px) { .gsd-root { padding: 16px 12px 48px; } }

        .gsd-wrap { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

        .gsd-header {
          background: linear-gradient(135deg, var(--ink-900) 0%, #16263D 100%);
          border-bottom: 3px solid var(--brand);
          border-radius: 10px;
          padding: 28px 24px;
          color: white;
        }
        .gsd-header-eyebrow {
          display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
          background: rgba(168,42,46,0.25); color: #F3C6C7; padding: 3px 10px; border-radius: 20px;
          margin-bottom: 10px; font-weight: 600;
        }
        .gsd-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.2px; }
        .gsd-header p { color: #C4CCDA; font-size: 13px; margin: 0; }

        .gsd-stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;
        }
        .gsd-stat-card {
          background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--brand);
          border-radius: 10px; padding: 18px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .gsd-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,27,45,0.08); }
        .gsd-stat-num {
          font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 700; font-size: 30px;
          color: var(--ink-900); line-height: 1;
        }
        .gsd-stat-label { font-size: 13px; color: var(--ink-500); font-weight: 600; margin-top: 8px; }
        .gsd-stat-hint { font-size: 11px; color: var(--ink-300); margin-top: 4px; }

        .gsd-panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
        .gsd-panel--flush { padding: 0; overflow: hidden; }
        .gsd-panel-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .gsd-panel-title { font-size: 16px; font-weight: 700; color: var(--ink-700); margin: 0; }

        .gsd-filter-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;
          align-items: flex-end;
        }
        .gsd-field { display: flex; flex-direction: column; gap: 4px; }
        .gsd-field label {
          font-size: 11px; font-weight: 600; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.05em;
        }
        .gsd-field input, .gsd-field select {
          padding: 7px 9px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px; color: var(--ink-700);
          background: var(--surface);
        }
        .gsd-field input:focus, .gsd-field select:focus { outline: 2px solid var(--info); outline-offset: 1px; }

        .gsd-btn {
          border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;
          padding: 8px 14px; transition: transform 0.1s ease, opacity 0.15s ease; display: inline-flex;
          align-items: center; gap: 6px;
        }
        .gsd-btn:not(:disabled):hover { transform: translateY(-1px); }
        .gsd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .gsd-btn--brand { background: var(--brand); color: white; }
        .gsd-btn--brand:not(:disabled):hover { background: var(--brand-dark); }
        .gsd-btn--ok { background: var(--ok); color: white; }
        .gsd-btn--neutral { background: var(--canvas); color: var(--ink-700); border: 1px solid var(--line); }

        .gsd-tabs { display: flex; border-bottom: 1px solid var(--line); background: var(--surface); }
        .gsd-tab {
          padding: 14px 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 700;
          color: var(--ink-500); border-bottom: 3px solid transparent; transition: color 0.15s ease;
        }
        .gsd-tab.active { color: var(--brand); border-bottom-color: var(--brand); }

        .gsd-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .gsd-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .gsd-table thead th {
          background: var(--ink-900); color: white; text-transform: uppercase; letter-spacing: 0.03em;
          font-size: 11.5px; font-weight: 700; padding: 11px 10px; text-align: left; white-space: nowrap;
        }
        .gsd-table tbody td { padding: 11px 10px; font-size: 13px; color: var(--ink-700); border-bottom: 1px solid var(--line); }
        .gsd-table tbody tr:nth-child(even) { background: #FAFBFD; }
        .gsd-table tbody tr:hover { background: #F0F3F8; }
        .gsd-cell--ref {
          font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 600; color: var(--brand-dark);
        }

        .gsd-row--locked {
          background-image: repeating-linear-gradient(135deg, rgba(15,27,45,0.035) 0 6px, transparent 6px 12px);
          box-shadow: inset 3px 0 0 var(--ink-300);
        }

        .gsd-status {
          display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 20px;
          font-size: 11px; font-weight: 700; white-space: nowrap;
        }
        .gsd-status--ok { background: var(--ok-bg); color: var(--ok); }
        .gsd-status--warn { background: var(--warn-bg); color: var(--warn); }
        .gsd-status--danger { background: var(--danger-bg); color: var(--danger); }
        .gsd-status--info { background: var(--info-bg); color: var(--info); }

        .gsd-tag {
          display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .gsd-tag--neutral { background: var(--canvas); color: var(--ink-500); }
        .gsd-tag-row { display: flex; flex-wrap: wrap; gap: 4px; }

        .gsd-progress-track { width: 46px; height: 6px; border-radius: 4px; background: var(--line); overflow: hidden; display: inline-block; }
        .gsd-progress-fill { height: 100%; }

        .gsd-perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .gsd-perf-card {
          background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; text-align: center;
        }
        .gsd-perf-num {
          font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 700; font-size: 28px; margin-bottom: 6px;
        }
        .gsd-perf-label { font-size: 13px; font-weight: 700; }

        .gsd-empty { text-align: center; padding: 60px 20px; color: var(--ink-500); }
        .gsd-empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.6; }

        .gsd-overlay {
          position: fixed; inset: 0; background: rgba(15,27,45,0.55); display: flex; align-items: center;
          justify-content: center; z-index: 1000;
        }
        .gsd-modal {
          background: var(--surface); border-radius: 10px; width: 90%; max-width: 1200px; max-height: 80vh;
          overflow: hidden; box-shadow: 0 20px 40px rgba(15,27,45,0.3); display: flex; flex-direction: column;
        }
        .gsd-modal-header {
          padding: 18px 22px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between;
          align-items: center; background: var(--canvas);
        }
        .gsd-modal-body { padding: 18px 22px; overflow-y: auto; }

        .gsd-pagination { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 16px; flex-wrap: wrap; }
      `}</style>

      <div className="gsd-wrap">
        {/* Header */}
        <div className="gsd-header">
          <span className="gsd-header-eyebrow">Gestionnaire Senior</span>
          <h1>Bordereaux</h1>
          <p>Gestion autonome de vos clients assignés — travail indépendant</p>
        </div>

        {/* Quick Stats */}
        <div className="gsd-stats-grid">
          <div className="gsd-stat-card" onClick={() => openStatsModal('en-cours')}>
            <div className="gsd-stat-num">{enCoursCount}</div>
            <div className="gsd-stat-label">⏳ En cours</div>
            <div className="gsd-stat-hint">Cliquer pour voir le détail</div>
          </div>
          <div className="gsd-stat-card" onClick={() => openStatsModal('traites')}>
            <div className="gsd-stat-num">{traitesCount}</div>
            <div className="gsd-stat-label">✅ Traités</div>
            <div className="gsd-stat-hint">Cliquer pour voir le détail</div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="gsd-panel">
          <div className="gsd-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter style={{ width: '14px', height: '14px', color: 'var(--info)' }} />
              <span className="gsd-panel-title">Filtres de recherche</span>
            </div>
            <button className="gsd-btn gsd-btn--brand" onClick={handleExportExcel} disabled={tabData.length === 0}>
              <Download style={{ width: '14px', height: '14px' }} />
              Exporter ({tabData.length})
            </button>
          </div>
          <div className="gsd-filter-grid">
            <div className="gsd-field">
              <label>Référence</label>
              <input type="text" placeholder="Rechercher..." value={referenceFilter} onChange={(e) => setReferenceFilter(e.target.value)} />
            </div>
            <div className="gsd-field">
              <label>Client</label>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name || ''}
                value={clients.find(c => c.id === selectedClient) || null}
                onChange={(e, newValue) => setSelectedClient(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input {...params.inputProps} type="text" placeholder="Sélectionner..." style={{ padding: '7px 9px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', width: '100%', color: 'var(--ink-700)' }} />
                  </div>
                )}
              />
            </div>
            <div className="gsd-field">
              <label>Statut Virement</label>
              <select value={virementFilter} onChange={(e) => setVirementFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="EXECUTE">✅ Exécuté</option>
                <option value="EN_COURS">🔄 En cours</option>
                <option value="EN_COURS_VALIDATION">⏳ En attente validation</option>
                <option value="REJETE">❌ Rejeté</option>
                <option value="NONE">Pas de virement</option>
              </select>
            </div>
            <div className="gsd-field">
              <label>SLA global</label>
              <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value as any)}>
                <option value="all">📊 Tous ({teamBordereaux.length})</option>
                <option value="en_retard">● En retard ({teamBordereaux.filter(b => getOverallSlaStatus(b) === 'OVERDUE').length})</option>
                <option value="a_risque">▲ À risque ({teamBordereaux.filter(b => getOverallSlaStatus(b) === 'AT_RISK').length})</option>
                <option value="respecte">✓ Respecté ({teamBordereaux.filter(b => getOverallSlaStatus(b) === 'ON_TIME').length})</option>
              </select>
            </div>
            <div className="gsd-field">
              <label>Date début</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="gsd-field">
              <label>Date fin</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="gsd-field">
              <label>&nbsp;</label>
              <button className="gsd-btn gsd-btn--neutral" onClick={resetFilters}>Effacer</button>
            </div>
          </div>
        </div>

        {/* Tabs + Table */}
        <div className="gsd-panel gsd-panel--flush">
          <div className="gsd-tabs">
            <button className={`gsd-tab ${activeTab === 'en-cours' ? 'active' : ''}`} onClick={() => setActiveTab('en-cours')}>
              En cours ({enCoursCount})
            </button>
            <button className={`gsd-tab ${activeTab === 'traites' ? 'active' : ''}`} onClick={() => setActiveTab('traites')}>
              Traités ({traitesCount})
            </button>
          </div>

          {loading ? (
            <div className="gsd-empty">
              <div className="gsd-empty-icon">⏳</div>
              <p>Chargement des dossiers...</p>
            </div>
          ) : tabData.length === 0 ? (
            <div className="gsd-empty">
              <div className="gsd-empty-icon">📋</div>
              <p>Aucun dossier {activeTab === 'en-cours' ? 'en cours' : 'traité'}.</p>
            </div>
          ) : (
            <div className="gsd-table-scroll">
              <table className="gsd-table">
                <thead>
                  <tr>
                    <th>Client / Prestataire</th>
                    <th>Référence</th>
                    <th>Date réception</th>
                    <th>Bulletins de soins</th>
                    <th>Date fin scan</th>
                    <th>Délai contractuel</th>
                    <th>Durée traitement</th>
                    <th>SLA (Scan / Traitement / Règl. BO / Règl. Finance)</th>
                    <th>Statut Virement</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData.map((bordereau) => {
                    const locked = bordereau.statut === 'VIREMENT_EXECUTE';
                    return (
                      <tr key={bordereau.id} className={locked ? 'gsd-row--locked' : ''}>
                        <td>{bordereau.client?.name || 'N/A'}</td>
                        <td className="gsd-cell--ref">
                          {bordereau.reference}
                          {locked && <span className="gsd-tag gsd-tag--neutral" style={{ marginLeft: '6px' }}>🔒 Verrouillé</span>}
                        </td>
                        <td>{bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                        <td>
                          <div className="gsd-tag-row">
                            <span className="gsd-status gsd-status--info">{bordereau.nombreBS || 0} BS</span>
                            {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--ink-500)' }}>
                                ({bordereau.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length} traités)
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR') : '-'}</td>
                        <td><span className="gsd-status gsd-status--warn">{bordereau.delaiReglement || 0} j</span></td>
                        <td>{dureeBadge(bordereau)}</td>
                        <td><BordereauSLAIndicators sla={computeBordereauSLA(bordereau)} /></td>
                        <td>{virementBadge(bordereau)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Section */}
        <div className="gsd-panel">
          <div className="gsd-panel-header">
            <h2 className="gsd-panel-title" style={{ fontSize: '18px' }}>📊 Performance Gestionnaire Senior</h2>
          </div>
          <div className="gsd-perf-grid">
            <div className="gsd-perf-card">
              <div className="gsd-perf-num" style={{ color: 'var(--info)' }}>{teamBordereaux.length}</div>
              <div className="gsd-perf-label" style={{ color: 'var(--info)' }}>Total bordereaux</div>
            </div>
            <div className="gsd-perf-card">
              <div className="gsd-perf-num" style={{ color: 'var(--ok)' }}>{traitesCount}</div>
              <div className="gsd-perf-label" style={{ color: 'var(--ok)' }}>Bordereaux traités</div>
            </div>
            <div className="gsd-perf-card">
              <div className="gsd-perf-num" style={{ color: 'var(--warn)' }}>{Math.round((teamBordereaux.length / 20) * 100) || 0}%</div>
              <div className="gsd-perf-label" style={{ color: 'var(--warn)' }}>Charge moyenne</div>
            </div>
            <div className="gsd-perf-card">
              <div className="gsd-perf-num" style={{ color: 'var(--brand)' }}>
                {teamBordereaux.length > 0 ? Math.round((traitesCount / teamBordereaux.length) * 100) : 0}%
              </div>
              <div className="gsd-perf-label" style={{ color: 'var(--brand)' }}>Taux de réussite</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="gsd-overlay">
          <div className="gsd-modal">
            <div className="gsd-modal-header">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink-900)' }}>
                Dossiers {statsModalType === 'en-cours' ? 'En Cours' : 'Traités'} ({statsModalData.length})
              </h2>
              <button className="gsd-btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => setShowStatsModal(false)}>
                Fermer
              </button>
            </div>
            <div className="gsd-modal-body">
              {statsModalData.length === 0 ? (
                <div className="gsd-empty">
                  <div className="gsd-empty-icon">📋</div>
                  <p>Aucun dossier {statsModalType === 'en-cours' ? 'en cours' : 'traité'}</p>
                </div>
              ) : (
                <div className="gsd-table-scroll">
                  <table className="gsd-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Client</th>
                        <th>Statut</th>
                        <th>Date Réception</th>
                        <th>Documents</th>
                        <th>Délai</th>
                        <th>Durée traitement</th>
                        <th>SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau) => (
                        <tr key={bordereau.id}>
                          <td className="gsd-cell--ref">{bordereau.reference}</td>
                          <td>{bordereau.client?.name || 'N/A'}</td>
                          <td>
                            <span className={`gsd-status ${TAB_TRAITE_STATUTS.includes(bordereau.statut) ? 'gsd-status--ok' : 'gsd-status--info'}`}>
                              {bordereau.statut}
                            </span>
                          </td>
                          <td>{bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                          <td><span className="gsd-status gsd-status--info">{bordereau.nombreBS || 0} BS</span></td>
                          <td><span className="gsd-status gsd-status--warn">{bordereau.delaiReglement || 30} j</span></td>
                          <td>{dureeBadge(bordereau)}</td>
                          <td><BordereauSLAIndicators sla={computeBordereauSLA(bordereau)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionnaireSeniorBordereaux;