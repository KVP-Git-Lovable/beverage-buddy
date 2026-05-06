import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Package,
  Calendar,
  Truck,
  Clock,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PAGE_SIZE = 50;
const FETCH_TIMEOUT_MS = 8000;

interface PrimaryOrderRow {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
}

const PrimaryOrdersList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PrimaryOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isMountedRef = useRef(true);
  const distributorId = localStorage.getItem('distributor_id');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPage = useCallback(
    async (from: number) => {
      if (!distributorId) throw new Error('Missing distributor');

      // Race the supabase call against a hard timeout so the page never hangs forever.
      const query = supabase
        .from('primary_orders')
        .select('id, order_number, order_date, expected_delivery_date, status, total_amount, created_at')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      const result = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please retry.')), FETCH_TIMEOUT_MS),
        ),
      ]);

      if ((result as any).error) throw (result as any).error;
      return ((result as any).data || []) as PrimaryOrderRow[];
    },
    [distributorId],
  );

  const loadOrders = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(0);
      if (!isMountedRef.current) return;
      setOrders(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      console.error('[PrimaryOrdersList] load error', e);
      if (!isMountedRef.current) return;
      setError(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(orders.length);
      if (!isMountedRef.current) return;
      setOrders((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      console.error('[PrimaryOrdersList] loadMore error', e);
      toast.error(e?.message || 'Failed to load more orders');
    } finally {
      if (isMountedRef.current) setLoadingMore(false);
    }
  }, [fetchPage, orders.length, hasMore, loadingMore]);

  useEffect(() => {
    if (!distributorId) {
      navigate('/distributor-portal/login');
      return;
    }
    loadOrders();
  }, [distributorId, navigate, loadOrders]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      submitted: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-indigo-100 text-indigo-700',
      processing: 'bg-yellow-100 text-yellow-700',
      allocated: 'bg-cyan-100 text-cyan-700',
      dispatched: 'bg-purple-100 text-purple-700',
      in_transit: 'bg-orange-100 text-orange-700',
      delivered: 'bg-green-100 text-green-700',
      partially_delivered: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    if (['draft', 'submitted'].includes(status)) return <Clock className="w-4 h-4" />;
    if (['confirmed', 'processing', 'allocated'].includes(status)) return <Package className="w-4 h-4" />;
    if (['dispatched', 'in_transit'].includes(status)) return <Truck className="w-4 h-4" />;
    return <Package className="w-4 h-4" />;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Primary Orders</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading orders…' : `${orders.length}${hasMore ? '+' : ''} orders`}
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => navigate('/distributor-portal/create-primary-order')} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="allocated">Allocated</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
            <h3 className="font-medium text-foreground">Couldn't load orders</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadOrders} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-2">No orders found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first primary order'}
            </p>
            <Button onClick={() => navigate('/distributor-portal/create-primary-order')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/distributor-portal/primary-order/${order.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(order.status)}`}
                    >
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{order.order_number}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(order.order_date), 'dd MMM yyyy')}</span>
                      </div>
                      {order.expected_delivery_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span>
                            Expected: {format(new Date(order.expected_delivery_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-lg font-semibold text-foreground">
                      ₹{order.total_amount?.toLocaleString('en-IN') || '0'}
                    </p>
                    {['dispatched', 'in_transit'].includes(order.status) && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/distributor-portal/goods-receipt/${order.id}`);
                        }}
                      >
                        <ClipboardCheck className="w-3 h-3 mr-1" />
                        Create GRN
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button onClick={loadMore} variant="outline" disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>Load more</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrimaryOrdersList;
