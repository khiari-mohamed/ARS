
import React, { useRef, useState } from 'react';
import { uploadDocument } from '../../api/gedService';
import { Document, DocumentUploadPayload } from '../../types/document';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  onUploadSuccess?: () => void;
}

const DocumentUpload: React.FC<Props> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DocumentUploadPayload>({
    name: '',
    type: 'BS',
    bordereauId: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await uploadDocument(form, file);
      setForm({ name: '', type: 'BS', bordereauId: '' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Only allow upload for SCAN_TEAM, CHEF_EQUIPE, SUPER_ADMIN
  const allowedRoles = ['SCAN_TEAM', 'CHEF_EQUIPE', 'SUPER_ADMIN', 'ADMINISTRATEUR'];
  const userRole = user?.role?.toUpperCase?.() || '';
  console.log('Current user role:', userRole);
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
        <label>Bordereau ID (optional)</label>
        <input
          type="text"
          name="bordereauId"
          value={form.bordereauId}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>File</label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default DocumentUpload;