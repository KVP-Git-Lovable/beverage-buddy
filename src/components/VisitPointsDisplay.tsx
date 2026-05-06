import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface VisitPointsDisplayProps {
  visitId: string | null;
  userId: string;
  selectedDate?: string;
}

export function VisitPointsDisplay({ visitId, userId, selectedDate }: VisitPointsDisplayProps) {
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visitId || !userId || !selectedDate) {
      setLoading(false);
      return;
    }

    const fetchPoints = async () => {
      try {
        setLoading(true);
        
        // First get the visit to find the retailer_id
        const { data: visitData, error: visitError } = await supabase
          .from('visits')
          .select('retailer_id, planned_date')
          .eq('id', visitId)
          .single();

        if (visitError) throw visitError;
        if (!visitData?.retailer_id) {
          setPoints(0);
          return;
        }

        // Points are stored with reference_type='order' and reference_id=retailer_id
        // Filter by date to get only points for this specific visit date
        const dateStart = new Date(visitData.planned_date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(visitData.planned_date);
        dateEnd.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('gamification_points')
          .select('points')
          .eq('user_id', userId)
          .eq('reference_type', 'order')
          .eq('reference_id', visitData.retailer_id)
          .gte('earned_at', dateStart.toISOString())
          .lte('earned_at', dateEnd.toISOString());

        if (error) throw error;

        const totalPoints = data?.reduce((sum, item) => sum + item.points, 0) || 0;
        setPoints(totalPoints);
      } catch (error) {
        console.error('Error fetching visit points:', error);
        setPoints(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, [visitId, userId, selectedDate]);

  if (loading || points === 0) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-600 border-amber-500/20 hover:from-amber-500/20 hover:to-yellow-500/20"
    >
      <TrendingUp className="w-3 h-3 mr-1" />
      +{points} pts
    </Badge>
  );
}
