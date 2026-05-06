import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BeatMetrics {
  lastVisited: string | null;
  ordersThisMonth: number;
  avgBusiness: number;
  revenueGrowth: number;
  visitsPerMonth: number;
  retailersAdded3Months: number;
  isRecurring: boolean;
  recurringDetails: string | null;
  lastVisitOrderValue: number;
}

export function useBeatMetrics(beatId: string, userId: string) {
  const [metrics, setMetrics] = useState<BeatMetrics>({
    lastVisited: null,
    ordersThisMonth: 0,
    avgBusiness: 0,
    revenueGrowth: 0,
    visitsPerMonth: 0,
    retailersAdded3Months: 0,
    isRecurring: false,
    recurringDetails: null,
    lastVisitOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (beatId && userId) {
      loadMetrics();
    }
  }, [beatId, userId]);

  const loadMetrics = async () => {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Get retailers in this beat
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, created_at')
        .eq('beat_id', beatId)
        .eq('user_id', userId);

      const retailerIds = retailers?.map(r => r.id) || [];

      if (retailerIds.length === 0) {
        setLoading(false);
        return;
      }

      // Last visited date from beat_plans - when this beat was last planned
      const { data: lastBeatPlan } = await supabase
        .from('beat_plans')
        .select('plan_date')
        .eq('beat_id', beatId)
        .eq('user_id', userId)
        .lte('plan_date', new Date().toISOString().split('T')[0])
        .order('plan_date', { ascending: false })
        .limit(1);

      const lastVisitedDate = lastBeatPlan?.[0]?.plan_date || null;

      // Also get last visit for order value calculation
      const { data: completedVisits } = await supabase
        .from('visits')
        .select('planned_date, id')
        .in('retailer_id', retailerIds)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .lte('planned_date', new Date().toISOString().split('T')[0])
        .order('planned_date', { ascending: false })
        .limit(1);

      const lastVisit = completedVisits?.[0] || null;

      // Get last visit order value
      let lastVisitOrderValue = 0;
      if (lastVisit?.id) {
        const { data: lastVisitOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('visit_id', lastVisit.id)
          .eq('status', 'confirmed');
        
        lastVisitOrderValue = lastVisitOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      }

      // Orders this month
      const { data: ordersThisMonth } = await supabase
        .from('orders')
        .select('total_amount')
        .in('retailer_id', retailerIds)
        .gte('order_date', currentMonthStart)
        .eq('status', 'confirmed');

      const ordersCount = ordersThisMonth?.length || 0;
      const totalRevenue = ordersThisMonth?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Last month revenue
      const { data: lastMonthOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .in('retailer_id', retailerIds)
        .gte('order_date', lastMonthStart)
        .lte('order_date', lastMonthEnd)
        .eq('status', 'confirmed');

      const lastMonthRevenue = lastMonthOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const growth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Visits planned in current month
      const { data: visits } = await supabase
        .from('visits')
        .select('id')
        .in('retailer_id', retailerIds)
        .eq('user_id', userId)
        .gte('planned_date', currentMonthStart)
        .lte('planned_date', new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

      // Retailers added in last 3 months
      const newRetailers = retailers?.filter(r => 
        new Date(r.created_at) >= new Date(threeMonthsAgo)
      ).length || 0;

      // Check if beat is recurring
      const { data: recurringPlans } = await supabase
        .from('beat_plans')
        .select('beat_data')
        .eq('beat_id', beatId)
        .eq('user_id', userId)
        .gte('plan_date', currentMonthStart)
        .limit(1);

      let isRecurring = false;
      let recurringDetails = null;

      if (recurringPlans && recurringPlans.length > 0) {
        const beatData = recurringPlans[0].beat_data as any;
        if (beatData?.isRecurring) {
          isRecurring = true;
          recurringDetails = `${beatData.repeatType} - ${beatData.repeatUntilMode === 'permanent' ? 'Ongoing' : 'Until ' + new Date(beatData.repeatEndDate).toLocaleDateString()}`;
        }
      }

      setMetrics({
        lastVisited: lastVisitedDate,
        ordersThisMonth: ordersCount,
        avgBusiness: totalRevenue / (ordersCount || 1),
        revenueGrowth: growth,
        visitsPerMonth: visits?.length || 0,
        retailersAdded3Months: newRetailers,
        isRecurring,
        recurringDetails,
        lastVisitOrderValue
      });
    } catch (error) {
      console.error('Error loading beat metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, refresh: loadMetrics };
}
