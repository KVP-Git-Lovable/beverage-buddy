import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  ShoppingBag,
  Store,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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

export const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { fetchEventById, markEventCompleted, updateEventNotes } =
    useActivityEvents();

  const [event, setEvent] = useState<ActivityEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const { orders, totalCount, totalValue, isLoading } = useEventOrders(eventId);

  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    setLoadingEvent(true);
    fetchEventById(eventId).then((data) => {
      if (!alive) return;
      setEvent(data);
      setLoadingEvent(false);
    });
    return () => {
      alive = false;
    };
  }, [eventId, fetchEventById]);

  const isCompleted = event?.status === 'completed';

  const handleAddOrder = () => {
    if (!event || !eventId) return;
    const params = new URLSearchParams();
    params.set('event_id', eventId);
    if (event.visit_id) params.set('visitId', event.visit_id);
    if (event.retailer_id) params.set('retailerId', event.retailer_id);
    if (event.retailer_name)
      params.set('retailer', event.retailer_name);
    navigate(`/order-entry?${params.toString()}`);
  };

  const handleMarkCompleted = async () => {
    if (!eventId) return;
    setCompleting(true);
    const ok = await markEventCompleted(eventId);
    setCompleting(false);
    if (ok) {
      toast.success('Event marked as completed');
      setEvent((prev) =>
        prev ? { ...prev, status: 'completed' } : prev,
      );
    } else {
      toast.error('Failed to mark event as completed');
    }
  };

  const handleOpenNotes = () => {
    setNotesDraft(event?.remarks || '');
    setNotesOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!eventId) return;
    setSavingNotes(true);
    const ok = await updateEventNotes(eventId, notesDraft.trim());
    setSavingNotes(false);
    if (ok) {
      toast.success('Notes saved');
      setEvent((prev) =>
        prev ? { ...prev, remarks: notesDraft.trim() } : prev,
      );
      setNotesOpen(false);
    } else {
      toast.error('Failed to save notes');
    }
  };

  if (loadingEvent) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="px-4 py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Event not found.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </Layout>
    );
  }

  const dateLabel = (() => {
    try {
      return new Date(event.activity_date + 'T00:00:00').toLocaleDateString(
        [],
        { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
      );
    } catch {
      return event.activity_date;
    }
  })();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
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
          <h1 className="text-base font-semibold flex-1 truncate">
            {event.activity_name || event.activity_type}
          </h1>
          <Badge
            className={
              isCompleted
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0'
            }
          >
            {isCompleted ? 'Completed' : 'Active'}
          </Badge>
        </div>

        {/* Event Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Event Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{dateLabel}</span>
              <span className="text-xs">
                · {formatActivityDuration(event)}
              </span>
            </div>
            {(event.location || event.retailer_name) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">
                  {event.location || event.retailer_name}
                </span>
              </div>
            )}
            {event.remarks && (
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-xs whitespace-pre-wrap">
                  {event.remarks}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Orders
              </div>
              <div className="text-2xl font-semibold font-mono mt-1">
                {totalCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Value
              </div>
              <div className="text-2xl font-semibold font-mono mt-1 text-emerald-700 dark:text-emerald-300">
                {fmtINR(totalValue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAddOrder}
            disabled={isCompleted}
            className="flex-1 min-w-[140px] gap-1"
          >
            <Plus className="h-4 w-4" /> Add Order
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenNotes}
            className="flex-1 min-w-[140px] gap-1"
          >
            <StickyNote className="h-4 w-4" /> Add Notes
          </Button>
        </div>

        {/* Orders list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders ({totalCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No orders yet. Tap "Add Order" to capture business from this
                event.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {o.retailer_name || 'Walk-in / Unknown'}
                      </div>
                      {o.status && o.status !== 'confirmed' && (
                        <Badge
                          variant="outline"
                          className="mt-0.5 text-[10px] h-4"
                        >
                          {o.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold shrink-0">
                    {fmtINR(Number(o.total_amount) || 0)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mark Completed */}
        {!isCompleted && (
          <Button
            variant="outline"
            className="w-full gap-1 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            onClick={handleMarkCompleted}
            disabled={completing}
          >
            {completing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Mark as Completed
          </Button>
        )}
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Capture observations, follow-ups, attendees, outcomes…"
            rows={6}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesOpen(false)}
              disabled={savingNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EventDetail;
