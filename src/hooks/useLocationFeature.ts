import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLocationFeature = () => {
  const queryClient = useQueryClient();
  
  const { data, isLoading: loading } = useQuery({
    queryKey: ['feature-flag', 'location_check_in_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('is_enabled')
        .eq('feature_key', 'location_check_in_enabled')
        .maybeSingle();
      
      if (error) {
        console.error('Error loading location feature settings:', error);
        return false;
      }
      return data?.is_enabled ?? false;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Subscribe to changes in feature flags
  useEffect(() => {
    const channel = supabase
      .channel('location-feature-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags',
        filter: 'feature_key=eq.location_check_in_enabled'
      }, (payload) => {
        if (payload.new && 'is_enabled' in payload.new) {
          queryClient.setQueryData(['feature-flag', 'location_check_in_enabled'], payload.new.is_enabled);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { isLocationEnabled: data ?? false, loading };
};
