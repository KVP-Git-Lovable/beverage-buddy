import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { devLog } from '@/utils/devLog';

interface DistributorProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guards all /distributor-portal/* routes.
 * Requires a valid `distributor_user` entry in localStorage (set by DistributorLogin).
 * If absent → redirect to /distributor-portal/login.
 */
export const DistributorProtectedRoute = ({ children }: DistributorProtectedRouteProps) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('distributor_user');
      const distId = localStorage.getItem('distributor_id');
      if (!raw || !distId) {
        devLog('🚫 No distributor_user in localStorage — blocking distributor portal access');
        setAuthorized(false);
      } else {
        const parsed = JSON.parse(raw);
        if (!parsed?.id) {
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      }
    } catch (err) {
      devLog('Error parsing distributor_user from localStorage:', err);
      setAuthorized(false);
    } finally {
      setChecking(false);
    }
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/distributor-portal/login" replace />;
  }

  return <>{children}</>;
};
