import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingBag,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import {
  useActivityEvents,
  ActivityEvent,
  formatActivityDuration,
} from '@/hooks/useActivityEvents';
import { useEventOrders } from '@/hooks/useEventOrders';

const fmtINR = (n: number) =>
  '₹ ' +
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );

interface OrderItemRow {
  order_id: string;
  product_name: string | null;
  quantity: number;
  unit: string | null;
  total: number;
}

const EventSummary = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { fetchEventById } = useActivityEvents();

  const [event, setEvent] = useState<ActivityEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const { orders, totalCount, totalValue, isLoading } = useEventOrders(eventId);

  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    setLoadingEvent(true);
    fetchEventById(eventId)
      .then((data) => {
        if (alive) setEvent(data);
      })
      .finally(() => {
        if (alive) setLoadingEvent(false);
      });
    return () => {
      alive = false;
    };
  }, [eventId, fetchEventById]);

  // Fetch order items for breakdown
  useEffect(() => {
    const liveOrderIds = orders
      .filter((o) => o.status !== 'cancelled')
      .map((o) => o.id);
    if (liveOrderIds.length === 0) {
      setItems([]);
      return;
    }
    let alive = true;
    setLoadingItems(true);
    supabase
      .from('order_items')
      .select('order_id, product_name, quantity, unit, total')
      .in('order_id', liveOrderIds)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error('[EventSummary] order_items error:', error);
          setItems([]);
        } else {
          setItems((data || []) as OrderItemRow[]);
        }
        setLoadingItems(false);
      });
    return () => {
      alive = false;
    };
  }, [orders]);

  // Unique customers covered
  const customersCovered = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      if (o.retailer_name) set.add(o.retailer_name.trim().toLowerCase());
    }
    return set.size;
  }, [orders]);

  // Aggregate breakdown by product
  const productBreakdown = useMemo(() => {
    const agg = new Map<
      string,
      { name: string; qty: number; unit: string | null; total: number }
    >();
    for (const it of items) {
      const key = (it.product_name || 'Unknown').trim();
      const existing = agg.get(key);
      if (existing) {
        existing.qty += Number(it.quantity) || 0;
        existing.total += Number(it.total) || 0;
      } else {
        agg.set(key, {
          name: key,
          qty: Number(it.quantity) || 0,
          unit: it.unit,
          total: Number(it.total) || 0,
        });
      }
    }
    return Array.from(agg.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  if (loadingEvent) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-muted-foreground">Event not found.</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  const isCompleted = event.status === 'completed';
  const liveOrders = orders.filter((o) => o.status !== 'cancelled');
  const avgOrderValue = totalCount > 0 ? totalValue / totalCount : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold flex-1 truncate">
              Event Summary
            </h1>
            {isCompleted ? (
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
          </div>

          {/* Event info */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {event.activity_name || 'Event'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{formatActivityDuration(event)}</span>
              </div>
              {(event.location || event.retailer_name) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">
                    {event.location || event.retailer_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-card">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Total Revenue
                </div>
                <div className="text-base font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                  {fmtINR(totalValue)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <ShoppingBag className="h-3 w-3" /> Total Orders
                </div>
                <div className="text-base font-semibold text-sky-700 dark:text-sky-300 font-mono">
                  {totalCount}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3 w-3" /> Customers
                </div>
                <div className="text-base font-semibold text-violet-700 dark:text-violet-300 font-mono">
                  {customersCovered}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-3 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Avg Order Value
                </div>
                <div className="text-base font-semibold text-amber-700 dark:text-amber-300 font-mono">
                  {fmtINR(avgOrderValue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order breakdown by product */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Order Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading || loadingItems ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              ) : productBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No products ordered yet.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-2">
                    <div className="col-span-6">Product</div>
                    <div className="col-span-3 text-right">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                  </div>
                  {productBreakdown.map((p, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center text-xs px-2 py-2 rounded bg-muted/40"
                    >
                      <div className="col-span-6 truncate font-medium">
                        {p.name}
                      </div>
                      <div className="col-span-3 text-right font-mono text-muted-foreground">
                        {p.qty} {p.unit || ''}
                      </div>
                      <div className="col-span-3 text-right font-mono font-semibold">
                        {fmtINR(p.total)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Customers list */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Customers Covered ({customersCovered})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liveOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No customers yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set(
                      liveOrders
                        .map((o) => o.retailer_name?.trim())
                        .filter(Boolean) as string[],
                    ),
                  ).map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 pb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/visits/event/${eventId}`)}
            >
              Open Event
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventSummary;
