import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCheckInMandatory = () => {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['feature-flag', 'check_in_mandatory_for_order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('is_enabled')
        .eq('feature_key', 'check_in_mandatory_for_order')
        .maybeSingle();
      
      if (error) {
        console.error('Error loading check-in mandatory settings:', error);
        return false;
      }
      return data?.is_enabled ?? false;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return { isCheckInMandatory: data ?? false, loading };
};
