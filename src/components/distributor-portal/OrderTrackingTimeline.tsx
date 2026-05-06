import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Send, CheckCircle, Package, Truck, MapPin, Check, XCircle, Clock, ClipboardCheck 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StatusStep {
  status: string;
  label: string;
  icon: React.ElementType;
  timestamp?: string;
  notes?: string;
  isActive: boolean;
  isCompleted: boolean;
  isCancelled?: boolean;
}

const STATUS_ORDER = [
  'draft', 'submitted', 'confirmed', 'processing', 'allocated', 'dispatched', 'in_transit', 'delivered'
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', icon: FileText },
  submitted: { label: 'Submitted', icon: Send },
  confirmed: { label: 'Confirmed', icon: CheckCircle },
  processing: { label: 'Processing', icon: Package },
  allocated: { label: 'Allocated', icon: ClipboardCheck },
  dispatched: { label: 'Dispatched', icon: Truck },
  in_transit: { label: 'In Transit', icon: MapPin },
  delivered: { label: 'Delivered', icon: Check },
  cancelled: { label: 'Cancelled', icon: XCircle },
  partially_delivered: { label: 'Partial Delivery', icon: Package },
};

interface OrderTrackingTimelineProps {
  orderId: string;
  currentStatus: string;
  history?: any[]; // Optional pre-loaded history (for parallel fetch from parent)
}

const OrderTrackingTimeline = ({ orderId, currentStatus, history: providedHistory }: OrderTrackingTimelineProps) => {
  const [history, setHistory] = useState<any[]>(providedHistory || []);
  const [loading, setLoading] = useState(!providedHistory);

  useEffect(() => {
    if (providedHistory) {
      setHistory(providedHistory);
      setLoading(false);
      return;
    }
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, providedHistory]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('primary_order_status_history')
      .select('id, status, notes, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setHistory(data || []);
    setLoading(false);
  };

  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  const steps: StatusStep[] = STATUS_ORDER.map((status, index) => {
    const config = STATUS_CONFIG[status];
    const historyEntry = history.find(h => h.status === status);
    return {
      status,
      label: config.label,
      icon: config.icon,
      timestamp: historyEntry?.created_at,
      notes: historyEntry?.notes,
      isActive: status === currentStatus,
      isCompleted: index < currentIndex && !isCancelled,
      isCancelled: false,
    };
  });

  if (isCancelled) {
    const cancelEntry = history.find(h => h.status === 'cancelled');
    steps.push({
      status: 'cancelled',
      label: 'Cancelled',
      icon: XCircle,
      timestamp: cancelEntry?.created_at,
      notes: cancelEntry?.notes,
      isActive: true,
      isCompleted: false,
      isCancelled: true,
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Order Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex items-start min-w-max">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.status} className="flex items-start flex-1 min-w-[110px]">
                  {/* Dot + label column */}
                  <div className="flex flex-col items-center text-center px-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 shrink-0",
                      step.isCancelled
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : step.isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : step.isActive
                            ? "border-primary bg-primary text-primary-foreground animate-pulse"
                            : "border-muted bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className={cn(
                      "font-medium text-xs mt-2 whitespace-nowrap",
                      step.isCompleted || step.isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {step.timestamp ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                        {format(new Date(step.timestamp), 'dd MMM, hh:mm a')}
                      </p>
                    ) : (!step.isCompleted && !step.isActive) ? (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">Pending</p>
                    ) : null}
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div className={cn(
                      "h-0.5 flex-1 mt-4 min-w-[16px]",
                      step.isCompleted ? "bg-green-500" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderTrackingTimeline;
