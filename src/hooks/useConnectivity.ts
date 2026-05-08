import { useMemo } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';

type Status = 'unknown' | 'online' | 'offline';

/**
 * Lightweight connectivity hook that works on both web and native (Capacitor)
 * 
 * On native: Uses Capacitor Network plugin for reliable status
 * On web: Uses browser events + optional probe for verification
 */
export function useConnectivity(_pollMs = 30000, _startupDelayMs = 2000): Status {
  const { isOnline, lastChecked } = useNetwork();

  return useMemo(() => {
    if (!lastChecked) return 'unknown';
    return isOnline ? 'online' : 'offline';
  }, [isOnline, lastChecked]);
}