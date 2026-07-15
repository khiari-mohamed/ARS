import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, confirmPasswordReset } from '../../services/authService';
import logo from '../../assets/ars-logo.png';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ars-pr-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #0d0d0d;
    overflow: hidden;
  }

  .ars-pr-left {
    position: relative;
    flex: 1.1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 64px 72px;
    background: #0d0d0d;
    overflow: hidden;
  }

  .ars-pr-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 10% 80%, rgba(213,43,54,0.22) 0%, transparent 70%),
      radial-gradient(ellipse 40% 35% at 90% 10%, rgba(213,43,54,0.10) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-pr-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .ars-pr-left-content {
    position: relative;
    z-index: 1;
    max-width: 460px;
  }

  .ars-pr-logo {
    width: 88px;
    height: auto;
    margin-bottom: 56px;
    filter: brightness(1.08) drop-shadow(0 0 20px rgba(213,43,54,0.4));
  }

  .ars-pr-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #d52b36;
    margin-bottom: 18px;
  }

  .ars-pr-headline {
    font-family: 'Playfair Display', serif;
    font-size: clamp(36px, 4vw, 54px);
    font-weight: 800;
    line-height: 1.08;
    color: #f5f5f5;
    margin-bottom: 24px;
    letter-spacing: -0.5px;
  }

  .ars-pr-headline span {
    color: #d52b36;
    position: relative;
    display: inline-block;
  }

  .ars-pr-headline span::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 4px;
    width: 100%;
    height: 3px;
    background: #d52b36;
    opacity: 0.4;
    border-radius: 2px;
  }

  .ars-pr-desc {
    font-size: 16px;
    font-weight: 400;
    color: rgba(255,255,255,0.45);
    line-height: 1.7;
    max-width: 340px;
  }

  .ars-pr-decoration {
    position: absolute;
    bottom: 48px;
    left: 72px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1;
  }

  .ars-pr-decoration-dot { width: 6px; height: 6px; border-radius: 50%; background: #d52b36; }
  .ars-pr-decoration-line { width: 48px; height: 1px; background: linear-gradient(90deg, #d52b36, transparent); }
  .ars-pr-decoration-text { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.25); letter-spacing: 2px; text-transform: uppercase; }

  .ars-pr-right {
    flex: 0.9;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
    background: #111;
    border-left: 1px solid rgba(255,255,255,0.06);
    position: relative;
  }

  .ars-pr-right::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d52b36, transparent);
    opacity: 0.4;
  }

  .ars-pr-card {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
  }

  .ars-pr-card-header { margin-bottom: 40px; }

  .ars-pr-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 10px;
    display: block;
  }

  .ars-pr-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 30px;
    font-weight: 700;
    color: #f5f5f5;
    letter-spacing: -0.3px;
  }

  .ars-pr-form { display: flex; flex-direction: column; gap: 20px; }

  .ars-pr-field { display: flex; flex-direction: column; gap: 8px; }

  .ars-pr-field-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ars-pr-input {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #f0f0f0;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    width: 100%;
  }

  .ars-pr-input::placeholder { color: rgba(255,255,255,0.2); }

  .ars-pr-input:focus {
    border-color: #d52b36;
    background: rgba(213,43,54,0.06);
    box-shadow: 0 0 0 3px rgba(213,43,54,0.12);
  }

  .ars-pr-input.error {
    border-color: rgba(213,43,54,0.6);
  }

  .ars-pr-hint {
    font-size: 11px;
    color: rgba(255,255,255,0.25);
    margin-top: 2px;
  }

  .ars-pr-error {
    background: rgba(213,43,54,0.1);
    border: 1px solid rgba(213,43,54,0.3);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #ff6b75;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ars-pr-error::before { content: '⚠'; font-size: 15px; flex-shrink: 0; }

  .ars-pr-success {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: 10px;
    padding: 16px 18px;
    font-size: 14px;
    font-weight: 500;
    color: #4ade80;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ars-pr-success-icon { font-size: 22px; margin-bottom: 4px; }

  .ars-pr-btn {
    position: relative;
    background: #d52b36;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.3px;
    border: none;
    border-radius: 10px;
    padding: 15px 0;
    cursor: pointer;
    margin-top: 6px;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    overflow: hidden;
  }

  .ars-pr-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-pr-btn:hover:not(:disabled) {
    background: #c0242e;
    box-shadow: 0 6px 24px rgba(213,43,54,0.4);
    transform: translateY(-1px);
  }

  .ars-pr-btn:active:not(:disabled) { transform: translateY(0); }
  .ars-pr-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .ars-pr-strength {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }

  .ars-pr-strength-bar {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: rgba(255,255,255,0.08);
    transition: background 0.3s;
  }

  .ars-pr-strength-bar.weak   { background: #ef4444; }
  .ars-pr-strength-bar.medium { background: #f59e0b; }
  .ars-pr-strength-bar.strong { background: #22c55e; }

  .ars-pr-strength-label {
    font-size: 11px;
    margin-top: 4px;
    color: rgba(255,255,255,0.3);
  }

  .ars-pr-footer {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  .ars-pr-footer-row {
    font-size: 14px;
    color: rgba(255,255,255,0.35);
    text-align: center;
  }

  .ars-pr-footer-link {
    color: #d52b36;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
  }

  .ars-pr-footer-link:hover { color: #ff4d5a; }

  .ars-pr-copyright {
    font-size: 11px;
    color: rgba(255,255,255,0.18);
    letter-spacing: 0.5px;
    margin-top: 4px;
  }

  @media (max-width: 900px) {
    .ars-pr-root { flex-direction: column; }
    .ars-pr-left { flex: none; padding: 48px 40px 40px; min-height: auto; }
    .ars-pr-left-content { max-width: 100%; }
    .ars-pr-logo { width: 68px; margin-bottom: 36px; }
    .ars-pr-headline { font-size: 36px; }
    .ars-pr-decoration { display: none; }
    .ars-pr-right { flex: none; border-left: none; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 32px 48px; }
  }

  @media (max-width: 600px) {
    .ars-pr-left { padding: 36px 24px 32px; }
    .ars-pr-logo { width: 56px; margin-bottom: 28px; }
    .ars-pr-headline { font-size: 28px; }
    .ars-pr-right { padding: 32px 20px 40px; }
    .ars-pr-card-title { font-size: 24px; }
    .ars-pr-input { padding: 13px 16px; }
  }
`;

function getPasswordStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  return { score, label: labels[score] || '' };
}

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Step 1 — request
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  // Step 2 — confirm
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getPasswordStrength(newPassword);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setRequestSent(true);
    } catch {
      setError('Impossible d\'envoyer le lien. Vérifiez l\'adresse email.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (strength.score < 3) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token!, newPassword);
      setResetDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('Ce lien est invalide ou a expiré. Veuillez faire une nouvelle demande.');
      } else {
        setError('Erreur lors de la réinitialisation. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderRight = () => {
    // ── Confirm step (token in URL) ──
    if (token) {
      if (resetDone) {
        return (
          <div className="ars-pr-card">
            <div className="ars-pr-card-header">
              <span className="ars-pr-card-label">Mot de passe</span>
              <h2 className="ars-pr-card-title">Réinitialisé !</h2>
            </div>
            <div className="ars-pr-success">
              <span className="ars-pr-success-icon">✓</span>
              <strong>Mot de passe mis à jour avec succès.</strong>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Redirection vers la page de connexion…
              </span>
            </div>
            <div className="ars-pr-footer">
              <div className="ars-pr-footer-row">
                <Link to="/login" className="ars-pr-footer-link">Se connecter maintenant</Link>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="ars-pr-card">
          <div className="ars-pr-card-header">
            <span className="ars-pr-card-label">Sécurité du compte</span>
            <h2 className="ars-pr-card-title">Nouveau mot de passe</h2>
          </div>
          <form className="ars-pr-form" onSubmit={handleConfirm}>
            {error && <div className="ars-pr-error">{error}</div>}

            <div className="ars-pr-field">
              <label className="ars-pr-field-label">Nouveau mot de passe</label>
              <input
                className={`ars-pr-input${error && newPassword ? ' error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
              />
              {newPassword && (
                <>
                  <div className="ars-pr-strength">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`ars-pr-strength-bar${
                          strength.score >= i
                            ? strength.score <= 1 ? ' weak'
                            : strength.score === 2 ? ' medium'
                            : ' strong'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ars-pr-strength-label">{strength.label}</span>
                </>
              )}
              <span className="ars-pr-hint">Min. 8 caractères, 1 majuscule, 1 chiffre</span>
            </div>

            <div className="ars-pr-field">
              <label className="ars-pr-field-label">Confirmer le mot de passe</label>
              <input
                className={`ars-pr-input${confirmPassword && confirmPassword !== newPassword ? ' error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <span className="ars-pr-hint" style={{ color: '#ff6b75' }}>Les mots de passe ne correspondent pas</span>
              )}
            </div>

            <button className="ars-pr-btn" type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
          <div className="ars-pr-footer">
            <div className="ars-pr-footer-row">
              <Link to="/login" className="ars-pr-footer-link">← Retour à la connexion</Link>
            </div>
          </div>
        </div>
      );
    }

    // ── Request step (no token) ──
    if (requestSent) {
      return (
        <div className="ars-pr-card">
          <div className="ars-pr-card-header">
            <span className="ars-pr-card-label">Réinitialisation</span>
            <h2 className="ars-pr-card-title">Email envoyé</h2>
          </div>
          <div className="ars-pr-success">
            <span className="ars-pr-success-icon">✉</span>
            <strong>Vérifiez votre boîte mail.</strong>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Si un compte existe pour <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{email}</strong>, un lien de réinitialisation a été envoyé. Le lien expire dans 30 minutes.
            </span>
          </div>
          <div className="ars-pr-footer">
            <div className="ars-pr-footer-row">
              Pas reçu ?{' '}
              <button
                onClick={() => setRequestSent(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="ars-pr-footer-link"
              >
                Renvoyer
              </button>
            </div>
            <div className="ars-pr-footer-row">
              <Link to="/login" className="ars-pr-footer-link">← Retour à la connexion</Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ars-pr-card">
        <div className="ars-pr-card-header">
          <span className="ars-pr-card-label">Sécurité du compte</span>
          <h2 className="ars-pr-card-title">Mot de passe oublié ?</h2>
        </div>
        <form className="ars-pr-form" onSubmit={handleRequest}>
          {error && <div className="ars-pr-error">{error}</div>}
          <div className="ars-pr-field">
            <label className="ars-pr-field-label">Adresse email</label>
            <input
              className="ars-pr-input"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <span className="ars-pr-hint">Entrez l'email associé à votre compte ARS</span>
          </div>
          <button className="ars-pr-btn" type="submit" disabled={loading}>
            {loading ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>
        <div className="ars-pr-footer">
          <div className="ars-pr-footer-row">
            Vous vous souvenez de votre mot de passe ?{' '}
            <Link to="/login" className="ars-pr-footer-link">Se connecter</Link>
          </div>
          <span className="ars-pr-copyright">
            &copy; {new Date().getFullYear()} ARS Tunisie. Tous droits réservés.
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ars-pr-root">

        {/* ── LEFT PANEL ── */}
        <div className="ars-pr-left">
          <div className="ars-pr-grid" />
          <div className="ars-pr-left-content">
            <img src={logo} alt="ARS Logo" className="ars-pr-logo" />
            <p className="ars-pr-eyebrow">ARS Tunisie Platform</p>
            <h1 className="ars-pr-headline">
              Réinitialiser<br />
              <span>l'accès.</span>
            </h1>
            <p className="ars-pr-desc">
              Entrez votre adresse email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </div>
          <div className="ars-pr-decoration">
            <div className="ars-pr-decoration-dot" />
            <div className="ars-pr-decoration-line" />
            <span className="ars-pr-decoration-text">
              &copy; {new Date().getFullYear()} ARS Tunisie
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="ars-pr-right">
          {renderRight()}
        </div>

      </div>
    </>
  );
};

export default PasswordReset;
