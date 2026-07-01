import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      toast.error(apiError(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('owner@acme.test');
    setPassword('Password123');
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to your FlowOps workspace.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Sign in'}
        </button>
      </form>

      <button
        onClick={fillDemo}
        className="mt-3 w-full rounded-lg border border-dashed border-line py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        Use demo account
      </button>

      <p className="mt-8 text-center text-sm text-ink-muted">
        New to FlowOps?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create a workspace
        </Link>
      </p>
    </AuthShell>
  );
}
