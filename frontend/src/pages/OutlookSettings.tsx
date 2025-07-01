import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = '/outlook';

const OutlookSettings: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email');
  const [testBody, setTestBody] = useState('This is a test email from ARS.');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/status`).then(res => {
      setStatus(res.data.connected ? 'connected' : 'disconnected');
    });
    axios.get(`${API_BASE}/auth-url?redirectUri=${encodeURIComponent(window.location.origin + '/outlook-callback')}`)
      .then(res => setAuthUrl(res.data.url));
  }, []);

  const handleConnect = () => {
    window.location.href = authUrl;
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    try {
      await axios.post(`${API_BASE}/send-test`, {
        to: testEmail,
        subject: testSubject,
        text: testBody,
      });
      setTestResult('Test email sent successfully!');
    } catch (err: any) {
      setTestResult('Failed to send test email: ' + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
      <h2>Outlook/MS365 Integration</h2>
      <div>Status: <b>{status === 'loading' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Not Connected'}</b></div>
      {status === 'disconnected' && (
        <button onClick={handleConnect} style={{ marginTop: 16, padding: '8px 16px' }}>Connect Outlook/MS365</button>
      )}
      {status === 'connected' && (
        <form onSubmit={handleTestEmail} style={{ marginTop: 24 }}>
          <h4>Send Test Email</h4>
          <input
            type="email"
            placeholder="Recipient Email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder="Subject"
            value={testSubject}
            onChange={e => setTestSubject(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <textarea
            placeholder="Body"
            value={testBody}
            onChange={e => setTestBody(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit">Send Test Email</button>
        </form>
      )}
      {testResult && <div style={{ marginTop: 16, color: testResult.startsWith('Failed') ? 'red' : 'green' }}>{testResult}</div>}
    </div>
  );
};

export default OutlookSettings;
