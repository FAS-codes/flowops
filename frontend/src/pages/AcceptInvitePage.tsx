import { CheckCircle2, MailWarning } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, loading, refreshMe, switchOrg } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'accepting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (loading || !user || !token || state !== 'idle') return;
    setState('accepting');
    (async () => {
      try {
        const { data } = await api.post('/organization/invitations/accept', { token });
        await refreshMe();
        if (data.organization?.id) switchOrg(data.organization.id);
        setOrgName(data.organization?.name ?? 'your new workspace');
        setState('done');
      } catch (err) {
        setMessage(apiError(err, 'This invitation is invalid or has expired.'));
        setState('error');
      }
    })();
  }, [loading, user, token, state, refreshMe, switchOrg]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8 text-center">
          {!token ? (
            <Empty message="No invitation token was provided." />
          ) : loading || state === 'accepting' ? (
            <div className="flex flex-col items-center gap-3 py-4 text-brand-600">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-ink-muted">Accepting your invitation…</p>
            </div>
          ) : !user ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">You've been invited!</h2>
              <p className="text-sm text-ink-muted">
                Sign in or create an account with the invited email to join the workspace.
              </p>
              <div className="flex gap-3">
                <Link
                  to={`/login?redirect=/invite/accept?token=${token}`}
                  className="btn-secondary flex-1"
                >
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary flex-1">
                  Create account
                </Link>
              </div>
            </div>
          ) : state === 'done' ? (
            <div className="space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-lg font-semibold text-ink">You're in!</h2>
              <p className="text-sm text-ink-muted">
                You've joined <span className="font-medium text-ink">{orgName}</span>.
              </p>
              <button
                className="btn-primary w-full"
                onClick={() => navigate('/app/dashboard')}
              >
                Go to dashboard
              </button>
            </div>
          ) : (
            <Empty message={message} />
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <MailWarning className="mx-auto h-12 w-12 text-amber-500" />
      <h2 className="text-lg font-semibold text-ink">Invitation problem</h2>
      <p className="text-sm text-ink-muted">{message}</p>
      <Link to="/app/dashboard" className="btn-secondary w-full">
        Back to app
      </Link>
    </div>
  );
}
