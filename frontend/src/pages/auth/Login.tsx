import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginService } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import logo from '../../assets/ars-logo.png';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .ars-login-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #0d0d0d;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .ars-login-left {
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

  .ars-login-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 10% 80%, rgba(213,43,54,0.22) 0%, transparent 70%),
      radial-gradient(ellipse 40% 35% at 90% 10%, rgba(213,43,54,0.10) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-login-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .ars-login-left-content {
    position: relative;
    z-index: 1;
    max-width: 460px;
  }

  .ars-login-logo {
    width: 88px;
    height: auto;
    margin-bottom: 56px;
    filter: brightness(1.08) drop-shadow(0 0 20px rgba(213,43,54,0.4));
  }

  .ars-login-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #d52b36;
    margin-bottom: 18px;
  }

  .ars-login-headline {
    font-family: 'Playfair Display', serif;
    font-size: clamp(36px, 4vw, 54px);
    font-weight: 800;
    line-height: 1.08;
    color: #f5f5f5;
    margin-bottom: 24px;
    letter-spacing: -0.5px;
  }

  .ars-login-headline span {
    color: #d52b36;
    position: relative;
    display: inline-block;
  }

  .ars-login-headline span::after {
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

  .ars-login-desc {
    font-size: 16px;
    font-weight: 400;
    color: rgba(255,255,255,0.45);
    line-height: 1.7;
    max-width: 340px;
  }

  .ars-login-decoration {
    position: absolute;
    bottom: 48px;
    left: 72px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1;
  }

  .ars-login-decoration-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d52b36;
  }

  .ars-login-decoration-line {
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, #d52b36, transparent);
  }

  .ars-login-decoration-text {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.25);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* ── RIGHT PANEL ── */
  .ars-login-right {
    flex: 0.9;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
    background: #111;
    border-left: 1px solid rgba(255,255,255,0.06);
    position: relative;
  }

  .ars-login-right::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d52b36, transparent);
    opacity: 0.4;
  }

  .ars-login-card {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
  }

  .ars-login-card-header {
    margin-bottom: 40px;
  }

  .ars-login-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 10px;
    display: block;
  }

  .ars-login-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 30px;
    font-weight: 700;
    color: #f5f5f5;
    letter-spacing: -0.3px;
  }

  /* ── FORM ── */
  .ars-login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .ars-login-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ars-login-field-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ars-login-input {
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

  .ars-login-input::placeholder {
    color: rgba(255,255,255,0.2);
  }

  .ars-login-input:focus {
    border-color: #d52b36;
    background: rgba(213,43,54,0.06);
    box-shadow: 0 0 0 3px rgba(213,43,54,0.12);
  }

  .ars-login-error {
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

  .ars-login-error::before {
    content: '⚠';
    font-size: 15px;
    flex-shrink: 0;
  }

  .ars-login-btn {
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

  .ars-login-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-login-btn:hover:not(:disabled) {
    background: #c0242e;
    box-shadow: 0 6px 24px rgba(213,43,54,0.4);
    transform: translateY(-1px);
  }

  .ars-login-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .ars-login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .ars-login-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 4px;
  }

  .ars-login-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.08);
  }

  .ars-login-divider-text {
    font-size: 11px;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .ars-login-footer {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  .ars-login-footer-row {
    font-size: 14px;
    color: rgba(255,255,255,0.35);
    text-align: center;
  }

  .ars-login-footer-link {
    color: #d52b36;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
  }

  .ars-login-footer-link:hover {
    color: #ff4d5a;
  }

  .ars-login-copyright {
    font-size: 11px;
    color: rgba(255,255,255,0.18);
    letter-spacing: 0.5px;
    margin-top: 4px;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .ars-login-root {
      flex-direction: column;
    }
    .ars-login-left {
      flex: none;
      padding: 48px 40px 40px;
      min-height: auto;
    }
    .ars-login-left-content {
      max-width: 100%;
    }
    .ars-login-logo {
      width: 68px;
      margin-bottom: 36px;
    }
    .ars-login-headline {
      font-size: 36px;
    }
    .ars-login-decoration {
      display: none;
    }
    .ars-login-right {
      flex: none;
      border-left: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 40px 32px 48px;
    }
  }

  @media (max-width: 600px) {
    .ars-login-left {
      padding: 36px 24px 32px;
    }
    .ars-login-logo {
      width: 56px;
      margin-bottom: 28px;
    }
    .ars-login-eyebrow {
      font-size: 10px;
    }
    .ars-login-headline {
      font-size: 28px;
    }
    .ars-login-desc {
      font-size: 14px;
    }
    .ars-login-right {
      padding: 32px 20px 40px;
    }
    .ars-login-card-title {
      font-size: 24px;
    }
    .ars-login-input {
      padding: 13px 16px;
      font-size: 15px;
    }
  }
`;

const Login = () => {
  const { login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token, user } = await loginService(email, password);
      login(access_token, user);
      navigate('/home/dashboard');
    } catch (err: any) {
      if (err.response?.data?.message?.includes('locked')) {
        setError('Account locked due to too many failed attempts. Try again later.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div className="ars-login-root">

        {/* ── LEFT PANEL ── */}
        <div className="ars-login-left">
          <div className="ars-login-grid" />
          <div className="ars-login-left-content">
            <img src={logo} alt="ARS Logo" className="ars-login-logo" />
            <p className="ars-login-eyebrow">ARS Tunisie Platform</p>
            <h1 className="ars-login-headline">
              Welcome<br />
              <span>Back.</span>
            </h1>
            <p className="ars-login-desc">
              Sign in to your ARS account and continue managing your team with confidence.
            </p>
          </div>
          <div className="ars-login-decoration">
            <div className="ars-login-decoration-dot" />
            <div className="ars-login-decoration-line" />
            <span className="ars-login-decoration-text">
              &copy; {new Date().getFullYear()} ARS Tunisie
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="ars-login-right">
          <div className="ars-login-card">
            <div className="ars-login-card-header">
              <span className="ars-login-card-label">Secure Access</span>
              <h2 className="ars-login-card-title">Sign In</h2>
            </div>

            <form className="ars-login-form" onSubmit={handleSubmit}>
              {error && (
                <div className="ars-login-error">{error}</div>
              )}

              <div className="ars-login-field">
                <label className="ars-login-field-label">Email Address</label>
                <input
                  className="ars-login-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="ars-login-field">
                <label className="ars-login-field-label">Password</label>
                <input
                  className="ars-login-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className="ars-login-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="ars-login-footer">
              <div className="ars-login-footer-row">
                Forgot password?{' '}
                <Link to="/password-reset" className="ars-login-footer-link">
                  Reset it
                </Link>
              </div>
              <div className="ars-login-footer-row">
                Don't have an account?{' '}
                <Link to="/register" className="ars-login-footer-link">
                  Register
                </Link>
              </div>
              <span className="ars-login-copyright">
                &copy; {new Date().getFullYear()} ARS Tunisie. All rights reserved.
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default Login;