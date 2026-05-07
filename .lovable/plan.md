## Goal
Replace `/order-entry`'s 20k-product IDB load with the same server-side `search_products_for_order` pattern the Customer Portal uses, make the Unit dropdown render in the same frame as product selection, and fail cleanly when offline.

## Important findings before coding
- **`search_products_for_order` does NOT currently return UOM data.** Its RETURNS shape (migration `20260504090556`) is `id, sku, name, rate, unit, closing_stock, is_active, category_name, is_focused_product, variants`. There is **no `default_uom` and no `allowed_uoms`**. The user's Step 2 in Change 3 assumes those fields exist — they don't. We must either extend the RPC or read units from the already-prefetched UOM cache (`productCache` in `src/lib/uomEngine.ts` filled by `prefetchAllProductUnits`).
- **The RPC also has no `is_focused` / `is_focused: true` parameter.** Featured-products mode needs an RPC change or a different empty-query path.
- `useOfflineOrderEntry` is imported by other places too — we'll only stop using its `products`/`syncProductsInBackground` from `OrderEntry.tsx`, not delete the hook.
- UOM conversion math in `UnitRateDisplay` requires `conversion_to_base` per UOM, which only `product_uom_mapping` carries — not flat strings. So even if we add codes to the search RPC, `UnitRateDisplay` still needs the prefetched UOM cache to compute prices correctly.

## Plan

### Change 1 — Extend `search_products_for_order` (DB migration)
Add to the RETURNS shape and SELECT:
- `default_uom_code text` — the `is_default_sales` PUM row's UOM code, falling back to base.
- `allowed_uom_codes text[]` — array of all enabled UOM codes for the product (from PUM joined to `uom_master`, filtered by enabled).
- New parameter `p_is_focused boolean DEFAULT NULL` — when true, restricts results to `is_focused_product = true` (used for the empty-query "featured" path).

Implementation: one `LEFT JOIN LATERAL` aggregation against `product_uom_mapping`. No schema changes to `products`. Drop the legacy 3-arg signature explicitly to avoid overload (per project convention).

### Change 2 — Remove IDB product loading from `OrderEntry.tsx`
- Drop the destructured `products: cachedProducts`, `syncProductsInBackground`, etc. from `useOfflineOrderEntry()`. (Keep the hook intact for other consumers.)
- Remove the `[products, setProducts]` state, the cached-products → grid mapping block (around L809-L876), the auto-expand-on-load effect (L271-L285), and the `prefetchAllProductUnits()` call at L263.
- Remove `filteredProducts` derived from the in-memory array and the grid pagination over it.
- **Keep**: `sync_queue` IDB store, order placement, upload-on-reconnect, scheme calc, voice/chat ordering, table-mode submission.

### Change 3 — Wire server-side search (table + grid mode)
Mirror the Customer Portal pattern:
- React Query `useInfiniteQuery` (or `useQuery` with `keepPreviousData: true`) keyed by `['order-entry-search', debouncedTerm, selectedCategory, isFocusedMode]`.
- 300 ms debounce on the search input.
- Calls: `supabase.rpc('search_products_for_order', { p_query, p_category, p_limit: 40, p_is_focused })`. Empty term → `p_is_focused = true`.
- 6 s `AbortController` timeout → inline error: "Search unavailable — check your connection".
- The picker in `ProductPickerPopover` already uses `useProductSearch`, which already calls this RPC; we'll align it to the new signature and the new `p_is_focused` empty-state path.
- Grid mode: render the page from the same query result (page size 40), no in-memory filter.

### Change 4 — Unit dropdown renders instantly
The data source for `UnitSelect`/`UnitRateDisplay` already exists, but it's wired to `useProductUnits` which awaits a per-product RPC. Two-layer fix:
1. **Synchronous unit list from search row.** Pass `allowed_uom_codes` + `default_uom_code` (added in Change 1) directly into `UnitSelect` as a prop. The Select renders these immediately on selection — same render frame, no spinner, no `loading` gate.
2. **Conversion factors load in parallel for `UnitRateDisplay`.** The price-per-unit math still requires `conversion_to_base` from `product_uom_mapping`. Use the existing in-memory `productCache` (seeded by `prefetchAllProductUnits` on app boot) so `useUnitPrice` resolves synchronously when cache is hit. If a cache miss occurs (rare new product), fall back to displaying the base rate without blocking the Select.
3. Remove any `{!isLoadingDetails && <UnitSelect />}` wrapper — none exists today, but verify and assert.

`onProductSelected` shape:
```ts
function onProductSelected(rowId, productId) {
  setSelectedProduct(rowId, searchResults.find(p => p.id === productId));   // sync
  if (!detailCache.current.has(productId)) {
    supabase.rpc('get_product_details', { p_id: productId })
      .then(({ data }) => detailCache.current.set(productId, data));        // parallel, schemes/variants
  }
}
```
`detailCache` is a `useRef(new Map<string, ProductDetails>())` — session-scoped, never re-fetches the same product.

### Change 5 — Offline UX (clean block, no crash)
- Reuse the existing `useConnectivity` hook (already in `src/hooks/useConnectivity.ts`).
- When `status === 'offline'`:
  - Show a non-dismissible top banner: "You are offline. Product search is unavailable. Please reconnect to continue."
  - Disable the search input and the product picker (`disabled` on the Popover trigger and the `Add row` button).
  - Disable the Place Order button.
  - Cart contents stay intact and visible.
- When `status === 'online'`: banner hides, controls re-enable, query refetches via React Query's `refetchOnReconnect: true`.

## Files to touch
- `supabase/migrations/<new>.sql` — extend `search_products_for_order` (drop old signature, new return cols, `p_is_focused`).
- `src/pages/OrderEntry.tsx` — remove IDB product wiring, add search query + offline gating, pass UOM codes to `UnitSelect`, add detail cache.
- `src/hooks/useProductSearch.ts` — accept `p_is_focused`, surface new UOM fields on `ProductSearchResult`.
- `src/components/order-entry/UnitControls.tsx` — accept `allowedUomCodes` + `defaultUomCode` props; render Select synchronously from them; keep `useUnitPrice` only for the price display.
- `src/components/order-entry/ProductPickerPopover.tsx` — propagate the new fields when an option is chosen.

## What we deliberately do NOT change
- `useOfflineOrderEntry` (other consumers depend on it).
- `sync_queue`, order placement, upload-on-reconnect, voice/chat order flow.
- Customer Portal, admin pages, PM pages, scheme calculator, UOM conversion engine.

## Validation
- `/order-entry` opens < 1.5 s, no `Saved to products` console output, no IDB read for products.
- Network tab shows a single `search_products_for_order` call ~300 ms after each keystroke.
- `console.time('unit-render')` around `setSelectedProduct` and `console.timeEnd` inside `UnitSelect`'s render shows < 50 ms.
- `get_product_details` fires after selection but UI does not flicker; second selection of the same product → no new RPC call.
- DevTools airplane mode → banner shows, picker + Place Order disabled, cart preserved, no errors. Toggling back online auto-refetches.
- Schemes, UOM conversion, voice/chat, table mode, grid mode all work; Customer Portal unaffected; no TS errors.