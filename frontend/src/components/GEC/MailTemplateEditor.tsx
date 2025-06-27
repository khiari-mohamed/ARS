import React, { useState } from 'react';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate as renderTemplateApi,
} from '../../api/gecService';

const MailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const tpls = await getTemplates();
    setTemplates(tpls);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelect = async (idx: number) => {
    const tpl = await getTemplate(templates[idx].id);
    setSelected(tpl);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setVariables(tpl.variables || []);
    setVarValues(Object.fromEntries((tpl.variables || []).map((v: string) => [v, ''])));
    setPreview({ subject: tpl.subject, body: tpl.body });
  };

  const handleSave = async () => {
    setLoading(true);
    if (selected && selected.id) {
      await updateTemplate(selected.id, { name, subject, body, variables });
    } else {
      await createTemplate({ name, subject, body, variables });
    }
    setSelected(null);
    setName('');
    setSubject('');
    setBody('');
    setVariables([]);
    setVarValues({});
    fetchTemplates();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (selected && selected.id) {
      setLoading(true);
      await deleteTemplate(selected.id);
      setSelected(null);
      setName('');
      setSubject('');
      setBody('');
      setVariables([]);
      setVarValues({});
      fetchTemplates();
      setLoading(false);
    }
  };

  const handleVarChange = (v: string, value: string) => {
    setVarValues(prev => ({ ...prev, [v]: value }));
  };

  const handlePreview = async () => {
    if (!selected && !body && !subject) return;
    // Use backend render endpoint if template is saved, else local render
    if (selected && selected.id) {
      const res = await renderTemplateApi(selected.id, varValues);
      setPreview(res);
    } else {
      // Local render fallback
      const render = (tpl: string) => tpl.replace(/{{(\w+)}}/g, (_, key) => varValues[key] || `{{${key}}}`);
      setPreview({ subject: render(subject), body: render(body) });
    }
  };

  return (
    <div className="gec-mail-template-editor">
      <h3>Letter Templates</h3>
      <ul style={{ display: 'flex', gap: '0.7em', flexWrap: 'wrap', marginBottom: '1em', paddingLeft: 0 }}>
        {templates.length === 0 ? (
          <li style={{ listStyle: 'none', margin: 0, color: '#b71c1c', fontWeight: 500 }}>
            No templates available. Please create one below.
          </li>
        ) : (
          templates.map((tpl, idx) => (
            <li key={tpl.id} style={{ listStyle: 'none', margin: 0 }}>
              <button className="btn" type="button" onClick={() => handleSelect(idx)}>
                {tpl.name}
              </button>
            </li>
          ))
        )}
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7em' }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template Name"
        />
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          placeholder="Body (use {{variable}} for placeholders)"
        />
        <input
          value={variables.join(',')}
          onChange={e => setVariables(e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
          placeholder="Variables (comma separated)"
        />
        <button className="btn" onClick={handleSave} disabled={loading}>
          {selected ? 'Update' : 'Create'}
        </button>
        {selected && (
          <button className="btn" onClick={handleDelete} disabled={loading} style={{ background: '#e57373', color: '#fff' }}>
            Delete
          </button>
        )}
      </div>
      <div style={{ marginTop: '1.5em', background: '#f7f7f7', borderRadius: 8, padding: '1em' }}>
        <div style={{ fontWeight: 600, color: '#3949ab', marginBottom: 4 }}>Preview with Variables:</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {variables.map(v => (
            <input
              key={v}
              value={varValues[v] || ''}
              onChange={e => handleVarChange(v, e.target.value)}
              placeholder={v}
              style={{ minWidth: 120 }}
            />
          ))}
          <button className="btn" type="button" onClick={handlePreview} disabled={loading}>
            Preview
          </button>
        </div>
        <div style={{ fontWeight: 500, color: '#3949ab' }}>Subject:</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#263238', fontSize: '1em', margin: 0 }}>
          {preview.subject}
        </pre>
        <div style={{ fontWeight: 500, color: '#3949ab', marginTop: 8 }}>Body:</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#263238', fontSize: '1em', margin: 0 }}>
          {preview.body}
        </pre>
      </div>
    </div>
  );
};

export default MailTemplateEditor;