import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageSquare,
  Loader2,
  LogIn,
  LogOut,
  Eye,
  ShoppingBag,
  CheckCircle2,
  Hourglass,
  User,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import { useActivityEvents, ActivityEvent, formatActivityDuration } from '@/hooks/useActivityEvents';
import { useEventOrders } from '@/hooks/useEventOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLocalTodayDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

interface ActivityEventsTableProps {
  userId: string;
  selectedDate: string;
  onActivitiesLoaded?: (count: number) => void;
}

interface VisitStatus {
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
}

interface CounterSaleSummary {
  id: string;
  visit_id: string;
  customer_name: string | null; // null => walk-in or unknown
  walkin_name: string | null;
  total_amount: number;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_amount: number;
  item_count: number;
  items: Array<{
    product_name: string;
    quantity: number;
    uom_code: string | null;
    rate: number;
    line_total: number;
  }>;
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  Celebration: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Event: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Promotion: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Demo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Counter Sale': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Other: 'bg-muted text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Local-only "in-progress sale" detector — reads the wizard's sessionStorage
// blob written by CounterSaleWizardContext.
// ---------------------------------------------------------------------------
const WIZARD_STORAGE_KEY = 'counter-sale-wizard-v1';

interface InProgressDraft {
  customerName: string;
  itemCount: number;
  total: number;
  isWalkin: boolean;
}

function readInProgressDraft(): InProgressDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hasCustomer = !!parsed?.customer || !!parsed?.walkin;
    if (!hasCustomer) return null;
    const items: any[] = parsed?.items ?? [];
    const total = items.reduce((s, l) => s + (Number(l?.line_total) || 0), 0);
    return {
      customerName:
        parsed.customer?.name || parsed.walkin?.walkin_name || 'Walk-in Customer',
      itemCount: items.length,
      total,
      isWalkin: !parsed.customer && !!parsed.walkin,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const fmtINR = (n: number) =>
  '₹ ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Stable color for an avatar based on name
const avatarBg = (name: string): string => {
  const palette = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};

const formatTimeShort = (isoOrTime: string): string => {
  try {
    const d = isoOrTime.includes('T') ? new Date(isoOrTime) : new Date(`1970-01-01T${isoOrTime}`);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoOrTime;
  }
};

// ===========================================================================
// Counter Sale card
// ===========================================================================
const CounterSaleCard: React.FC<{
  activity: ActivityEvent;
  summary: CounterSaleSummary | null;
  loading: boolean;
}> = ({ activity, summary, loading }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const isCompleted = !!summary && summary.item_count > 0;
  const isDraft = !loading && (!summary || summary.item_count === 0);

  const customerName = summary?.customer_name || summary?.walkin_name || 'Walk-in Customer';
  const isWalkin = !summary?.customer_name;

  const timeLabel = useMemo(() => {
    const ts = activity.start_time || activity.created_at;
    return formatTimeShort(ts);
  }, [activity.start_time, activity.created_at]);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 bg-card transition-colors',
        isCompleted
          ? 'border-emerald-200/60 dark:border-emerald-800/40'
          : 'border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10',
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm',
            isWalkin
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : avatarBg(customerName),
          )}
          aria-hidden="true"
        >
          {isWalkin ? <User className="h-5 w-5" /> : initialsFromName(customerName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{customerName}</h4>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {loading ? (
                  <Badge variant="outline" className="text-[10px] gap-1 h-5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading
                  </Badge>
                ) : isCompleted ? (
                  <Badge className="text-[10px] gap-1 h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </Badge>
                ) : (
                  <Badge className="text-[10px] gap-1 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                    <Hourglass className="h-3 w-3" /> No products added
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {timeLabel}
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" /> Counter Sale
                </span>
              </div>
            </div>

            <Badge className={cn('text-[10px] px-2 py-0.5 shrink-0', ACTIVITY_TYPE_COLORS['Counter Sale'])}>
              Counter Sale
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="flex-1 min-w-[120px] rounded-md border border-border/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
            {isCompleted ? fmtINR(summary!.total_amount) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Amount
          </div>
        </div>
        <div className="flex-1 min-w-[80px] rounded-md border border-border/60 bg-sky-50/60 dark:bg-sky-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-sky-700 dark:text-sky-300 font-mono">
            {summary?.item_count ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</div>
        </div>

        <div className="flex items-center">
          {isDraft ? (
            <Button
              size="sm"
              className="h-8 gap-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => navigate('/counter-sale/new/products')}
            >
              <Play className="h-3.5 w-3.5" /> Continue Sale
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setExpanded((e) => !e)}
            >
              <Eye className="h-3.5 w-3.5" />
              View Details
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {expanded && summary && (
        <div className="border-t border-border/60 pt-2 mt-1 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Items ({summary.item_count})
          </div>
          <div className="space-y-1">
            {summary.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded bg-muted/40"
              >
                <span className="truncate flex-1">{it.product_name}</span>
                <span className="font-mono text-muted-foreground shrink-0">
                  {it.quantity} {it.uom_code || ''}
                </span>
                <span className="font-mono font-medium shrink-0 w-20 text-right">
                  {fmtINR(it.line_total)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{fmtINR(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST (2.5%)</span>
              <span className="font-mono">{fmtINR(summary.cgst_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST (2.5%)</span>
              <span className="font-mono">{fmtINR(summary.sgst_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
              <span>Total</span>
              <span className="font-mono">{fmtINR(summary.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Local-only in-progress draft tile (sessionStorage)
// ===========================================================================
const LocalDraftCard: React.FC<{ draft: InProgressDraft }> = ({ draft }) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/10 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm',
            draft.isWalkin
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : avatarBg(draft.customerName),
          )}
        >
          {draft.isWalkin ? <User className="h-5 w-5" /> : initialsFromName(draft.customerName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm truncate">{draft.customerName}</h4>
              <Badge className="mt-0.5 text-[10px] gap-1 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                <Hourglass className="h-3 w-3" /> In Progress
              </Badge>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" /> Counter Sale
                </span>
              </div>
            </div>
            <Badge className={cn('text-[10px] px-2 py-0.5 shrink-0', ACTIVITY_TYPE_COLORS['Counter Sale'])}>
              Counter Sale
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="flex-1 min-w-[120px] rounded-md border border-border/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
            {draft.itemCount > 0 ? fmtINR(draft.total) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Amount
          </div>
        </div>
        <div className="flex-1 min-w-[80px] rounded-md border border-border/60 bg-sky-50/60 dark:bg-sky-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-sky-700 dark:text-sky-300 font-mono">
            {draft.itemCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</div>
        </div>
        <div className="flex items-center">
          <Button
            size="sm"
            className="h-8 gap-1 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() =>
              navigate(
                draft.itemCount === 0
                  ? '/counter-sale/new/products'
                  : '/counter-sale/new/review',
              )
            }
          >
            <Play className="h-3.5 w-3.5" /> Continue Sale
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// Event card — styled to match Counter Sale card
// ===========================================================================
const EventCard: React.FC<{ activity: ActivityEvent }> = ({ activity }) => {
  const navigate = useNavigate();
  const { totalCount, totalValue } = useEventOrders(activity.id);
  const isCompleted = activity.status === 'completed';

  const eventName = activity.activity_name || 'Event';
  const timeLabel = useMemo(() => {
    const ts = activity.start_time || activity.created_at;
    return ts ? formatTimeShort(ts) : formatActivityDuration(activity);
  }, [activity]);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 bg-card transition-colors',
        isCompleted
          ? 'border-emerald-200/60 dark:border-emerald-800/40'
          : 'border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10',
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm',
            avatarBg(eventName),
          )}
          aria-hidden="true"
        >
          {initialsFromName(eventName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{eventName}</h4>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {isCompleted ? (
                  <Badge className="text-[10px] gap-1 h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </Badge>
                ) : (
                  <Badge className="text-[10px] gap-1 h-5 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border-0">
                    <Hourglass className="h-3 w-3" /> Active
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeLabel}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Event
                </span>
                {(activity.location || activity.retailer_name) && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{activity.location || activity.retailer_name}</span>
                  </span>
                )}
              </div>
            </div>

            <Badge className={cn('text-[10px] px-2 py-0.5 shrink-0', ACTIVITY_TYPE_COLORS.Event)}>
              Event
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="flex-1 min-w-[120px] rounded-md border border-border/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
            {fmtINR(totalValue)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Revenue
          </div>
        </div>
        <div className="flex-1 min-w-[80px] rounded-md border border-border/60 bg-sky-50/60 dark:bg-sky-950/20 px-3 py-2">
          <div className="text-sm font-semibold text-sky-700 dark:text-sky-300 font-mono">
            {totalCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate(`/visits/event/${activity.id}`)}
          >
            <Play className="h-3.5 w-3.5" />
            Open Event
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => navigate(`/visits/event/${activity.id}/summary`)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Summary
          </Button>
        </div>
      </div>
    </div>
  );
};

const GenericActivityCard: React.FC<{
  activity: ActivityEvent;
  visitStatus: VisitStatus | null;
  isToday: boolean;
  actionLoading: string | null;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
}> = ({ activity, visitStatus, isToday, actionLoading, onCheckIn, onCheckOut }) => {
  const isCheckedIn = !!visitStatus?.check_in_time;
  const isCheckedOut = !!visitStatus?.check_out_time;

  return (
    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm leading-tight">
          {activity.activity_name || activity.activity_type}
        </h4>
        <Badge
          className={cn(
            'text-[10px] px-2 py-0.5 shrink-0',
            ACTIVITY_TYPE_COLORS[activity.activity_type] || ACTIVITY_TYPE_COLORS.Other,
          )}
        >
          {activity.activity_type}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatActivityDuration(activity)}
        </span>
        {activity.retailer_name && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {activity.retailer_name}
          </span>
        )}
      </div>

      {activity.remarks && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-background/60 rounded px-2 py-1.5">
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{activity.remarks}</span>
        </div>
      )}

      {activity.visit_id && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {isToday && !isCheckedIn && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onCheckIn(activity.visit_id!)}
              disabled={actionLoading === activity.visit_id + '-in'}
            >
              {actionLoading === activity.visit_id + '-in' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogIn className="h-3 w-3" />
              )}
              Check In
            </Button>
          )}
          {isToday && isCheckedIn && !isCheckedOut && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onCheckOut(activity.visit_id!)}
              disabled={actionLoading === activity.visit_id + '-out'}
            >
              {actionLoading === activity.visit_id + '-out' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              Check Out
            </Button>
          )}
          {isCheckedIn && (
            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
              <LogIn className="h-3 w-3" /> In: {formatTimeShort(visitStatus!.check_in_time!)}
            </span>
          )}
          {isCheckedOut && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Out: {formatTimeShort(visitStatus!.check_out_time!)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Main component
// ===========================================================================
export const ActivityEventsTable = ({
  userId,
  selectedDate,
  onActivitiesLoaded,
}: ActivityEventsTableProps) => {
  const { fetchActivitiesForDate } = useActivityEvents();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [visitStatuses, setVisitStatuses] = useState<Record<string, VisitStatus>>({});
  const [counterSales, setCounterSales] = useState<Record<string, CounterSaleSummary>>({});
  const [csLoadingForVisits, setCsLoadingForVisits] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [localDraft, setLocalDraft] = useState<InProgressDraft | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('activitiesEventsCollapsed') === '1';
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'counter' | 'event'>('all');

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('activitiesEventsCollapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  const isToday = selectedDate === getLocalTodayDate();

  const onActivitiesLoadedRef = useRef(onActivitiesLoaded);
  onActivitiesLoadedRef.current = onActivitiesLoaded;

  const loadCounterSales = useCallback(async (visitIds: string[]) => {
    if (visitIds.length === 0) return;
    setCsLoadingForVisits(new Set(visitIds));

    const { data: sales, error } = await supabase
      .from('counter_sales' as any)
      .select(
        'id, visit_id, pos_customer_id, walkin_name, total_amount, subtotal, cgst_amount, sgst_amount, tax_amount',
      )
      .in('visit_id', visitIds);

    if (error) {
      console.error('[ActivityEventsTable] counter_sales fetch error:', error);
      setCsLoadingForVisits(new Set());
      return;
    }

    const saleRows = (sales || []) as any[];
    const saleIds = saleRows.map((s) => s.id);
    const customerIds = saleRows.map((s) => s.pos_customer_id).filter(Boolean);

    const [{ data: customers }, { data: items }] = await Promise.all([
      customerIds.length
        ? supabase.from('pos_customers' as any).select('id, name').in('id', customerIds)
        : Promise.resolve({ data: [] as any[] }),
      saleIds.length
        ? supabase
            .from('counter_sale_items' as any)
            .select('counter_sale_id, product_name, quantity, uom_code, rate, line_total')
            .in('counter_sale_id', saleIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const customerNameMap = new Map(((customers as any[]) || []).map((c) => [c.id, c.name]));
    const itemsByOrder = new Map<string, any[]>();
    for (const it of (items as any[]) || []) {
      const arr = itemsByOrder.get(it.counter_sale_id) || [];
      arr.push(it);
      itemsByOrder.set(it.counter_sale_id, arr);
    }

    const summaryMap: Record<string, CounterSaleSummary> = {};
    for (const s of saleRows) {
      const orderItems = itemsByOrder.get(s.id) || [];
      summaryMap[s.visit_id] = {
        id: s.id,
        visit_id: s.visit_id,
        customer_name: s.pos_customer_id ? customerNameMap.get(s.pos_customer_id) || null : null,
        walkin_name: s.walkin_name,
        total_amount: Number(s.total_amount) || 0,
        subtotal: Number(s.subtotal) || 0,
        cgst_amount: Number(s.cgst_amount) || 0,
        sgst_amount: Number(s.sgst_amount) || 0,
        tax_amount: Number(s.tax_amount) || 0,
        item_count: orderItems.length,
        items: orderItems.map((i) => ({
          product_name: i.product_name,
          quantity: Number(i.quantity) || 0,
          uom_code: i.uom_code,
          rate: Number(i.rate) || 0,
          line_total: Number(i.line_total) || 0,
        })),
      };
    }
    setCounterSales((prev) => ({ ...prev, ...summaryMap }));
    setCsLoadingForVisits(new Set());
  }, []);

  const loadActivities = useCallback(async () => {
    if (!userId || !selectedDate) return;
    if (!hasLoadedOnce && activities.length === 0) setIsLoading(true);
    try {
      const data = await fetchActivitiesForDate(userId, selectedDate);
      setActivities(data);
      onActivitiesLoadedRef.current?.(data.length);

      const visitIds = data.map((a) => a.visit_id).filter(Boolean);
      if (visitIds.length > 0) {
        const { data: visits } = await supabase
          .from('visits')
          .select('id, check_in_time, check_out_time, status')
          .in('id', visitIds);
        if (visits) {
          const map: Record<string, VisitStatus> = {};
          visits.forEach((v) => {
            map[v.id] = {
              check_in_time: v.check_in_time,
              check_out_time: v.check_out_time,
              status: v.status,
            };
          });
          setVisitStatuses(map);
        }
      }

      const csVisitIds = data
        .filter((a) => a.activity_type === 'Counter Sale' && a.visit_id)
        .map((a) => a.visit_id!);
      if (csVisitIds.length > 0) void loadCounterSales(csVisitIds);
    } catch (err) {
      console.error('[ActivityEventsTable] Failed to load activities:', err);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [userId, selectedDate, fetchActivitiesForDate, hasLoadedOnce, activities.length, loadCounterSales]);

  const refreshLocalDraft = useCallback(() => {
    setLocalDraft(isToday ? readInProgressDraft() : null);
  }, [isToday]);

  useEffect(() => {
    loadActivities();
    refreshLocalDraft();
  }, [userId, selectedDate]);

  useEffect(() => {
    const handler = () => {
      loadActivities();
      refreshLocalDraft();
    };
    window.addEventListener('visitDataChanged', handler);
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('visitDataChanged', handler);
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, [loadActivities, refreshLocalDraft]);

  const handleCheckIn = async (visitId: string) => {
    setActionLoading(visitId + '-in');
    try {
      const { error } = await supabase
        .from('visits')
        .update({ check_in_time: new Date().toISOString(), status: 'in-progress' } as any)
        .eq('id', visitId);
      if (error) throw error;
      toast.success('Checked in successfully');
      window.dispatchEvent(new CustomEvent('visitDataChanged'));
      await loadActivities();
    } catch (err) {
      console.error('[ActivityEventsTable] Check-in failed:', err);
      toast.error('Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    setActionLoading(visitId + '-out');
    try {
      const { error } = await supabase
        .from('visits')
        .update({ check_out_time: new Date().toISOString(), status: 'productive' } as any)
        .eq('id', visitId);
      if (error) throw error;
      toast.success('Checked out successfully');
      window.dispatchEvent(new CustomEvent('visitDataChanged'));
      await loadActivities();
    } catch (err) {
      console.error('[ActivityEventsTable] Check-out failed:', err);
      toast.error('Check-out failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (!hasLoadedOnce || (isLoading && activities.length === 0)) return null;
  if (activities.length === 0 && !localDraft) return null;

  const totalCount = activities.length + (localDraft ? 1 : 0);

  return (
    <Card className="shadow-card border-amber-200/50 dark:border-amber-800/30">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-amber-600" />
          <span>Activities & Events</span>
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs ml-auto"
          >
            {totalCount}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Show activities & events' : 'Hide activities & events'}
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Show
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Hide
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {!collapsed && (() => {
        const counterActivities = activities.filter((a) => a.activity_type === 'Counter Sale');
        const eventActivities = activities.filter((a) => a.activity_type === 'Event');
        const otherActivities = activities.filter(
          (a) => a.activity_type !== 'Counter Sale' && a.activity_type !== 'Event',
        );

        const renderActivity = (activity: ActivityEvent) => {
          const visitStatus = activity.visit_id ? visitStatuses[activity.visit_id] : null;
          if (activity.activity_type === 'Counter Sale') {
            const summary = activity.visit_id ? counterSales[activity.visit_id] || null : null;
            const loading = activity.visit_id ? csLoadingForVisits.has(activity.visit_id) : false;
            return (
              <CounterSaleCard
                key={activity.id}
                activity={activity}
                summary={summary}
                loading={loading}
              />
            );
          }
          if (activity.activity_type === 'Event') {
            return <EventCard key={activity.id} activity={activity} />;
          }
          return (
            <GenericActivityCard
              key={activity.id}
              activity={activity}
              visitStatus={visitStatus}
              isToday={isToday}
              actionLoading={actionLoading}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          );
        };

        const chip = (
          key: 'all' | 'counter' | 'event',
          label: string,
          count: number,
        ) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
              activeFilter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                activeFilter === key
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {count}
            </span>
          </button>
        );

        const groupHeader = (label: string, count: number) => (
          <div className="flex items-center gap-2 pt-1 pb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground">({count})</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
        );

        return (
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {chip('all', 'All', activities.length + (localDraft ? 1 : 0))}
              {chip('counter', 'Counter Sales', counterActivities.length + (localDraft ? 1 : 0))}
              {chip('event', 'Events', eventActivities.length)}
            </div>

            {activeFilter === 'all' && (
              <>
                {(counterActivities.length > 0 || localDraft) && (
                  <>
                    {groupHeader('Counter Sales', counterActivities.length + (localDraft ? 1 : 0))}
                    {localDraft && <LocalDraftCard draft={localDraft} />}
                    {counterActivities.map(renderActivity)}
                  </>
                )}
                {eventActivities.length > 0 && (
                  <>
                    {groupHeader('Events', eventActivities.length)}
                    {eventActivities.map(renderActivity)}
                  </>
                )}
                {otherActivities.length > 0 && (
                  <>
                    {groupHeader('Other', otherActivities.length)}
                    {otherActivities.map(renderActivity)}
                  </>
                )}
              </>
            )}

            {activeFilter === 'counter' && (
              <>
                {localDraft && <LocalDraftCard draft={localDraft} />}
                {counterActivities.length === 0 && !localDraft ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No counter sales for this date.
                  </div>
                ) : (
                  counterActivities.map(renderActivity)
                )}
              </>
            )}

            {activeFilter === 'event' && (
              <>
                {eventActivities.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No events for this date.
                  </div>
                ) : (
                  eventActivities.map(renderActivity)
                )}
              </>
            )}
          </CardContent>
        );
      })()}
    </Card>
  );
};
