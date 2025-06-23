import React, { useEffect, useState } from 'react';
import DocumentUpload from '../../components/GED/DocumentUpload';
import DocumentTable from '../../components/GED/DocumentTable';
import DocumentViewer from '../../components/GED/DocumentViewer';
import DocumentFilters from '../../components/GED/DocumentFilters';
import DocumentTagModal from '../../components/GED/DocumentTagModal';
import DocumentAssignModal from '../../components/GED/DocumentAssignModal';
import DocumentAuditTrail from '../../components/GED/DocumentAuditTrail';
import GEDDashboard from '../../components/GED/GEDDashboard';
import { searchDocuments, tagDocument, assignDocument } from '../../api/gedService';
import { Document, DocumentSearchParams } from '../../types/document';
import { useAuth } from '../../hooks/useAuth';

const GedViewer: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [filters, setFilters] = useState<DocumentSearchParams>({});
  const [tagDoc, setTagDoc] = useState<Document | null>(null);
  const [assignDoc, setAssignDoc] = useState<Document | null>(null);
  const [auditDoc, setAuditDoc] = useState<Document | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'tag' | 'assign' | null>(null);

  const fetchDocs = async (params: DocumentSearchParams = filters) => {
    const docs = await searchDocuments(params);
    setDocuments(docs);
    setSelectedIds([]); // clear selection on new search
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (params: DocumentSearchParams) => {
    setFilters(params);
    fetchDocs(params);
  };

  const handleStatusUpdate = (doc: Document) => {
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    if (selected && selected.id === doc.id) setSelected(doc);
  };

  const handleTag = (doc: Document) => {
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    if (selected && selected.id === doc.id) setSelected(doc);
  };

  const handleAssign = (doc: Document) => {
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    if (selected && selected.id === doc.id) setSelected(doc);
  };

  // Bulk actions
  const handleBulkTag = async (type: string, bordereauId?: string) => {
    for (const id of selectedIds) {
      await tagDocument(id, { type, bordereauId });
    }
    fetchDocs();
    setBulkAction(null);
  };
  const handleBulkAssign = async (assignedToUserId?: string, teamId?: string) => {
    for (const id of selectedIds) {
      await assignDocument(id, { assignedToUserId, teamId });
    }
    fetchDocs();
    setBulkAction(null);
  };

  // Always show all main components
  return (
    <div className="ged-main">
      <h1>Gestion Électronique des Documents (GED)</h1>
      <GEDDashboard />
      <hr />
      {/* Always show upload for allowed roles */}
      <DocumentUpload onUploadSuccess={() => fetchDocs()} />
      <DocumentFilters onSearch={handleSearch} />
      <hr />
      {selectedIds.length > 0 && (
        <div className="ged-bulk-bar">
          <span>{selectedIds.length} selected</span>
          <button onClick={() => setBulkAction('tag')}>Bulk Tag</button>
          <button onClick={() => setBulkAction('assign')}>Bulk Assign</button>
          <button onClick={() => setSelectedIds([])}>Clear</button>
        </div>
      )}
      <DocumentTable
        documents={documents}
        onSelect={setSelected}
        onStatusUpdate={handleStatusUpdate}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
      />
      <div style={{ marginTop: 24 }}>
        <h3>Document Viewer</h3>
        {selected ? (
          <>
            <DocumentViewer document={selected} />
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => setTagDoc(selected)}>Tag</button>
              <button onClick={() => setAssignDoc(selected)}>Assign</button>
              <button onClick={() => setAuditDoc(selected)}>Audit Trail</button>
            </div>
          </>
        ) : (
          <div style={{ color: '#888' }}>Select a document to view details.</div>
        )}
      </div>
      {tagDoc && (
        <DocumentTagModal
          document={tagDoc}
          onClose={() => setTagDoc(null)}
          onTag={handleTag}
        />
      )}
      {assignDoc && (
        <DocumentAssignModal
          document={assignDoc}
          onClose={() => setAssignDoc(null)}
          onAssign={handleAssign}
        />
      )}
      {auditDoc && (
        <DocumentAuditTrail
          documentId={auditDoc.id}
          onClose={() => setAuditDoc(null)}
        />
      )}
      {/* Bulk modals (simple prompt for demo) */}
      {bulkAction === 'tag' && (
        <div className="modal-backdrop"><div className="modal"><h4>Bulk Tag</h4>
          <form onSubmit={e => {e.preventDefault(); const type = (e.target as any).type.value; const bordereauId = (e.target as any).bordereauId.value; handleBulkTag(type, bordereauId);}}>
            <select name="type" required defaultValue="BS">
              <option value="BS">BS</option>
              <option value="contrat">Contrat</option>
              <option value="justificatif">Justificatif</option>
              <option value="reçu">Reçu</option>
              <option value="courrier">Courrier</option>
            </select>
            <input name="bordereauId" placeholder="Bordereau ID" />
            <button type="submit">Apply</button>
            <button type="button" onClick={() => setBulkAction(null)}>Cancel</button>
          </form></div></div>
      )}
      {bulkAction === 'assign' && (
        <div className="modal-backdrop"><div className="modal"><h4>Bulk Assign</h4>
          <form onSubmit={e => {e.preventDefault(); const assignedToUserId = (e.target as any).assignedToUserId.value; const teamId = (e.target as any).teamId.value; handleBulkAssign(assignedToUserId, teamId);}}>
            <input name="assignedToUserId" placeholder="User ID" />
            <input name="teamId" placeholder="Team ID" />
            <button type="submit">Apply</button>
            <button type="button" onClick={() => setBulkAction(null)}>Cancel</button>
          </form></div></div>
      )}
    </div>
  );
};

export default GedViewer;