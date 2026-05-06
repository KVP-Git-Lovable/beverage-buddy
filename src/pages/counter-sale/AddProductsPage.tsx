import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import LineItemUomSelect, {
  type LineItemUomSelection,
} from '@/components/uom/LineItemUomSelect';
import { getPriceForUnit } from '@/lib/uomEngine';
import {
  useCounterSaleWizard,
  type CounterSaleLine,
} from '@/contexts/CounterSaleWizardContext';

interface ProductRow {
  id: string;
  name: string;
  rate: number | null;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const newLineId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

export default function AddProductsPage() {
  const navigate = useNavigate();
  const { customer, walkin, items, setItems, totalAmount } = useCounterSaleWizard();

  // Step guard: must have customer or walkin chosen.
  useEffect(() => {
    if (!customer && !walkin) {
      navigate('/counter-sale/new/customer', { replace: true });
    }
  }, [customer, walkin, navigate]);

  // ---- Product search ----
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    (async () => {
      let q = supabase
        .from('products')
        .select('id, name, rate')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(50);
      if (debounced.trim()) {
        q = q.ilike('name', `%${debounced.trim()}%`);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error('[AddProductsPage] product fetch error:', error);
        setProducts([]);
      } else {
        setProducts((data ?? []) as ProductRow[]);
      }
      setLoadingProducts(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // ---- Add product → line item ----
  const handleAddProduct = async (p: ProductRow) => {
    // Seed line with the canonical product.rate; UOM will be auto-emitted by
    // LineItemUomSelect, and handleUomChange will refine the rate via the
    // price-list-aware getPriceForUnit() lookup.
    const rate = Number(p.rate ?? 0);
    const line: CounterSaleLine = {
      lineId: newLineId(),
      product_id: p.id,
      product_name: p.name,
      quantity: 1,
      uom_id: null,
      uom_code: null,
      conversion_to_base: null,
      rate,
      line_total: rate,
    };
    setItems([...items, line]);
    setSearch('');
    toast.success(`${p.name} added`);
  };

  const recalcLine = (l: CounterSaleLine, patch: Partial<CounterSaleLine>): CounterSaleLine => {
    const merged = { ...l, ...patch };
    const qty = Number(merged.quantity) || 0;
    const rate = Number(merged.rate) || 0;
    merged.line_total = +(qty * rate).toFixed(2);
    return merged;
  };

  const updateLine = (lineId: string, patch: Partial<CounterSaleLine>) => {
    setItems(items.map((l) => (l.lineId === lineId ? recalcLine(l, patch) : l)));
  };

  const removeLine = (lineId: string) => {
    setItems(items.filter((l) => l.lineId !== lineId));
  };

  const handleUomChange = async (lineId: string, sel: LineItemUomSelection) => {
    const line = items.find((l) => l.lineId === lineId);
    // Per-UOM override wins; falls back to derived math (existing behaviour) when
    // no row exists in product_price_list. Pass the canonical product.rate so
    // the fallback path doesn't need an extra DB round-trip.
    let nextRate = line?.rate ?? 0;
    if (line?.product_id) {
      try {
        nextRate = await getPriceForUnit(line.product_id, sel.uomId, line.rate);
      } catch (err) {
        console.warn('[AddProductsPage] getPriceForUnit failed, keeping prior rate', err);
      }
    }
    updateLine(lineId, {
      uom_id: sel.uomId,
      uom_code: sel.uomCode,
      conversion_to_base: sel.conversionToBase,
      rate: Number(nextRate) || 0,
    });
  };

  const canReview = items.length > 0 && items.every((l) => l.quantity > 0);

  const showSearchResults = useMemo(
    () => debounced.trim().length > 0 || products.length > 0,
    [debounced, products.length]
  );

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 pb-32">
      {/* Customer chip */}
      <div className="text-xs text-muted-foreground">
        Selling to:{' '}
        <span className="font-medium text-foreground">
          {customer?.name ?? walkin?.walkin_name ?? '—'}
        </span>
      </div>

      {/* Product search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search and add products..."
          className="pl-9"
        />
      </div>

      {showSearchResults && (
        <Card className="p-2 max-h-64 overflow-y-auto">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No products match.
            </div>
          ) : (
            <div className="divide-y">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 py-2 px-1 hover:bg-muted/40 rounded cursor-pointer"
                  onClick={() => handleAddProduct(p)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ₹{Number(p.rate ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Cart lines */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Items ({items.length})
        </div>
        {items.length === 0 && (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            No items yet. Search and tap a product to add.
          </Card>
        )}
        {items.map((l) => (
          <Card key={l.lineId} className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{l.product_name}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeLine(l.lineId)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">Qty</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={l.quantity}
                  onChange={(e) =>
                    updateLine(l.lineId, { quantity: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">UOM</div>
                <LineItemUomSelect
                  productId={l.product_id}
                  value={l.uom_code ?? undefined}
                  onChange={(sel) => handleUomChange(l.lineId, sel)}
                  context="packing"
                  hideWhenSingle={false}
                />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">Rate (₹)</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={l.rate}
                  onChange={(e) =>
                    updateLine(l.lineId, { rate: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="text-right text-sm">
              <span className="text-muted-foreground">Line total: </span>
              <span className="font-semibold">₹{l.line_total.toFixed(2)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Sticky footer with total + Review CTA */}
      <div className="fixed left-0 right-0 bottom-0 bg-background border-t p-3 max-w-screen-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold">₹{totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            className="flex-1"
            disabled={!canReview}
            onClick={() => navigate('/counter-sale/new/review')}
          >
            Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
