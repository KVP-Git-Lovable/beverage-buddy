import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UserCheck, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCounterSaleWizard, type SelectedCustomer } from '@/contexts/CounterSaleWizardContext';

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CustomerSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCustomer, setWalkin } = useCounterSaleWizard();

  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const [results, setResults] = useState<SelectedCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Build query: list latest 50 by default; filter by name/phone when typing.
      let q = supabase
        .from('pos_customers' as any)
        .select('id, name, phone, area, city')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (debounced.trim()) {
        const term = debounced.trim();
        // Search across name + phone (ilike works on text).
        q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error('[CustomerSelectionPage] search error:', error);
        setResults([]);
      } else {
        setResults((data ?? []) as unknown as SelectedCustomer[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, user?.id]);

  const handlePick = (c: SelectedCustomer) => {
    setCustomer(c);
    navigate('/counter-sale/new/products');
  };

  const handleWalkin = () => {
    setWalkin(null); // clear, navigate to walkin details capture
    navigate('/counter-sale/new/walkin');
  };

  const noResults = useMemo(
    () => !loading && debounced.trim().length > 0 && results.length === 0,
    [loading, debounced, results.length]
  );

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 pb-24">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone..."
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Searching...
        </div>
      )}

      {/* Empty (no search yet) */}
      {!loading && !debounced.trim() && results.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          No customers yet. Create one or continue as walk-in.
        </Card>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((c) => (
            <Card
              key={c.id}
              className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => handlePick(c)}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[c.phone, c.area, c.city].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}

      {/* No-match CTA */}
      {noResults && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          No matches for "{debounced}".
        </Card>
      )}

      {/* Sticky footer actions */}
      <div className="fixed left-0 right-0 bottom-0 bg-background border-t p-3 flex flex-col gap-2 max-w-screen-md mx-auto">
        <Button
          variant="default"
          onClick={() => navigate('/counter-sale/new/customer/new')}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create New Customer
        </Button>
        <Button variant="outline" onClick={handleWalkin}>
          Continue as Walk-in
        </Button>
      </div>
    </div>
  );
}
