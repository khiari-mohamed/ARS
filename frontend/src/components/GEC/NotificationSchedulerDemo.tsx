import React, { useState } from 'react';

const NotificationSchedulerDemo: React.FC = () => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ margin: '2em 0', background: '#fffde7', borderRadius: 8, padding: '1.5em' }}>
      <h3>Notification Scheduler (Demo UI)</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <label>
          Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </label>
        <label>
          Channel
          <select value={channel} onChange={e => setChannel(e.target.value)}>
            <option value="EMAIL">Email</option>
            <option value="IN_APP">In-App</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label>
          Message
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} required />
        </label>
        <button className="btn" type="submit" disabled={saved}>Schedule Notification</button>
        {saved && <span style={{ color: '#388e3c' }}>Demo: Notification scheduled (not really sent)</span>}
      </form>
      <div style={{ color: '#b71c1c', marginTop: 12, fontSize: '0.95em' }}>
        <strong>Note:</strong> This is a demo UI only. No notifications will actually be scheduled or sent.
      </div>
    </div>
  );
};

export default NotificationSchedulerDemo;
