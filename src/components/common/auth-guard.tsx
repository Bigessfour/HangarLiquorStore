import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import { ensureDemoUser } from '@/lib/demo-auth';

export function AuthGuard() {
  const navigate = useNavigate();
  ensureDemoUser();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return <Outlet />;
}
