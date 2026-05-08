## Problem

When a product is picked in `/order-entry`, the **Rate** column shows "Select a unit to see price" / blank for 1–3 s.

Tracing the price:

- `TableOrderForm.tsx` (Table mode) renders the rate via `getPricePerUnit(row.product, row.variant, row.unit)` (line 1143). That function returns `null` until `loadProductUnits(productId)` resolves — i.e. it waits on the `product_uom_mapping` RPC for that product.
- In Grid mode, `OrderEntry.tsx` lines 2460/2533 render `<UnitRateDisplay>` which calls `useUnitPrice → useProductUnits`. Same gate: until the per-product UOM rows arrive, `activeUnits.length === 0` ⇒ shows the "No unit set" / loading state.
- `useProductUnits` already supports a synchronous seed via `getCachedProductUnits` (populated by `prefetchAllProductUnits`), but on first selection of an un-prefetched product the gate is still hit.

Meanwhile the search row already carries everything needed for an instant render:

- `rate` (₹ per price-basis unit)
- `default_uom_code`
- `allowed_uom_codes`

`ProductPickerPopover` already attaches them as `_default_uom_code` / `_allowed_uom_codes` on the hydrated product, and `UnitSelect` already uses these as `hintAllowedCodes` / `hintDefaultCode` to render the unit dropdown synchronously. Only the **price** path still blocks.

## Goal

When a product is selected:

1. Price renders in the same render frame as selection — using `product.rate` at `default_uom_code`.
2. Unit dropdown renders synchronously from the hint codes (already works).
3. The full UOM mapping fetch fires in parallel and, once it arrives, refines the price for non-default units (or seamlessly replaces the hint-driven value with the mapping-driven value, identical for the default unit since `target.conversionToBase / basis.conversionToBase = 1`).
4. Selecting the same product a second time triggers no refetch.

## Changes

### 1. `src/hooks/useUnitPrice.ts` — add synchronous fallback

Extend the hook signature with optional hints:

```ts
useUnitPrice(productId, baseRate, {
  hintDefaultCode?: string,
  hintAllowedCodes?: string[],
})
```

Behavior:

- When `activeUnits` is empty (mapping still loading) **and** hints are present: return a synthetic `activeUnits = [{ code, conversionToBase: 1, isBase, isPriceBasis, isDefaultSales }]` so `priceForCode(default) === baseRate`.
- `defaultUnitCode` falls back to `hintDefaultCode`.
- `priceForCode(code)`: if `code` matches a hint code, return `baseRate`; otherwise return `baseRate` (cannot convert without mapping — same as today).
- Once `useProductUnits` resolves, the real mapping takes over automatically.

This removes the "blank price" state without touching the conversion math used in `addToCart`.

### 2. `src/components/order-entry/UnitControls.tsx` — `UnitRateDisplay`

- Accept the same optional `hintDefaultCode` / `hintAllowedCodes` props (mirrors `UnitSelect`).
- Pass them to `useUnitPrice`.
- Remove the early-return `<span>No unit set</span>` when `activeUnits.length === 0` **if** hints are present — fall through to render `₹{baseRate.toFixed(2)}`.
- Keep the misconfigured-product error only after mapping has loaded *and* it is genuinely empty *and* no hints exist.

### 3. `src/pages/OrderEntry.tsx` (Grid mode)

At lines 2460 & 2533, pass the new hint props to `<UnitRateDisplay>` and `<UnitSelect>`:

```tsx
hintDefaultCode={(product as any)?._default_uom_code ?? undefined}
hintAllowedCodes={(product as any)?._allowed_uom_codes ?? undefined}
```

(`UnitSelect` for variants gets the same hints — variants share the parent product's UOM mapping.)

### 4. `src/components/TableOrderForm.tsx` (Table mode)

Replace the `getPricePerUnit` gate at line 1143 with a hint-aware path:

```ts
const hintDefault = (row.product as any)?._default_uom_code;
const hintAllowed = (row.product as any)?._allowed_uom_codes as string[] | undefined;
const mappingPrice = getPricePerUnit(row.product, row.variant, row.unit);

// Show instantly: mapping price if known, else baseRate when row.unit
// matches the hint default, else baseRate as the safe initial display.
const baseRate = Number(row.variant ? row.variant.price : row.product.rate) || 0;
const displayPrice =
  mappingPrice ??
  (row.unit && (row.unit === hintDefault || hintAllowed?.includes(row.unit))
    ? baseRate
    : baseRate);
```

Render `₹{displayPrice.toFixed(2)} per {row.unit || hintDefault}` immediately. Keep the existing `unconfigured` error branch for products whose mapping has loaded as empty.

The `addToCart` path at line 311 (`syncRowsToCart`) is untouched — it still requires the real mapping, so cart math, scheme calculations and conversion factors continue to use `loadProductUnits`. Only the **display** is unblocked.

### 5. Session detail cache (already mostly in place)

- `useProductUnits` is React-Query–backed with `staleTime: 5 min` and `gcTime: 30 min`, plus an in-memory seed via `getCachedProductUnits`. Selecting the same product again uses the cache — no RPC.
- Add an explicit guard in `OrderEntry.tsx` around `loadProductUnits(product.id)` in `addToCart` (line 1306): check `getCachedProductUnits(product.id)` first to avoid the redundant promise round-trip on repeat selections.
- No new `get_product_details` cache is needed for this fix; the search row already supplies everything required for instant render.

## What is NOT changing

- `useProductSearch.ts`, `search_products_for_order` RPC, offline fallback path
- Cart math, scheme calculations, UOM conversion factors (`addToCart` still loads the real mapping before committing a row)
- `useOfflineOrderEntry`, `sync_queue`, offline order flow
- Customer Portal, any other page

## Validation

- Pick a never-before-selected product on a throttled "Slow 4G" profile: rate appears in the same render frame as the product name; the `product_uom_mapping` request is still in flight in DevTools Network panel.
- Switch unit to a non-default UOM before mapping resolves: shows `baseRate` immediately, then refines once mapping arrives.
- Select the same product again in another row: zero new RPC calls (React-Query cache hit).
- Adding to cart still respects the strict UOM-mapping guard (toast on misconfigured products).
- No TypeScript errors; all hint props are optional with safe defaults.
