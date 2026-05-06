import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getValidatedCachedUser, clearCachedAuth } from '@/utils/cachedAuthIntegrity';
import { devLog } from '@/utils/devLog';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [portalCheck, setPortalCheck] = useState<'pending' | 'allowed' | 'distributor'>('pending');

  // Defense-in-depth: if a distributor-only user lands on a Field Sales page,
  // bounce them to the distributor portal.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setPortalCheck('allowed');
        return;
      }
      try {
        const { data: userType, error } = await supabase
          .rpc('get_user_type', { p_user_id: user.id });
        if (cancelled) return;
        if (!error && userType === 'distributor') {
          devLog('🚫 Distributor user attempted to access Field Sales — redirecting');
          toast.error('Please use the Distributor Portal login.');
          await supabase.auth.signOut();
          setPortalCheck('distributor');
        } else {
          setPortalCheck('allowed');
        }
      } catch (err) {
        devLog('Portal type check failed — allowing through:', err);
        if (!cancelled) setPortalCheck('allowed');
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || (user && portalCheck === 'pending')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (portalCheck === 'distributor') {
    return <Navigate to="/distributor-portal/login" replace />;
  }

  // When offline, allow access if validated cached user data exists
  // Uses integrity checking to prevent tampered data from granting access
  if (!user) {
    const validatedUser = getValidatedCachedUser();
    if (validatedUser) {
      devLog('✅ Allowing offline access with validated cached user');
      return <>{children}</>;
    }
    
    // Save the originally requested URL for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/' && currentPath !== '/auth' && !currentPath.startsWith('/auth')) {
      sessionStorage.setItem('auth_redirect_url', currentPath);
      // Clear any invalid cached data
      clearCachedAuth();
      // Include redirect URL as query parameter for robustness
      const encodedPath = encodeURIComponent(currentPath);
      return <Navigate to={`/auth?redirect=${encodedPath}`} replace />;
    }
    
    // Clear any invalid cached data
    clearCachedAuth();
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
