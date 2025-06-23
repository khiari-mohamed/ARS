import React, { useState, useEffect } from 'react';
import { createCourrier, sendCourrier, getTemplates, getTemplate, renderTemplate as renderTemplateApi } from '../../api/gecService';
import { getBordereau } from '../../api/bordereauService';
import { CourrierType, Courrier } from '../../types/mail';

interface Props {
  onSuccess?: () => void;
}

const MailComposer: React.FC<Props> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    subject: '',
    body: '',
    type: 'RECLAMATION' as CourrierType,
    templateUsed: '',
    bordereauId: '',
  });
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<Courrier | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Template/auto-fill state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
  const [bordereauInfo, setBordereauInfo] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    getTemplates().then(setTemplates);
  }, []);

  // Fetch template when templateUsed changes
  useEffect(() => {
    if (form.templateUsed) {
      getTemplate(form.templateUsed).then(tpl => {
        setSelectedTemplate(tpl);
        setVariables(tpl.variables || []);
        setVarValues(vars => {
          // Keep existing values, add new ones
          const newVars = { ...vars };
          (tpl.variables || []).forEach((v: string) => {
            if (!(v in newVars)) newVars[v] = '';
          });
          return newVars;
        });
      }).catch(() => {
        setSelectedTemplate(null);
        setVariables([]);
      });
    } else {
      setSelectedTemplate(null);
      setVariables([]);
    }
  }, [form.templateUsed]);

  // Fetch bordereau info when bordereauId changes
  useEffect(() => {
    if (form.bordereauId) {
      getBordereau(form.bordereauId).then(setBordereauInfo).catch(() => setBordereauInfo(null));
    } else {
      setBordereauInfo(null);
    }
  }, [form.bordereauId]);

  // Auto-fill variables when template or bordereauInfo changes
  useEffect(() => {
    if (selectedTemplate && bordereauInfo) {
      const autoVars: Record<string, string> = {};
      if (bordereauInfo.client && bordereauInfo.client.name) autoVars.clientName = bordereauInfo.client.name;
      if (bordereauInfo.dateReception) autoVars.date = new Date(bordereauInfo.dateReception).toLocaleDateString();
      setVarValues(vars => ({ ...autoVars, ...vars }));
    }
  }, [selectedTemplate, bordereauInfo]);

  // Live preview
  useEffect(() => {
    if (selectedTemplate) {
      renderTemplateApi(selectedTemplate.id, varValues).then(setPreview);
    } else {
      setPreview({ subject: form.subject, body: form.body });
    }
  }, [selectedTemplate, varValues, form.subject, form.body]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      let courrier;
      if (file) {
        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file);
        courrier = await createCourrier(formData); // createCourrier must support FormData
      } else {
        courrier = await createCourrier(form);
      }
      setDraft(courrier);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save draft');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;
    setSending(true);
    setError(null);
    try {
      await sendCourrier(draft.id, {});
      setDraft(null);
      setForm({ subject: '', body: '', type: 'RECLAMATION', templateUsed: '', bordereauId: '' });
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleVarChange = (v: string, value: string) => {
    setVarValues(prev => ({ ...prev, [v]: value }));
  };

  return (
    <form className="gec-mail-composer" onSubmit={handleDraft}>
      <div>
        <label>Subject</label>
        <input name="subject" value={selectedTemplate ? preview.subject : form.subject} onChange={handleChange} required disabled={!!selectedTemplate} />
      </div>
      <div>
        <label>Type</label>
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="RECLAMATION">Réclamation</option>
          <option value="REGLEMENT">Règlement</option>
          <option value="RELANCE">Relance</option>
          <option value="AUTRE">Autre</option>
        </select>
      </div>
      <div>
        <label>Template Used</label>
        <select name="templateUsed" value={form.templateUsed} onChange={handleChange} required>
          <option value="">-- Select Template --</option>
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Bordereau ID (optional)</label>
        <input name="bordereauId" value={form.bordereauId} onChange={handleChange} />
      </div>
      {selectedTemplate && variables.length > 0 && (
        <div style={{ margin: '1em 0' }}>
          <label>Template Variables:</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {variables.map(v => (
              <input
                key={v}
                value={varValues[v] || ''}
                onChange={e => handleVarChange(v, e.target.value)}
                placeholder={v}
                style={{ minWidth: 120 }}
              />
            ))}
          </div>
        </div>
      )}
      <div>
        <label>Body</label>
        <textarea name="body" value={selectedTemplate ? preview.body : form.body} onChange={handleChange} rows={6} required disabled={!!selectedTemplate} />
      </div>
      <div>
        <label>Attachment (optional)</label>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>
      <button type="submit" disabled={sending || !!draft}>
        {sending ? 'Saving...' : 'Save as Draft'}
      </button>
      {draft && (
        <button type="button" onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      )}
      {error && <div className="error">{error}</div>}
      {selectedTemplate && (
        <div style={{ marginTop: 16, background: '#f7f7f7', borderRadius: 8, padding: '1em' }}>
          <div style={{ fontWeight: 600, color: '#3949ab', marginBottom: 4 }}>Preview:</div>
          <div style={{ fontWeight: 500, color: '#3949ab' }}>Subject:</div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#263238', fontSize: '1em', margin: 0 }}>{preview.subject}</pre>
          <div style={{ fontWeight: 500, color: '#3949ab', marginTop: 8 }}>Body:</div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#263238', fontSize: '1em', margin: 0 }}>{preview.body}</pre>
        </div>
      )}
    </form>
  );
};

export default MailComposer;