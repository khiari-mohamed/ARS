import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerService, UserRole } from '../../services/authService';
import logo from '../../assets/ars-logo.png';

const roleOptions = [
  { label: 'Super Admin', value: UserRole.SUPER_ADMIN },
  { label: 'Administrateur', value: UserRole.ADMINISTRATEUR },
  { label: 'Responsable Département', value: UserRole.RESPONSABLE_DEPARTEMENT },
  { label: "Chef d'équipe", value: UserRole.CHEF_EQUIPE },
  { label: 'Gestionnaire Senior', value: 'GESTIONNAIRE_SENIOR' },
  { label: 'Gestionnaire', value: UserRole.GESTIONNAIRE },
  { label: 'Service Client', value: UserRole.CLIENT_SERVICE },
  { label: 'Finance', value: UserRole.FINANCE },
  { label: 'Équipe Scan', value: UserRole.SCAN_TEAM },
  { label: 'Bureau d\'Ordre', value: UserRole.BO },
];

const departmentOptions = [
  { label: 'Bureau d\'Ordre', value: 'Bureau d\'Ordre' },
  { label: 'Équipe Scan', value: 'Équipe Scan' },
  { label: 'Équipe Santé', value: 'Équipe Santé' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Service Client', value: 'Service Client' },
];

const passwordHelp =
  'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .ars-reg-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #0d0d0d;
  }

  /* ── LEFT PANEL ── */
  .ars-reg-left {
    position: relative;
    flex: 0 0 380px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding: 56px 48px;
    background: #0d0d0d;
    overflow: hidden;
    border-right: 1px solid rgba(255,255,255,0.06);
  }

  .ars-reg-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 0% 100%, rgba(213,43,54,0.25) 0%, transparent 65%),
      radial-gradient(ellipse 50% 40% at 100% 0%, rgba(213,43,54,0.10) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-reg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
    background-size: 44px 44px;
    pointer-events: none;
  }

  .ars-reg-left-top {
    position: relative;
    z-index: 1;
  }

  .ars-reg-logo {
    width: 72px;
    height: auto;
    margin-bottom: 48px;
    filter: brightness(1.1) drop-shadow(0 0 18px rgba(213,43,54,0.45));
  }

  .ars-reg-eyebrow {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #d52b36;
    margin-bottom: 14px;
  }

  .ars-reg-headline {
    font-family: 'Playfair Display', serif;
    font-size: clamp(28px, 3vw, 38px);
    font-weight: 800;
    line-height: 1.1;
    color: #f0f0f0;
    letter-spacing: -0.3px;
    margin-bottom: 20px;
  }

  .ars-reg-headline span {
    color: #d52b36;
  }

  .ars-reg-desc {
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.38);
    line-height: 1.75;
  }

  .ars-reg-left-bottom {
    position: relative;
    z-index: 1;
  }

  .ars-reg-steps {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ars-reg-step {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ars-reg-step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid rgba(213,43,54,0.4);
    color: #d52b36;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ars-reg-step-text {
    font-size: 13px;
    color: rgba(255,255,255,0.3);
    font-weight: 400;
  }

  .ars-reg-copyright {
    font-size: 11px;
    color: rgba(255,255,255,0.15);
    letter-spacing: 0.5px;
    margin-top: 24px;
  }

  /* ── RIGHT PANEL / FORM ── */
  .ars-reg-right {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 56px 64px;
    background: #111;
    overflow-y: auto;
    position: relative;
  }

  .ars-reg-right::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d52b36, transparent);
    opacity: 0.35;
  }

  .ars-reg-card {
    width: 100%;
    max-width: 520px;
    padding-top: 8px;
  }

  .ars-reg-card-header {
    margin-bottom: 36px;
  }

  .ars-reg-card-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.28);
    margin-bottom: 10px;
    display: block;
  }

  .ars-reg-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #f0f0f0;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }

  .ars-reg-card-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.3);
  }

  /* ── FORM GRID ── */
  .ars-reg-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .ars-reg-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .ars-reg-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .ars-reg-field-label {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.38);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ars-reg-input,
  .ars-reg-select {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 13px 16px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #f0f0f0;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
  }

  .ars-reg-input::placeholder {
    color: rgba(255,255,255,0.18);
  }

  .ars-reg-input:focus,
  .ars-reg-select:focus {
    border-color: #d52b36;
    background: rgba(213,43,54,0.06);
    box-shadow: 0 0 0 3px rgba(213,43,54,0.12);
  }

  .ars-reg-select {
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23888' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }

  .ars-reg-select option {
    background: #1a1a1a;
    color: #f0f0f0;
  }

  .ars-reg-password-hint {
    font-size: 11px;
    color: rgba(255,255,255,0.25);
    line-height: 1.6;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    border-left: 2px solid rgba(213,43,54,0.4);
  }

  .ars-reg-error {
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

  .ars-reg-error::before {
    content: '⚠';
    font-size: 15px;
    flex-shrink: 0;
  }

  .ars-reg-success {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #4ade80;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ars-reg-success::before {
    content: '✓';
    font-size: 15px;
    flex-shrink: 0;
  }

  .ars-reg-btn {
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
    margin-top: 4px;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    overflow: hidden;
    width: 100%;
  }

  .ars-reg-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .ars-reg-btn:hover:not(:disabled) {
    background: #c0242e;
    box-shadow: 0 6px 24px rgba(213,43,54,0.4);
    transform: translateY(-1px);
  }

  .ars-reg-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .ars-reg-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .ars-reg-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 14px;
    color: rgba(255,255,255,0.3);
  }

  .ars-reg-footer-link {
    color: #d52b36;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
  }

  .ars-reg-footer-link:hover {
    color: #ff4d5a;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1100px) {
    .ars-reg-left {
      flex: 0 0 300px;
      padding: 48px 36px;
    }
    .ars-reg-right {
      padding: 48px 40px;
    }
  }

  @media (max-width: 860px) {
    .ars-reg-root {
      flex-direction: column;
    }
    .ars-reg-left {
      flex: none;
      border-right: none;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 40px 32px 36px;
    }
    .ars-reg-left-bottom {
      display: none;
    }
    .ars-reg-logo {
      margin-bottom: 32px;
    }
    .ars-reg-right {
      padding: 40px 32px 56px;
    }
    .ars-reg-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .ars-reg-left {
      padding: 32px 20px 28px;
    }
    .ars-reg-logo {
      width: 56px;
      margin-bottom: 24px;
    }
    .ars-reg-headline {
      font-size: 26px;
    }
    .ars-reg-right {
      padding: 32px 16px 48px;
    }
    .ars-reg-card-title {
      font-size: 22px;
    }
    .ars-reg-input,
    .ars-reg-select {
      padding: 12px 14px;
    }
  }
`;

const Register = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerService({ email, password, fullName, role: role as UserRole, departmentId: department || undefined });
      setSuccess('Registration successful! You can now log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Registration failed. Try a different email or role.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div className="ars-reg-root">

        {/* ── LEFT PANEL ── */}
        <div className="ars-reg-left">
          <div className="ars-reg-grid" />
          <div className="ars-reg-left-top">
            <img src={logo} alt="ARS Logo" className="ars-reg-logo" />
            <p className="ars-reg-eyebrow">ARS Tunisie Platform</p>
            <h1 className="ars-reg-headline">
              Join the<br />
              <span>ARS</span> Team.
            </h1>
            <p className="ars-reg-desc">
              Register your account to access the ARS platform and manage your team with confidence.
            </p>
          </div>

          <div className="ars-reg-left-bottom">
            <div className="ars-reg-steps">
              <div className="ars-reg-step">
                <div className="ars-reg-step-num">1</div>
                <span className="ars-reg-step-text">Fill in your details</span>
              </div>
              <div className="ars-reg-step">
                <div className="ars-reg-step-num">2</div>
                <span className="ars-reg-step-text">Choose your role & department</span>
              </div>
              <div className="ars-reg-step">
                <div className="ars-reg-step-num">3</div>
                <span className="ars-reg-step-text">Start managing with ARS</span>
              </div>
            </div>
            <p className="ars-reg-copyright">
              &copy; {new Date().getFullYear()} ARS Tunisie. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="ars-reg-right">
          <div className="ars-reg-card">
            <div className="ars-reg-card-header">
              <span className="ars-reg-card-label">New Account</span>
              <h2 className="ars-reg-card-title">Create Account</h2>
              <p className="ars-reg-card-subtitle">Complete the form below to get started</p>
            </div>

            <form className="ars-reg-form" onSubmit={handleSubmit}>
              {error && <div className="ars-reg-error">{error}</div>}
              {success && <div className="ars-reg-success">{success}</div>}

              <div className="ars-reg-row">
                <div className="ars-reg-field">
                  <label className="ars-reg-field-label">Email Address</label>
                  <input
                    className="ars-reg-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="ars-reg-field">
                  <label className="ars-reg-field-label">Full Name</label>
                  <input
                    className="ars-reg-input"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ars-reg-field">
                <label className="ars-reg-field-label">Password</label>
                <input
                  className="ars-reg-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <span className="ars-reg-password-hint">{passwordHelp}</span>
              </div>

              <div className="ars-reg-row">
                <div className="ars-reg-field">
                  <label className="ars-reg-field-label">Role</label>
                  <select
                    className="ars-reg-select"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    required
                  >
                    <option value="">Select role</option>
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ars-reg-field">
                  <label className="ars-reg-field-label">Département</label>
                  <select
                    className="ars-reg-select"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  >
                    <option value="">Département (optionnel)</option>
                    {departmentOptions.map(dept => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="ars-reg-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Registering…' : 'Create Account'}
              </button>
            </form>

            <div className="ars-reg-footer">
              Already have an account?{' '}
              <Link to="/login" className="ars-reg-footer-link">
                Sign In
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default Register;