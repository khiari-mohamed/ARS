import React, { useState } from 'react';
import { Document } from '../../types/document';
import DocumentStatusModal from './DocumentStatusModal';

interface Props {
  documents: Document[];
  onSelect: (doc: Document) => void;
  onStatusUpdate?: (doc: Document) => void;
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
}

const DocumentTable: React.FC<Props> = ({ documents, onSelect, onStatusUpdate, selectedIds = [], onSelectIds }) => {
  const [statusDoc, setStatusDoc] = useState<Document | null>(null);

  const allSelected = documents.length > 0 && documents.every(doc => selectedIds.includes(doc.id));
  const toggleAll = () => {
    if (!onSelectIds) return;
    if (allSelected) onSelectIds([]);
    else onSelectIds(documents.map(doc => doc.id));
  };
  const toggleOne = (id: string) => {
    if (!onSelectIds) return;
    if (selectedIds.includes(id)) onSelectIds(selectedIds.filter(x => x !== id));
    else onSelectIds([...selectedIds, id]);
  };

  return (
    <>
      <table className="ged-doc-table">
        <thead>
          <tr>
            <th><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
            <th>Name</th>
            <th>Type</th>
            <th>Bordereau</th>
            <th>Uploader</th>
            <th>Uploaded At</th>
            <th>
              Status
              <span
                style={{ marginLeft: 4, cursor: 'pointer' }}
                title={
                  'Status meanings:\n' +
                  '• UPLOADED: File uploaded, waiting for scan.\n' +
                  '• EN_COURS: Pending scan (in progress).\n' +
                  '• TRAITE: Processed/validated.\n' +
                  '• REJETE: Rejected.\n' +
                  '• RETOUR_ADMIN: Returned to admin bin.'
                }
              >
                ℹ️
              </span>
            </th>
            <th>SLA</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            let slaIcon = '🟢';
            if (doc.slaStatus === 'red') slaIcon = '🔴';
            else if (doc.slaStatus === 'orange') slaIcon = '🟠';
            return (
              <tr key={doc.id}>
                <td><input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleOne(doc.id)} /></td>
                <td>{doc.name}</td>
                <td>{doc.type}</td>
                <td>{doc.bordereau?.reference || '-'}</td>
                <td>{doc.uploader?.fullName || '-'}</td>
                <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                <td>
                  <span
                    className={`status-badge status-${doc.status || 'unknown'}`}
                    title={
                      doc.status === 'UPLOADED'
                        ? 'Uploaded: File uploaded, waiting for scan.'
                        : doc.status === 'EN_COURS'
                        ? 'En cours: Pending scan (in progress).' 
                        : doc.status === 'TRAITE'
                        ? 'Traité: Processed/validated.'
                        : doc.status === 'REJETE'
                        ? 'Rejeté: Rejected.'
                        : doc.status === 'RETOUR_ADMIN'
                        ? 'Retour corbeille Admin: Returned to admin bin.'
                        : doc.status || '-'
                    }
                  >
                    {doc.status || '-'}
                  </span>
                  <button style={{ marginLeft: 8 }} onClick={() => setStatusDoc(doc)} title="Update Status">✏️</button>
                </td>
                <td style={{ fontSize: 20 }}>{slaIcon}</td>
                <td>
                  <button onClick={() => onSelect(doc)}>View</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {statusDoc && (
        <DocumentStatusModal
          document={statusDoc}
          onClose={() => setStatusDoc(null)}
          onStatus={doc => {
            setStatusDoc(null);
            onStatusUpdate?.(doc);
          }}
        />
      )}
    </>
  );
};

export default DocumentTable;