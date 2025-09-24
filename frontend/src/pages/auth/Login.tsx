import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginService } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import logo from '../../assets/ars-logo.png';

const responsiveContainer: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  background: 'linear-gradient(90deg, #fff 55%, #d52b36 45%)',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  flexDirection: 'row',
};

const responsiveLeft: React.CSSProperties = {
  flex: 1,
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 32px',
};

const responsiveRight: React.CSSProperties = {
  flex: 1,
  background: '#d52b36',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 320,
};

const responsiveBox: React.CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 8px 32px rgba(213,43,54,0.10)',
  padding: '40px 36px 32px 36px',
  width: 380,
  maxWidth: '95vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const responsiveInput: React.CSSProperties = {
  border: '1.5px solid #d52b36',
  borderRadius: 7,
  padding: '12px 14px',
  fontSize: 16,
  outline: 'none',
  transition: 'border 0.2s',
  width: '100%',
  boxSizing: 'border-box',
};

const responsiveButton: React.CSSProperties = {
  background: 'linear-gradient(90deg, #d52b36 60%, #e85c67 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 17,
  border: 'none',
  borderRadius: 7,
  padding: '13px 0',
  marginTop: 10,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(213,43,54,0.10)',
  transition: 'background 0.2s, box-shadow 0.2s',
  width: '100%',
};

const responsiveError: React.CSSProperties = {
  background: '#ffeaea',
  color: '#d52b36',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 15,
  marginBottom: 4,
  border: '1px solid #f5b3b7',
  textAlign: 'center',
};

const responsiveFooter: React.CSSProperties = {
  marginTop: 22,
  fontSize: 15,
  color: '#444',
  textAlign: 'center',
  width: '100%',
};

const responsiveLogo: React.CSSProperties = {
  width: 120,
  marginBottom: 32,
  filter: 'drop-shadow(0 2px 8px rgba(213,43,54,0.15))',
};

const responsiveTitle: React.CSSProperties = {
  color: '#d52b36',
  fontWeight: 700,
  fontSize: 28,
  marginBottom: 8,
  letterSpacing: 0.5,
};

const responsiveSubtitle: React.CSSProperties = {
  color: '#444',
  fontSize: 16,
  marginBottom: 18,
  fontWeight: 500,
  letterSpacing: 0.2,
};

const responsiveWelcome: React.CSSProperties = {
  color: '#d52b36',
  fontWeight: 800,
  fontSize: 36,
  marginBottom: 16,
  letterSpacing: 1,
};

const responsiveDesc: React.CSSProperties = {
  color: '#333',
  fontSize: 18,
  maxWidth: 340,
  textAlign: 'center',
  marginBottom: 0,
  lineHeight: 1.5,
};

const responsiveCopyright: React.CSSProperties = {
  color: '#888',
  fontSize: 13,
};

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
      <style>{mediaQuery}</style>
      <div className="ars-auth-container" style={responsiveContainer}>
        {/* Left Section: Branding */}
        <div className="ars-auth-left" style={responsiveLeft}>
          <img
            src={logo}
            alt="ARS Logo"
            className="ars-auth-logo"
            style={responsiveLogo}
          />
          <h1 className="ars-auth-welcome" style={responsiveWelcome}>
            Welcome Back
          </h1>
          <p className="ars-auth-desc" style={responsiveDesc}>
            Sign in to your ARS account and continue managing your team with confidence.
          </p>
        </div>

        {/* Right Section: Login Form */}
        <div className="ars-auth-right" style={responsiveRight}>
          <div className="ars-auth-box" style={responsiveBox}>
            <h2 className="ars-auth-title" style={responsiveTitle}>
              ARS Login
            </h2>
            <p className="ars-auth-subtitle" style={responsiveSubtitle}>
              Sign in to your account
            </p>
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
                <div className="login-error" style={responsiveError}>
                  {error}
                </div>
              )}
              <input
                className="login-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={responsiveInput}
              />
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={responsiveInput}
              />
              <button
                className="login-button"
                type="submit"
                disabled={loading}
                style={{
                  ...responsiveButton,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="login-footer" style={responsiveFooter}>
              <span>
                Forgot password?{' '}
                <Link
                  to="/password-reset"
                  style={{
                    color: '#d52b36',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Reset
                </Link>
              </span>
              <br />
              <span>
                Don't have an account?{' '}
                <Link
                  to="/register"
                  style={{
                    color: '#d52b36',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Register
                </Link>
              </span>
              <br />
              <span style={responsiveCopyright}>
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