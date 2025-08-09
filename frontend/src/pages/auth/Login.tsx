import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import logo from '../../assets/ars-logo.png';

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
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="ARS Logo" className="login-logo" />
        <h2 className="login-title">ARS Login</h2>
        <p className="login-subtitle">Sign in to your account</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-footer">
          <span>Forgot password? <a href="/password-reset">Reset</a></span><br />
          <span>Don't have an account? <a href="/register">Register</a></span><br />
          &copy; {new Date().getFullYear()} ARS Tunisie. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;