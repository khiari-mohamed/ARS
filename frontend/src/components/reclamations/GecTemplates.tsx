import React, { useState, useEffect } from 'react';

// Dummy API functions (replace with real API calls)
const fetchTemplates = async () => [
  { id: '1', name: 'Lettre standard', content: 'Cher client, ...' },
  { id: '2', name: 'Relance', content: 'Nous vous relançons concernant ...' },
];
const createTemplate = async (tpl: any) => tpl;
const updateTemplate = async (tpl: any) => tpl;
const deleteTemplate = async (id: string) => id;

export const GecTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', content: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTemplates().then(tpls => {
      setTemplates(tpls);
      setLoading(false);
    });
  }, []);

  const handleEdit = (tpl: any) => {
    setEditing(tpl);
    setForm({ name: tpl.name, content: tpl.content });
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setTemplates(tpls => tpls.filter(t => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const updated = await updateTemplate({ ...editing, ...form });
      setTemplates(tpls => tpls.map(t => (t.id === updated.id ? updated : t)));
      setEditing(null);
    } else {
      const created = await createTemplate({ ...form, id: Date.now().toString() });
      setTemplates(tpls => [...tpls, created]);
    }
    setForm({ name: '', content: '' });
  };

  return (
    <div className="gec-templates max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Gestion des modèles GEC</h2>
      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Nom du modèle"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
        <textarea
          className="border rounded px-2 py-1 w-full"
          placeholder="Contenu du modèle (HTML ou texte)"
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={4}
          required
        />
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">
            {editing ? 'Enregistrer' : 'Créer'}
          </button>
          {editing && (
            <button type="button" className="px-3 py-1" onClick={() => setEditing(null)}>
              Annuler
            </button>
          )}
        </div>
      </form>
      <h3 className="font-semibold mb-2">Modèles existants</h3>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <ul className="space-y-2">
          {templates.map(tpl => (
            <li key={tpl.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-bold">{tpl.name}</div>
                <div className="text-xs text-gray-600 truncate max-w-xs">{tpl.content}</div>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={() => handleEdit(tpl)}>
                  Éditer
                </button>
                <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(tpl.id)}>
                  Supprimer
                </button>
                <button className="bg-gray-600 text-white px-2 py-1 rounded" onClick={() => alert(tpl.content)}>
                  Prévisualiser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
