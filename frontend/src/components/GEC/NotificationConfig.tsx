import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';

const NotificationConfig: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    LocalAPI.get('/notifications/preferences')
      .then(res => setPrefs(res.data))
      .catch(() => setPrefs(null))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPrefs({ ...prefs, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await LocalAPI.post('/notifications/preferences', prefs);
      setSaved(true);
    } catch (e: any) {
      setError('Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading notification preferences...</div>;

  if (!prefs) {
    return <div style={{ color: '#d32f2f', margin: '1em 0' }}>
      Notification configuration is managed by the backend. Please contact your administrator.
    </div>;
  }

  return (
    <div style={{ margin: '2em 0', background: '#f7f7f7', borderRadius: 8, padding: '1.5em' }}>
      <h3>Notification Preferences</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <label>
          Notification Channel
          <select name="channel" value={prefs.channel || ''} onChange={handleChange}>
            <option value="EMAIL">Email</option>
            <option value="IN_APP">In-App</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label>
          Types
          <select name="type" value={prefs.type || ''} onChange={handleChange}>
            <option value="ALL">All</option>
            <option value="RELANCE">Relance</option>
            <option value="RECLAMATION">Réclamation</option>
            <option value="AUTRE">Autre</option>
          </select>
        </label>
        <label>
          Recipient Email
          <input name="recipient" value={prefs.recipient || user?.username || ''} onChange={handleChange} />
        </label>
        <button className="btn" onClick={handleSave} disabled={loading}>
          Save Preferences
        </button>
        {saved && <span style={{ color: '#388e3c' }}>Preferences saved!</span>}
        {error && <span style={{ color: '#d32f2f' }}>{error}</span>}
      </div>
    </div>
  );
};

export default NotificationConfig;
