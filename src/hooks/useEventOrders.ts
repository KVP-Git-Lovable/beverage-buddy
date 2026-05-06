import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventOrderSummary {
  id: string;
  retailer_name: string | null;
  total_amount: number;
  status: string | null;
  created_at: string;
}

export interface EventOrdersResult {
  orders: EventOrderSummary[];
  totalCount: number;
  totalValue: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Fetch all orders attached to a given event (activity_events.id).
 * Cancelled orders are excluded from value/count totals.
 */
export const useEventOrders = (eventId: string | null | undefined): EventOrdersResult => {
  const [orders, setOrders] = useState<EventOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!eventId) {
      setOrders([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, retailer_name, total_amount, status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useEventOrders] fetch error:', error);
        setOrders([]);
        return;
      }
      setOrders((data || []) as EventOrderSummary[]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Listen for visitDataChanged so newly placed orders appear without manual refresh
  useEffect(() => {
    const handler = () => fetchOrders();
    window.addEventListener('visitDataChanged', handler);
    window.addEventListener('visitStatusChanged', handler);
    return () => {
      window.removeEventListener('visitDataChanged', handler);
      window.removeEventListener('visitStatusChanged', handler);
    };
  }, [fetchOrders]);

  const liveOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalCount = liveOrders.length;
  const totalValue = liveOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return {
    orders,
    totalCount,
    totalValue,
    isLoading,
    refetch: fetchOrders,
  };
};
