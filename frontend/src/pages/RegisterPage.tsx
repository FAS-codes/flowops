import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../lib/api';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    organizationName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Workspace created — welcome aboard!');
      navigate('/app/dashboard');
    } catch (err) {
      toast.error(apiError(err, 'Could not create your workspace'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Create your workspace
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Set up your organization in under a minute.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Your name</label>
          <input
            className="input"
            placeholder="Jane Doe"
            value={form.name}
            onChange={update('name')}
            required
          />
        </div>
        <div>
          <label className="label">Organization name</label>
          <input
            className="input"
            placeholder="Acme Inc."
            value={form.organizationName}
            onChange={update('organizationName')}
            required
          />
        </div>
        <div>
          <label className="label">Work email</label>
          <input
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@company.com"
            value={form.email}
            onChange={update('email')}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Create workspace'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
