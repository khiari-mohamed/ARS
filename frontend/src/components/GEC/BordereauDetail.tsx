import React, { useEffect, useState } from 'react';
import { getBordereau } from '../../api/bordereauService';
import { searchCourriers } from '../../api/gecService';

interface Props {
  bordereauId: string;
  onClose: () => void;
}

const BordereauDetail: React.FC<Props> = ({ bordereauId, onClose }) => {
  const [bordereau, setBordereau] = useState<any>(null);
  const [courriers, setCourriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBordereau(bordereauId).then(setBordereau);
    searchCourriers({ bordereauId }).then(setCourriers).finally(() => setLoading(false));
  }, [bordereauId]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,41,59,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 24px #0002', padding: '2em', minWidth: 340, maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button className="btn" style={{ position: 'absolute', top: 12, right: 12, background: '#b0bec5', color: '#222', padding: '0.3em 1em', fontSize: '1em' }} onClick={onClose}>Close</button>
        <h3>Bordereau Details</h3>
        {loading ? <div>Loading...</div> : (
          <>
            <div><strong>ID:</strong> {bordereau?.id}</div>
            <div><strong>Reference:</strong> {bordereau?.reference}</div>
            <div><strong>Client:</strong> {bordereau?.client?.name}</div>
            <div><strong>Date Reception:</strong> {bordereau?.dateReception ? new Date(bordereau.dateReception).toLocaleDateString() : '-'}</div>
            <div><strong>Status:</strong> {bordereau?.statut}</div>
            <div style={{ marginTop: 16 }}>
              <strong>Related Courriers:</strong>
              <ul>
                {courriers.map(c => (
                  <li key={c.id}>
                    {c.subject} ({c.type}, {c.status})
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BordereauDetail;
