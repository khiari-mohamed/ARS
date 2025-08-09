import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as registerService, UserRole } from '../../services/authService';
import logo from '../../assets/ars-logo.png';

const roleOptions = [
  { label: 'Super Admin', value: UserRole.SUPER_ADMIN },
  { label: 'Chef d’équipe', value: UserRole.CHEF_EQUIPE },
  { label: 'Gestionnaire', value: UserRole.GESTIONNAIRE },
  { label: 'Customer Service', value: UserRole.CUSTOMER_SERVICE },
  { label: 'Finance', value: UserRole.FINANCE },
];

const passwordHelp = "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.";

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
      setError(err.response?.data?.message || 'Registration failed. Try a different email or role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="ARS Logo" className="login-logo" />
        <h2 className="login-title">Register</h2>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}
          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="password-help">{passwordHelp}</div>
          <select
            className="login-input"
            value={role}
            onChange={e => setRole(e.target.value)}
            required
          >
            <option value="">Select role</option>
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="login-footer">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register;