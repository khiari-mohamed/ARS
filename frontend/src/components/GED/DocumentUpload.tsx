import React, { useRef, useState, useEffect } from 'react';
import { uploadDocument } from '../../api/gedService';
import { DocumentUploadPayload } from '../../types/document';
import { useAuth } from '../../hooks/useAuth';
import { LocalAPI } from '../../services/axios';

interface Props {
  onUploadSuccess?: () => void;
}

const DocumentUpload: React.FC<Props> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DocumentUploadPayload>({
    name: '',
    type: 'BS',
    clientId: '',
    bordereauId: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [name: string]: 'pending' | 'success' | 'error' }>({});
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [clients, setClients] = useState<any[]>([]);
  const [bordereaux, setBordereaux] = useState<any[]>([]);

  useEffect(() => {
    // Fetch clients on mount
    LocalAPI.get('/clients').then(res => setClients(res.data || []));
  }, []);

  useEffect(() => {
    if (form.clientId) {
      // Fetch bordereaux for selected client
      LocalAPI.get(`/clients/${form.clientId}/bordereaux`).then(res => setBordereaux(res.data || []));
    } else {
      setBordereaux([]);
    }
  }, [form.clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    } else {
      setFiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      setError('Please select at least one file');
      return;
    }
    if (!form.clientId || !form.bordereauId) {
      setError('Please select a client and a bordereau');
      return;
    }
    setUploading(true);
    setError(null);
    const progress: { [name: string]: 'pending' | 'success' | 'error' } = {};
    for (const file of files) {
      progress[file.name] = 'pending';
    }
    setUploadProgress({ ...progress });
    let anyError = false;
    for (const file of files) {
      try {
        await uploadDocument(form, file);
        progress[file.name] = 'success';
      } catch (err: any) {
        progress[file.name] = 'error';
        anyError = true;
      }
      setUploadProgress({ ...progress });
    }
    setUploading(false);
    if (!anyError) {
      setForm({ name: '', type: 'BS', clientId: '', bordereauId: '' });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.();
    } else {
      setError('Some files failed to upload.');
    }
  };

  // Only allow upload for SCAN_TEAM, CHEF_EQUIPE, SUPER_ADMIN
  const allowedRoles = ['SCAN_TEAM', 'CHEF_EQUIPE', 'SUPER_ADMIN', 'ADMINISTRATEUR'];
  const userRole = user?.role?.toUpperCase?.() || '';
  if (!user || !allowedRoles.includes(userRole)) {
    return <div style={{ color: '#888', marginBottom: 16 }}>You do not have permission to upload documents.</div>;
  }

  return (
    <form className="ged-upload-form" onSubmit={handleSubmit}>
      <div>
        <label>Document Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Type</label>
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="BS">BS</option>
          <option value="contrat">Contrat</option>
          <option value="justificatif">Justificatif</option>
          <option value="reçu">Reçu</option>
          <option value="courrier">Courrier</option>
        </select>
      </div>
      <div>
        <label>Client</label>
        <select
          name="clientId"
          value={form.clientId || ''}
          onChange={handleChange}
          required
        >
          <option value="">Sélectionner un client</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Bordereau</label>
        <select
          name="bordereauId"
          value={form.bordereauId || ''}
          onChange={handleChange}
          required
          disabled={!form.clientId}
        >
          <option value="">Sélectionner un bordereau</option>
          {bordereaux.map(b => (
            <option key={b.id} value={b.id}>{b.reference}</option>
          ))}
        </select>
      </div>
      <div>
        <label>File(s)</label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          required
          multiple
        />
      </div>
      {files.length > 0 && (
        <ul style={{ margin: '8px 0', padding: 0, listStyle: 'none' }}>
          {files.map(f => (
            <li key={f.name} style={{ fontSize: 13 }}>
              {f.name}
              {uploadProgress[f.name] === 'success' && <span style={{ color: 'green', marginLeft: 8 }}>✓</span>}
              {uploadProgress[f.name] === 'error' && <span style={{ color: 'red', marginLeft: 8 }}>✗</span>}
              {uploadProgress[f.name] === 'pending' && uploading && <span style={{ color: '#888', marginLeft: 8 }}>Uploading...</span>}
            </li>
          ))}
        </ul>
      )}
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default DocumentUpload;