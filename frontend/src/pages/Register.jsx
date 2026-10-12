import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { Alert, Button, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null); // null | 'checking' | 'ok' | 'taken'

  // Vérification (debounce) de la disponibilité du nom d'utilisateur
  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      setAvailability(null);
      return undefined;
    }
    let cancelled = false;
    setAvailability('checking');
    const timer = setTimeout(() => {
      api
        .get(`/auth/username-available?username=${encodeURIComponent(username)}`)
        .then((data) => !cancelled && setAvailability(data.available ? 'ok' : 'taken'))
        .catch(() => !cancelled && setAvailability(null));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.username]);

  const usernameHint = {
    checking: 'Vérification…',
    ok: 'Ce nom est disponible ✓',
    taken: undefined,
  }[availability];

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setErrors({});
    try {
      await register({ ...form, username: form.username.trim().toLowerCase() });
      navigate('/app/links', { replace: true });
    } catch (err) {
      if (err.details) setErrors(err.details);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Créez votre page LinkPulse"
      subtitle="Gratuit, sans carte bancaire."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Nom d'utilisateur"
          placeholder="monnom"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          error={errors.username || (availability === 'taken' ? "Ce nom d'utilisateur est déjà pris" : undefined)}
          hint={usernameHint || 'Votre page : /@' + (form.username.trim().toLowerCase() || 'monnom')}
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          hint="8 caractères minimum"
          required
        />
        {error && <Alert type="error">{error}</Alert>}
        <Button type="submit" loading={loading} disabled={availability === 'taken'} className="w-full">
          Créer ma page
        </Button>
      </form>
    </AuthLayout>
  );
}
