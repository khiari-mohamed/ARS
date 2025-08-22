import React, { useState } from 'react';
import { LocalAPI } from '../services/axios';

const FeedbackForm: React.FC<{ page: string }> = ({ page }) => {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      alert('Veuillez saisir votre message avant d\'envoyer.');
      return;
    }
    
    try {
      await LocalAPI.post('/simple-feedback', { message: message.trim(), page });
      setSubmitted(true);
      setMessage('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Erreur lors de l\'envoi du feedback. Veuillez réessayer.');
    }
  };

  if (submitted)
    return (
      <div className="dashboard-sharp-panel">
        <div className="dashboard-sharp-title" style={{ color: '#388e3c' }}>
          Merci pour votre retour !
        </div>
      </div>
    );

  return (
    <div className="dashboard-sharp-panel">
      <div className="dashboard-sharp-title">Donnez votre avis</div>
      <form onSubmit={handleSubmit} className="feedback-form-fields">
        <label htmlFor="feedback-message" className="feedback-label">Votre retour</label>
        <textarea
          id="feedback-message"
          className="feedback-textarea"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={3}
        />
        <button type="submit" className="feedback-submit-btn">Envoyer</button>
      </form>
    </div>
  );
};

export default FeedbackForm;
