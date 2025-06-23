import React, { useState } from 'react';

interface Notification {
  type: string;
  message: string;
  recipient: string;
}

const NotificationScheduler: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState<Notification>({ type: '', message: '', recipient: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    if (!form.type.trim() || !form.message.trim() || !form.recipient.trim()) return;
    setNotifications([...notifications, form]);
    setForm({ type: '', message: '', recipient: '' });
  };

  return (
    <div className="gec-notification-scheduler">
      <h3>Notification Scheduler (Demo)</h3>
      <form
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.7em',
          alignItems: 'center',
          marginBottom: '1em',
        }}
        onSubmit={e => {
          e.preventDefault();
          handleAdd();
        }}
        autoComplete="off"
      >
        <input
          name="type"
          value={form.type}
          onChange={handleChange}
          placeholder="Type"
          autoComplete="off"
        />
        <input
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Message"
          autoComplete="off"
        />
        <input
          name="recipient"
          value={form.recipient}
          onChange={handleChange}
          placeholder="Recipient"
          autoComplete="off"
        />
        <button
          className="btn"
          type="submit"
          disabled={!form.type.trim() || !form.message.trim() || !form.recipient.trim()}
        >
          Add
        </button>
      </form>
      <ul>
        {notifications.map((n, idx) => (
          <li key={idx}>
            <span style={{ fontWeight: 600, color: '#3949ab' }}>{n.type}</span>: {n.message} <span style={{ color: '#1e88e5' }}>→ {n.recipient}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationScheduler;