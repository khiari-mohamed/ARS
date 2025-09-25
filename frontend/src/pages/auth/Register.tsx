import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerService, UserRole } from '../../services/authService';
import logo from '../../assets/ars-logo.png';

const roleOptions = [
  { label: 'Super Admin', value: UserRole.SUPER_ADMIN },
  { label: 'Chef d’équipe', value: UserRole.CHEF_EQUIPE },
  { label: 'Gestionnaire', value: UserRole.GESTIONNAIRE },
  { label: 'Customer Service', value: UserRole.CUSTOMER_SERVICE },
  { label: 'Finance', value: UserRole.FINANCE },
  { label: 'Équipe Scan', value: UserRole.SCAN_TEAM },
  { label: 'Bureau d\'Ordre', value: UserRole.BO },
];

const passwordHelp =
  'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.';

const mediaQuery = `
@media (max-width: 900px) {
  .ars-auth-container {
    flex-direction: column !important;
    background: #fff !important;
  }
  .ars-auth-left, .ars-auth-right {
    flex: unset !important;
    min-width: unset !important;
    width: 100% !important;
    padding: 32px 8vw !important;
    box-sizing: border-box;
  }
  .ars-auth-right {
    background: #fff !important;
    justify-content: flex-start !important;
    padding-top: 0 !important;
  }
  .ars-auth-box {
    width: 100% !important;
    max-width: 100vw !important;
    box-shadow: none !important;
    border-radius: 12px !important;
    padding: 32px 0 24px 0 !important;
  }
}
@media (max-width: 600px) {
  .ars-auth-left, .ars-auth-right {
    padding: 18px 2vw !important;
  }
  .ars-auth-box {
    padding: 18px 0 12px 0 !important;
  }
  .ars-auth-logo {
    width: 80px !important;
    margin-bottom: 18px !important;
  }
  .ars-auth-title {
    font-size: 22px !important;
  }
  .ars-auth-welcome {
    font-size: 24px !important;
  }
  .ars-auth-desc {
    font-size: 15px !important;
  }
}
`;

const Register = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
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
      await registerService({ email, password, fullName, role: role as UserRole });
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
      <style>{mediaQuery}</style>
      <div className="ars-auth-container" style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(90deg, #fff 55%, #d52b36 45%)',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      }}>
        {/* Left Section: Branding */}
        <div className="ars-auth-left" style={{
          flex: 1,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
        }}>
          <img
            src={logo}
            alt="ARS Logo"
            className="ars-auth-logo"
            style={{
              width: 120,
              marginBottom: 32,
              filter: 'drop-shadow(0 2px 8px rgba(213,43,54,0.15))',
            }}
          />
          <h1 className="ars-auth-welcome" style={{
            color: '#d52b36',
            fontWeight: 800,
            fontSize: 36,
            marginBottom: 16,
            letterSpacing: 1,
          }}>
            Welcome to ARS
          </h1>
          <p className="ars-auth-desc" style={{
            color: '#333',
            fontSize: 18,
            maxWidth: 340,
            textAlign: 'center',
            marginBottom: 0,
            lineHeight: 1.5,
          }}>
            Register your account to access the ARS platform and manage your team with confidence.
          </p>
        </div>

        {/* Right Section: Registration Form */}
        <div className="ars-auth-right" style={{
          flex: 1,
          background: '#d52b36',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 400,
        }}>
          <div className="ars-auth-box" style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(213,43,54,0.10)',
            padding: '40px 36px 32px 36px',
            width: 380,
            maxWidth: '90%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <h2 className="ars-auth-title" style={{
              color: '#d52b36',
              fontWeight: 700,
              fontSize: 28,
              marginBottom: 18,
              letterSpacing: 0.5,
            }}>
              Create Account
            </h2>
            <form
              onSubmit={handleSubmit}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
              className="login-form"
            >
              {error && (
                <div
                  style={{
                    background: '#ffeaea',
                    color: '#d52b36',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 15,
                    marginBottom: 4,
                    border: '1px solid #f5b3b7',
                    textAlign: 'center',
                  }}
                  className="login-error"
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  style={{
                    background: '#eafbe7',
                    color: '#1a7f37',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 15,
                    marginBottom: 4,
                    border: '1px solid #b3e6c7',
                    textAlign: 'center',
                  }}
                  className="login-success"
                >
                  {success}
                </div>
              )}
              <input
                className="login-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d52b36',
                  borderRadius: 7,
                  padding: '12px 14px',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
              <input
                className="login-input"
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d52b36',
                  borderRadius: 7,
                  padding: '12px 14px',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d52b36',
                  borderRadius: 7,
                  padding: '12px 14px',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
              <div
                className="password-help"
                style={{
                  color: '#888',
                  fontSize: 13,
                  marginBottom: -8,
                  marginTop: -10,
                  textAlign: 'left',
                }}
              >
                {passwordHelp}
              </div>
              <select
                className="login-input"
                value={role}
                onChange={e => setRole(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d52b36',
                  borderRadius: 7,
                  padding: '12px 14px',
                  fontSize: 16,
                  background: '#fff',
                  color: '#222',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              >
                <option value="">Select role</option>
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="login-button"
                type="submit"
                disabled={loading}
                style={{
                  background: loading
                    ? 'linear-gradient(90deg, #d52b36 60%, #e85c67 100%)'
                    : 'linear-gradient(90deg, #d52b36 60%, #e85c67 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 17,
                  border: 'none',
                  borderRadius: 7,
                  padding: '13px 0',
                  marginTop: 10,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(213,43,54,0.10)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>
            <div
              className="login-footer"
              style={{
                marginTop: 22,
                fontSize: 15,
                color: '#444',
                textAlign: 'center',
              }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#d52b36',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;