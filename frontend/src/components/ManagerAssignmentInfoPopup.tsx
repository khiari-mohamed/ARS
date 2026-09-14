import React from 'react';
import { X, ArrowDown, ShieldAlert, Award, UserCheck, Users, HelpCircle, UserX } from 'lucide-react';

interface ManagerAssignmentInfoPopupProps {
  open: boolean;
  onClose: () => void;
}

const ManagerAssignmentInfoPopup: React.FC<ManagerAssignmentInfoPopupProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-assignment-popup-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          maxHeight: 'min(820px, 92vh)',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          scrollbarWidth: 'thin',
        }}
      >
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ color: '#2563eb', fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Règles d'affectation
            </div>
            <h2 id="manager-assignment-popup-title" style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: 800 }}>
              Algorithme de choix du Gestionnaire
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fermer les informations d'affectation"
            title="Fermer"
            onClick={onClose}
            style={{ 
              border: '1px solid #e2e8f0', 
              background: '#f8fafc', 
              color: '#475569', 
              borderRadius: '8px', 
              padding: '8px', 
              cursor: 'pointer', 
              display: 'inline-flex',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Introduction */}
        <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: 1.6, margin: 0 }}>
          Le tableau identifie automatiquement le responsable du dossier en suivant une hiérarchie stricte. Dès qu'un palier valide est trouvé, l'affectation est résolue :
        </p>

        {/* Visual Timeline / Flowchart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
              <div style={{ width: '2px', height: '24px', background: '#cbd5e1' }}></div>
            </div>
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Contrat Associé
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Recherche de <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>assignedManager</code> ou <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>teamLeader</code>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>2</div>
              <div style={{ width: '2px', height: '24px', background: '#cbd5e1' }}></div>
            </div>
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Équipe du Chef d'équipe
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Utilisation du <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>teamId</code> pour extraire les gestionnaires de l'équipe
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>3</div>
              <div style={{ width: '2px', height: '24px', background: '#cbd5e1' }}></div>
            </div>
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Gestionnaire affecté au bordereau
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Vérification du champ <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>assignedToUser</code>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>4</div>
              <div style={{ width: '2px', height: '24px', background: '#cbd5e1' }}></div>
            </div>
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Handler actuel du document
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Champs de support direct <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>currentHandler</code> ou <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>chargeCompte</code>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>5</div>
              <div style={{ width: '2px', height: '24px', background: '#cbd5e1' }}></div>
            </div>
            <div style={{ paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Source secondaire client
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Fallback sur le champ client <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#1e293b' }}>client.chargeCompte</code>
              </div>
            </div>
          </div>

          {/* Fallback */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>✗</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                Aucun rôle assigné valide
              </div>
              <div style={{ fontSize: '13px', color: '#991b1b', marginTop: '4px', fontWeight: 600 }}>
                État de sortie: Non assigné
              </div>
            </div>
          </div>

        </div>

        {/* Legend / Badges definitions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.05em' }}>
            Correspondance des badges & Statuts
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            
            {/* Legend Item 1 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={16} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>Gestionnaire Senior</span>
              </div>
              <span style={{ display: 'inline-flex', background: '#16a34a', color: '#ffffff', fontSize: '10.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                GEST_SENIOR
              </span>
            </div>

            {/* Legend Item 2 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={16} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 500 }}>Gestionnaire Standard</span>
              </div>
              <span style={{ display: 'inline-flex', background: '#2563eb', color: '#ffffff', fontSize: '10.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                GESTIONNAIRE
              </span>
            </div>

            {/* Legend Item 3 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={16} style={{ color: '#ea580c' }} />
                <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 500 }}>Chef d'équipe (Leader de l'équipe associée)</span>
              </div>
              <span style={{ display: 'inline-flex', background: '#ea580c', color: '#ffffff', fontSize: '10.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                CHEF ÉQUIPE
              </span>
            </div>

            {/* Legend Item 4 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={16} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>Utilisateur ayant quitté l'entreprise</span>
              </div>
              <span style={{ fontSize: '13.5px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', gap: '4px' }}>
                Nom gestionnaire <strong style={{ color: '#64748b', fontWeight: 600 }}>(inactif)</strong>
              </span>
            </div>

            {/* Legend Item 5 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserX size={16} style={{ color: '#dc2626' }} />
                <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>Aucune source d'affectation viable trouvée</span>
              </div>
              <span style={{ display: 'inline-flex', border: '1px solid #dc2626', color: '#dc2626', fontSize: '10.5px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', textTransform: 'uppercase' }}>
                NON ASSIGNÉ
              </span>
            </div>

          </div>
        </div>

        {/* Footer Note */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f1f5f9', borderRadius: '8px', padding: '16px' }}>
          <ShieldAlert size={18} style={{ color: '#475569', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
            Les rôles techniques globaux <code style={{ fontWeight: 700 }}>SCAN_TEAM</code> et <code style={{ fontWeight: 700 }}>SUPER_ADMIN</code> sont systématiquement ignorés lors de l'affectation automatique. Seuls les comptes liés ayant le statut légitime de Gestionnaire, Chef d'équipe ou Gestionnaire senior seront répertoriés.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ManagerAssignmentInfoPopup;