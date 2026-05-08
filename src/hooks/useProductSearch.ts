import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side product search for the Order Entry dropdown.
 *
 * The backing RPC `search_products_for_order` filters/limits before joining
 * UOM and variant data, so it returns in <500ms even for the full catalog.
 * We therefore call it on every (debounced) keystroke without an LRU cache
 * and without merging stale offline rows. IndexedDB is used only as a true
 * offline fallback (navigator.onLine === false).
 */

export interface ProductSearchVariant {
  id: string;
  variant_name: string;
  sku: string;
  price: number;
  is_active?: boolean;
  is_focused_product?: boolean;
}

export interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  rate: number;
  unit: string;
  closing_stock: number | null;
  is_active: boolean | null;
  category_name: string | null;
  is_focused_product: boolean | null;
  default_uom_code?: string | null;
  allowed_uom_codes?: string[] | null;
  variants: ProductSearchVariant[];
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 40;

/**
 * Map UI category to RPC param. The RPC treats '', NULL, and 'all' (any case)
 * as "no filter", so '' is the safe canonical value.
 */
function rpcCategory(category: string | null | undefined): string {
  const v = (category || '').trim();
  if (!v || v.toLowerCase() === 'all') return '';
  return v;
}

/**
 * Warm the empty-query result so the first popover open is instant.
 * Safe to call multiple times — short-circuits when offline.
 */
export async function prefetchInitialProductSearch(category: string = '') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await supabase.rpc('search_products_for_order', {
      p_query: '',
      p_category: rpcCategory(category),
      p_limit: PAGE_SIZE,
    });
  } catch {
    /* ignore — will fetch on first open */
  }
}

function offlineFilter(
  products: any[],
  term: string,
  category: string,
): ProductSearchResult[] {
  const t = term.toLowerCase();
  const cat = rpcCategory(category).toLowerCase();
  const filtered = products
    .filter((p) => p.is_active !== false)
    .filter((p) => !cat || (p?.category?.name || '').toLowerCase() === cat)
    .filter((p) => {
      if (!t) return true;
      if (p.name?.toLowerCase().includes(t)) return true;
      if (p.sku?.toLowerCase().includes(t)) return true;
      if (Array.isArray(p.variants)) {
        return p.variants.some(
          (v: any) =>
            v.is_active !== false &&
            (v.variant_name?.toLowerCase().includes(t) ||
              v.sku?.toLowerCase().includes(t)),
        );
      }
      return false;
    })
    .slice(0, PAGE_SIZE);

  return filtered.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    rate: p.rate,
    unit: p.unit,
    closing_stock: p.closing_stock ?? null,
    is_active: p.is_active ?? true,
    category_name: p?.category?.name ?? null,
    is_focused_product: p.is_focused_product ?? null,
    default_uom_code: p.unit ?? null,
    allowed_uom_codes: p.unit ? [p.unit] : null,
    variants: Array.isArray(p.variants)
      ? p.variants
          .filter((v: any) => v.is_active !== false)
          .map((v: any) => ({
            id: v.id,
            variant_name: v.variant_name,
            sku: v.sku,
            price: v.price,
            is_active: v.is_active,
            is_focused_product: v.is_focused_product,
          }))
      : [],
  }));
}

export function useProductSearch(
  searchTerm: string,
  selectedCategory: string,
  offlineProducts: any[],
): {
  results: ProductSearchResult[];
  isSearching: boolean;
  needsMoreChars: boolean;
} {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const reqIdRef = useRef(0);

  const term = (searchTerm || '').trim();
  const categoryParam = rpcCategory(selectedCategory);
  const needsMoreChars = term.length > 0 && term.length < MIN_CHARS;

  // Keep latest offline list in a ref so it does NOT retrigger the search
  // effect on every parent render.
  const offlineRef = useRef(offlineProducts);
  useEffect(() => {
    offlineRef.current = offlineProducts;
  }, [offlineProducts]);

  useEffect(() => {
    if (term.length > 0 && term.length < MIN_CHARS) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const myReq = ++reqIdRef.current;

    const handle = setTimeout(
      async () => {
        // Genuine offline → use IndexedDB fallback.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const local = offlineFilter(offlineRef.current, term, categoryParam);
          if (reqIdRef.current === myReq) {
            setResults(local);
            setIsSearching(false);
          }
          return;
        }

        try {
          const { data, error } = await supabase.rpc('search_products_for_order', {
            p_query: term,
            p_category: categoryParam,
            p_limit: PAGE_SIZE,
          });

          if (reqIdRef.current !== myReq) return; // stale

          if (error) {
            console.warn('[useProductSearch] RPC error:', error.message);
            // Still online — show empty rather than stale offline rows so the
            // user gets a clear "no result" instead of confusing data.
            setResults([]);
          } else {
            setResults((data || []) as unknown as ProductSearchResult[]);
          }
        } catch (e) {
          if (reqIdRef.current !== myReq) return;
          console.warn('[useProductSearch] search failed', e);
          setResults([]);
        } finally {
          if (reqIdRef.current === myReq) setIsSearching(false);
        }
      },
      term.length === 0 ? 0 : DEBOUNCE_MS,
    );

    return () => clearTimeout(handle);
  }, [term, categoryParam]);

  return { results, isSearching, needsMoreChars };
}
