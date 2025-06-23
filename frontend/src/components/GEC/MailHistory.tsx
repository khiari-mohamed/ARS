import React, { useEffect, useState } from 'react';
import { searchCourriers, getCourrierAuditLog, deleteCourrier, updateCourrierStatus } from '../../api/gecService';
import {
  Courrier,
  CourrierType,
  CourrierStatus,
  CourrierSearchParams,
} from '../../types/mail';
import { useAuth } from '../../contexts/AuthContext';
import { getBordereau } from '../../api/bordereauService';

const COURRIER_TYPE_LABELS: Record<CourrierType, string> = {
  REGLEMENT: 'Règlement',
  RELANCE: 'Relance',
  RECLAMATION: 'Réclamation',
  AUTRE: 'Autre',
};
const COURRIER_STATUS_LABELS: Record<CourrierStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  FAILED: 'Échec',
  PENDING_RESPONSE: 'En attente de réponse',
  RESPONDED: 'Répondu',
};

const initialFilter: CourrierSearchParams = {
  type: undefined,
  status: undefined,
  clientId: '',
  bordereauId: '',
  createdAfter: '',
  createdBefore: '',
};

const MailHistory: React.FC = () => {
  const [courriers, setCourriers] = useState<Courrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CourrierSearchParams>(initialFilter);
  const [selected, setSelected] = useState<Courrier | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusValue, setStatusValue] = useState<string>('');
  const [showBordereau, setShowBordereau] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    const cleanFilter = Object.fromEntries(
      Object.entries(filter).filter(([_, v]) => v !== '' && v !== undefined)
    ) as CourrierSearchParams;
    searchCourriers(cleanFilter)
      .then(setCourriers)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: value === '' ? undefined : value,
    }));
  };

  return (
    <div>
      <h3>Mail History</h3>
      <form
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          alignItems: 'flex-end',
        }}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div>
          <label>Type</label>
          <select
            name="type"
            value={filter.type || ''}
            onChange={handleChange}
            style={{ minWidth: 120 }}
          >
            <option value="">All</option>
            <option value="REGLEMENT">Règlement</option>
            <option value="RELANCE">Relance</option>
            <option value="RECLAMATION">Réclamation</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select
            name="status"
            value={filter.status || ''}
            onChange={handleChange}
            style={{ minWidth: 120 }}
          >
            <option value="">All</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SENT">Envoyé</option>
            <option value="FAILED">Échec</option>
            <option value="PENDING_RESPONSE">En attente de réponse</option>
            <option value="RESPONDED">Répondu</option>
          </select>
        </div>
        <div>
          <label>Client ID</label>
          <input
            name="clientId"
            value={filter.clientId || ''}
            onChange={handleChange}
            placeholder="Client ID"
            style={{ minWidth: 120 }}
          />
        </div>
        <div>
          <label>Bordereau ID</label>
          <input
            name="bordereauId"
            value={filter.bordereauId || ''}
            onChange={handleChange}
            placeholder="Bordereau ID"
            style={{ minWidth: 120 }}
          />
        </div>
        <div>
          <label>Created After</label>
          <input
            type="date"
            name="createdAfter"
            value={filter.createdAfter || ''}
            onChange={handleChange}
            style={{ minWidth: 140 }}
          />
        </div>
        <div>
          <label>Created Before</label>
          <input
            type="date"
            name="createdBefore"
            value={filter.createdBefore || ''}
            onChange={handleChange}
            style={{ minWidth: 140 }}
          />
        </div>
        <button type="submit" className="btn" style={{ height: 32 }}>Filter</button>
        <button
          type="button"
          className="btn"
          style={{ height: 32, background: '#b0bec5', color: '#222' }}
          onClick={() => setFilter(initialFilter)}
        >
          Reset
        </button>
      </form>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Type</th>
              <th>Status</th>
              <th>Bordereau</th>
              <th>Client</th>
              <th>Sent At</th>
              <th>Response At</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courriers.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: '#888' }}>
                  No courriers found.
                </td>
              </tr>
            ) : (
              courriers.map((c) => {
                // SLA breach: PENDING_RESPONSE and sentAt > client SLA
                const [slaBreach, setSlaBreach] = React.useState(false);
                React.useEffect(() => {
                  let isMounted = true;
                  if (c.status === 'PENDING_RESPONSE' && c.sentAt && c.bordereauId) {
                    getBordereau(c.bordereauId).then(bordereau => {
                      const client = bordereau?.client;
                      const slaDays = (client?.slaConfig?.reglementDelay || client?.reglementDelay || 3);
                      const sent = new Date(c.sentAt || '').getTime();
                      if (isMounted && Date.now() - sent > slaDays * 24 * 60 * 60 * 1000) setSlaBreach(true);
                    });
                  }
                  return () => { isMounted = false; };
                }, [c.status, c.sentAt, c.bordereauId]);
                return (
                  <tr key={c.id} style={slaBreach ? { background: '#ffebee' } : {}}>
                    <td>{c.subject}</td>
                    <td>{COURRIER_TYPE_LABELS[c.type]}</td>
                    <td>{COURRIER_STATUS_LABELS[c.status]}</td>
                    <td>{c.bordereauId || '-'}</td>
                    <td>{c.clientId || '-'}</td>
                    <td>{c.sentAt ? new Date(c.sentAt).toLocaleString() : '-'}</td>
                    <td>{c.responseAt ? new Date(c.responseAt).toLocaleString() : '-'}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
                    <td>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '-'}</td>
                    <td style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn" onClick={() => setSelected(c)}>
                        Details
                      </button>
                      {c.status === 'DRAFT' && (user?.role === 'ADMINISTRATEUR' || user?.role === 'SUPER_ADMIN' || c.uploadedById === user?.id) && (
                        <button className="btn" style={{ background: '#e57373', color: '#fff' }}
                          onClick={async () => {
                            if (window.confirm('Delete this draft?')) {
                              setDeleting(true);
                              await deleteCourrier(c.id);
                              setDeleting(false);
                              setFilter({ ...filter }); // refresh
                            }
                          }}
                          disabled={deleting}
                        >
                          Delete
                        </button>
                      )}
                      {slaBreach && <span style={{ color: '#d32f2f', fontWeight: 600 }}>SLA Breach</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
      {selected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30,41,59,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 24px #0002',
              padding: '2em',
              minWidth: 340,
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="btn"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: '#b0bec5',
                color: '#222',
                padding: '0.3em 1em',
                fontSize: '1em',
              }}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            <h3 style={{ marginTop: 0 }}>Courrier Details</h3>
            <div>
              <strong>Subject:</strong> {selected.subject}
              <br />
              <strong>Type:</strong> {COURRIER_TYPE_LABELS[selected.type]}
              <br />
              <strong>Status:</strong> {COURRIER_STATUS_LABELS[selected.status]}
              <br />
              <strong>Bordereau:</strong> {selected.bordereauId || '-'}
              {selected.bordereauId && (
                <button className="btn" style={{ marginLeft: 8 }} onClick={() => setShowBordereau(selected.bordereauId!)}>
                  View Bordereau
                </button>
              )}
              <br />
              <strong>Client:</strong> {selected.clientId || '-'}
              <br />
              <strong>Sent At:</strong> {selected.sentAt ? new Date(selected.sentAt).toLocaleString() : '-'}
              <br />
              <strong>Response At:</strong> {selected.responseAt ? new Date(selected.responseAt).toLocaleString() : '-'}
              <br />
              <strong>Created At:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}
              <br />
              <strong>Updated At:</strong> {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : '-'}
              <br />
              <strong>Template Used:</strong> {selected.templateUsed}
              <br />
              <strong>Body:</strong>
              <pre style={{ background: '#f7f7f7', borderRadius: 6, padding: '1em', marginTop: 8, fontSize: '1em', color: '#263238', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selected.body}
              </pre>
              {/* Status update */}
              {(user?.role === 'ADMINISTRATEUR' || user?.role === 'SUPER_ADMIN' || selected.uploadedById === user?.id) && (
                <div style={{ marginTop: 16 }}>
                  <label>Update Status: </label>
                  <select
                    value={statusValue || selected.status}
                    onChange={e => setStatusValue(e.target.value)}
                    style={{ minWidth: 140 }}
                    disabled={statusUpdating}
                  >
                    {Object.keys(COURRIER_STATUS_LABELS).map(s => (
                      <option key={s} value={s}>{COURRIER_STATUS_LABELS[s as CourrierStatus]}</option>
                    ))}
                  </select>
                  <button
                    className="btn"
                    style={{ marginLeft: 8 }}
                    disabled={statusUpdating || statusValue === selected.status}
                    onClick={async () => {
                      setStatusUpdating(true);
                      await updateCourrierStatus(selected.id, { status: statusValue });
                      setStatusUpdating(false);
                      setSelected(null);
                      setFilter({ ...filter }); // refresh
                    }}
                  >
                    Update
                  </button>
                </div>
              )}
              {/* Delete draft */}
              {selected.status === 'DRAFT' && (user?.role === 'ADMINISTRATEUR' || user?.role === 'SUPER_ADMIN' || selected.uploadedById === user?.id) && (
                <button
                  className="btn"
                  style={{ background: '#e57373', color: '#fff', marginTop: 12 }}
                  disabled={deleting}
                  onClick={async () => {
                    if (window.confirm('Delete this draft?')) {
                      setDeleting(true);
                      await deleteCourrier(selected.id);
                      setDeleting(false);
                      setSelected(null);
                      setFilter({ ...filter }); // refresh
                    }
                  }}
                >
                  Delete Draft
                </button>
              )}
              {/* Audit log */}
              <div style={{ marginTop: 18 }}>
                <button
                  className="btn"
                  onClick={async () => {
                    setAuditLoading(true);
                    const logs = await getCourrierAuditLog(selected.id);
                    setAuditLog(logs);
                    setAuditLoading(false);
                  }}
                  disabled={auditLoading}
                >
                  {auditLoading ? 'Loading Audit Log...' : 'Show Audit Log'}
                </button>
                {auditLog.length > 0 && (
                  <div style={{ marginTop: 10, background: '#f1f8e9', borderRadius: 6, padding: 10 }}>
                    <strong>Audit Log:</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {auditLog.map((log, idx) => (
                        <li key={log.id || idx}>
                          <span style={{ color: '#3949ab', fontWeight: 600 }}>{log.action}</span> by {log.userId} at {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                          {log.details && (
                            <pre style={{ fontSize: '0.95em', color: '#263238', background: '#f7f7f7', borderRadius: 4, padding: 6, margin: 0 }}>{JSON.stringify(log.details, null, 2)}</pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    {showBordereau && (
        <React.Suspense fallback={<div>Loading...</div>}>
          {React.createElement(require('./BordereauDetail').default, {
            bordereauId: showBordereau,
            onClose: () => setShowBordereau(null),
          })}
        </React.Suspense>
      )}
    </div>
  );
};

export default MailHistory;