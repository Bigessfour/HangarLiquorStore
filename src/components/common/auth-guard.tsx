import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { getCurrentUser, refreshAuthSession, signOut } from '@/lib/auth';
import { ensureDemoUser } from '@/lib/demo-auth';

function tokenLooksValid(token: string): boolean {
  if (token.startsWith('demo-')) return true;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return false;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    const exp = Number(json.exp);
    if (!Number.isFinite(exp)) return false;
    return Date.now() / 1000 < exp - 30;
  } catch {
    return false;
  }
}

export function AuthGuard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      ensureDemoUser();
      const user = getCurrentUser();
      if (!user) {
        if (!cancelled) navigate('/login', { replace: true });
        return;
      }

      if (user.token.startsWith('demo-')) {
        if (!cancelled) setReady(true);
        return;
      }

      // Prefer a still-valid ID token (keeps Owner calls working); refresh in background.
      if (tokenLooksValid(user.token)) {
        if (!cancelled) setReady(true);
        void refreshAuthSession();
        return;
      }

      const refreshed = await refreshAuthSession();
      if (cancelled) return;
      if (!refreshed) {
        signOut();
        navigate('/login?reason=session', { replace: true });
        return;
      }
      setReady(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4 text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  return <Outlet />;
}
