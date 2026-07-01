import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  api,
  getActiveOrg,
  setAccessToken,
  setActiveOrg as persistActiveOrg,
} from '../lib/api';
import { AuthUser, Organization, Role } from '../lib/types';

interface AuthState {
  user: AuthUser | null;
  organizations: Organization[];
  activeOrg: Organization | null;
  role: Role | undefined;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => void;
  refreshMe: () => Promise<void>;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(getActiveOrg());
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setOrganizations(data.organizations);
    // Choose an active org: keep the current one if still valid, else default.
    const ids = new Set(data.organizations.map((o: Organization) => o.id));
    const next =
      (activeOrgId && ids.has(activeOrgId) && activeOrgId) ||
      data.defaultOrganization ||
      data.organizations[0]?.id ||
      null;
    setActiveOrgId(next);
    persistActiveOrg(next);
  }, [activeOrgId]);

  // Bootstrap: try to restore a session via the refresh cookie on first load.
  // Guarded so React StrictMode's double effect-invoke doesn't fire two
  // refreshes (the second would rotate the cookie and 401, clobbering the first).
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        await loadMe();
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      await loadMe();
    },
    [loadMe]
  );

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await api.post('/auth/register', input);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setOrganizations([{ ...data.organization, role: 'owner' }]);
    setActiveOrgId(data.organization.id);
    persistActiveOrg(data.organization.id);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrgId(null);
    persistActiveOrg(null);
  }, []);

  const switchOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    persistActiveOrg(orgId);
  }, []);

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === activeOrgId) ?? null,
    [organizations, activeOrgId]
  );

  const value: AuthState = {
    user,
    organizations,
    activeOrg,
    role: activeOrg?.role,
    loading,
    login,
    register,
    logout,
    switchOrg,
    refreshMe: loadMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
