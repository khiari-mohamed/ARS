import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types/user.d';
import { canEditRole } from '../../utils/roleUtils';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'ADMINISTRATEUR', label: 'Administrateur' },
  { value: 'CHEF_EQUIPE', label: "Chef d'Équipe" },
  { value: 'GESTIONNAIRE', label: 'Gestionnaire' },
  { value: 'CLIENT_SERVICE', label: 'Service Client' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SCAN_TEAM', label: 'Équipe Scan' },
  { value: 'BO', label: 'Bureau d’Ordre' },
];

interface UserFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<User>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  currentUserRole: UserRole;
  isSubmitting?: boolean;
  error?: string | null;
  showPassword?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  initial = {},
  onSubmit,
  onCancel,
  currentUserRole,
  isSubmitting,
  error,
  showPassword = true,
}) => {
  const [form, setForm] = useState({
    fullName: initial.fullName || '',
    email: initial.email || '',
    password: '',
    role: (initial.role as UserRole) || 'GESTIONNAIRE',
    department: initial.department || '',
    active: initial.active ?? true,
  });
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(error || null);
  }, [error]);

  const validate = () => {
    if (!form.fullName.trim()) return 'Nom complet requis';
    if (!form.email.trim()) return 'Email requis';
    if (!/^[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(form.email)) return 'Email invalide';
    if (mode === 'create' && showPassword) {
      if (!form.password) return 'Mot de passe requis';
      if (form.password.length < 8) return 'Mot de passe trop court';
      if (!/[A-Z]/.test(form.password)) return 'Le mot de passe doit contenir une majuscule';
      if (!/[0-9]/.test(form.password)) return 'Le mot de passe doit contenir un chiffre';
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTouched({ ...touched, [e.target.name]: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setFormError(err);
    if (err) return;
    try {
      await onSubmit({
        ...form,
        ...(mode === 'edit' ? { password: undefined } : {}),
      });
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la soumission');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div>
        <label>Nom complet</label>
        <input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          className="input"
        />
      </div>
      <div>
        <label>Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          type="email"
          disabled={isSubmitting || mode === 'edit'}
          className="input"
        />
      </div>
      {showPassword && (
        <div>
          <label>Mot de passe</label>
          <input
            name="password"
            value={form.password}
            onChange={handleChange}
            required={mode === 'create'}
            type="password"
            disabled={isSubmitting}
            className="input"
            autoComplete="new-password"
          />
        </div>
      )}
      <div>
        <label>Rôle</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          disabled={!canEditRole(currentUserRole) || isSubmitting}
          className="input"
        >
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Département (optionnel)</label>
        <input
          name="department"
          value={form.department}
          onChange={handleChange}
          disabled={isSubmitting}
          className="input"
        />
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={e => setForm({ ...form, active: e.target.checked })}
            disabled={isSubmitting}
          />
          Actif
        </label>
      </div>
      {formError && <div style={{ color: 'red', margin: '8px 0' }}>{formError}</div>}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </button>
      </div>
    </form>
  );
};