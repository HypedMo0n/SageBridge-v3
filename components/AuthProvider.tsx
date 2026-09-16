'use client';

import { type User, onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getSelectedCompanyId, setSelectedCompanyId, type BootstrapState, type CompanyDetail } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { isSetupComplete } from '@/lib/onboarding-stage';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  workspace: BootstrapState | null;
  company: CompanyDetail | null;
  setupComplete: boolean;
  selectCompany: (companyId: string) => void;
  refreshWorkspace: () => Promise<BootstrapState>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_PATHS = ['/login', '/signup', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [workspace, setWorkspace] = useState<BootstrapState | null>(null);
  const [companyId, setCompanyId] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const applyWorkspace = useCallback((next: BootstrapState) => {
    setWorkspace(next);
    const stored = getSelectedCompanyId();
    const selected = next.companies.some((item) => item.id === stored) ? stored : next.companies[0]?.id || '';
    setSelectedCompanyId(selected);
    setCompanyId(selected);
    return next;
  }, []);

  const refreshWorkspace = useCallback(async () => applyWorkspace(await api.bootstrap()), [applyWorkspace]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser?.emailVerified) {
        if (!nextUser) { setWorkspace(null); setCompanyId(''); }
        if (active) setAuthLoading(false);
        return;
      }
      try { const next = await api.bootstrap(); if (active) applyWorkspace(next); }
      catch { if (active) setWorkspace(null); }
      finally { if (active) setAuthLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, [applyWorkspace]);

  useEffect(() => {
    if (authLoading) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user && !user.emailVerified && pathname !== '/verify-email') router.replace('/verify-email');
    else if (user?.emailVerified && (isPublic || pathname === '/verify-email')) {
      const requested = pathname === '/login' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.replace(requested?.startsWith('/') ? requested : '/onboarding');
    }
  }, [authLoading, pathname, router, user]);

  const company = workspace?.companies.find((item) => item.id === companyId) || null;
  const loading = authLoading;
  const setupComplete = isSetupComplete(workspace?.companies || []);

  const selectCompany = useCallback((nextCompanyId: string) => {
    if (!workspace?.companies.some((item) => item.id === nextCompanyId)) return;
    setSelectedCompanyId(nextCompanyId);
    setCompanyId(nextCompanyId);
  }, [workspace]);

  const getIdToken = useCallback(async (forceRefresh = false) => {
    if (!auth.currentUser) throw new Error('Your session has ended. Please sign in again.');
    return auth.currentUser.getIdToken(forceRefresh);
  }, []);

  const logout = useCallback(async () => { setSelectedCompanyId(''); await firebaseSignOut(auth); router.replace('/login'); }, [router]);

  const value = useMemo(() => ({ user, loading, workspace, company, setupComplete, selectCompany, refreshWorkspace, getIdToken, logout }), [user, loading, workspace, company, setupComplete, selectCompany, refreshWorkspace, getIdToken, logout]);
  const permitted = PUBLIC_PATHS.includes(pathname) || (!!user && (user.emailVerified || pathname === '/verify-email'));

  // Route gating: verified user with incomplete setup must go to /onboarding
  useEffect(() => {
    if (authLoading || !user?.emailVerified) return;
    const isOnboarding = pathname === '/onboarding';
    const isSetupIncomplete = !setupComplete;

    if (isSetupIncomplete && !isOnboarding) {
      const protectedRoutes = ['/dashboard', '/customers', '/invoices', '/products', '/quotes', '/reports', '/search', '/more'];
      if (protectedRoutes.some(route => pathname.startsWith(route))) {
        router.replace('/onboarding');
      }
    }
  }, [authLoading, user, setupComplete, pathname, router]);

  return <AuthContext.Provider value={value}>{loading || !permitted ? <AuthLoading /> : children}</AuthContext.Provider>;
}

function AuthLoading() { return <div className="auth-shell"><div className="auth-card"><p className="notice">Checking your secure session…</p></div></div>; }
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
