# Fix product search input lag in /order-entry

## Root cause

`productPickerQuery` is held in `TableOrderForm` (the parent that also owns `orderRows`, totals, schemes, applied schemes, etc.). Every keystroke in `CommandInput` calls `setProductPickerQuery`, which:

1. Re-renders the **entire** `TableOrderForm` tree — every cart row, totals card, scheme panel, UOM selects, focused-product checks.
2. Re-runs `productOptions` `useMemo` (it depends on `productPickerQuery`).
3. Re-runs `useProductSearch` effect.

`startTransition` does not help because the controlled `<CommandInput value={productPickerQuery}>` is also driven by that same parent state, so the input itself only paints after the parent reconciles. On a row with many sibling rows + heavy totals, that's the 200–500ms hitch the user feels on desktop and mobile.

Lazy-mount + `productsById` + `onMouseMove` suppression (already shipped) reduce dropdown work but do nothing for the parent re-render storm during typing — which is the actual bottleneck.

## Fix (single file: `src/components/TableOrderForm.tsx`)

### 1. Extract `<ProductPickerPopover>` as a memoized child component

New component lives in the same file (or a new sibling file `src/components/order-entry/ProductPickerPopover.tsx` — same-file is fine to keep diff minimal). Responsibilities:

- Owns its **own local state**: `inputValue` (raw text from input) and `open`.
- Owns its own debounce + `useDeferredValue`:
  ```ts
  const [inputValue, setInputValue] = useState('');
  const deferredInput = useDeferredValue(inputValue);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(deferredInput.trim()), 250);
    return () => clearTimeout(t);
  }, [deferredInput]);
  ```
- Calls `useProductSearch(debouncedQuery, selectedCategory, products)` **inside** the picker, not in the parent.
- Builds `productOptions` inside the picker via `useMemo` keyed on `searchResults + productsById + debouncedQuery`.
- Renders the existing `<Popover>` / `<Command>` / `<CommandInput>` / `<CommandList>` JSX unchanged (same classes, same item layout, same badges, same `onMouseMove` suppression, same `shouldFilter={false}`, same lazy-mount).
- `onChange` of the input is only `setInputValue(v)` — no filtering, no parent calls.
- On select: calls `props.onSelect(option)` which the parent wires to its existing `handleProductSelect(row.id, option.value)`.

Wrap the whole component in `React.memo` with a custom comparator that ignores function identity (parent passes stable callbacks via `useCallback`).

### 2. Stabilize props passed from parent

In `TableOrderForm`:

- `productsById` already memoized — keep it, pass as prop.
- `selectedCategory`, `products`, `row.product`, `row.variant` — primitives / referenced values, fine.
- Wrap `handleProductSelect` and `hasActiveSchemes` (used inside item render) in `useCallback` so the picker's `React.memo` does not bust on every parent render.
- Pass `isFocusedProductActive` indirectly (it's a pure import, no need to pass).

### 3. Remove parent-level picker state

Delete from `TableOrderForm`:

- `productPickerQuery` state (line 183).
- The `useProductSearch(...)` call at the parent (line 184–188).
- `productOptions` memo (line 769–848).
- `searchNeedsMoreChars` / `isSearchingProducts` references in JSX (moved into picker).

`openComboboxes` map can stay in the parent (used elsewhere for trigger styling) OR move into the picker — picker-local is cleaner. Move it in: each `<ProductPickerPopover>` owns its own `open` boolean. The trigger button (with focused-product star, schemes sparkles, selected label) stays inside the picker so the parent row no longer re-renders on open/close either.

### 4. Keep cart / totals isolated

Because `productPickerQuery` is gone from the parent, none of the cart calc memos (`calculateOrderWithSchemes`, totals, applied schemes, UOM auto-fill) re-run while typing. Cart, totals, scheme panel are unchanged structurally; they just stop re-rendering on keystrokes.

### 5. Performance logging (dev-only)

Inside the picker, wrap in `import.meta.env.DEV` guards:

```ts
const t0 = performance.now();
// after build of productOptions
if (import.meta.env.DEV && performance.now() - t0 > 50) {
  console.warn('[picker] options build', performance.now() - t0, 'ms');
}
```

Same for the input handler. Removed before merge if noisy — kept behind `DEV` flag so prod is unaffected.

### 6. Virtualization — deferred (justified)

The dropdown is server-capped at `PAGE_SIZE = 100` rows in `useProductSearch` and uses `max-h-[300px]` with native scroll. Virtualizing 100 short rows inside a `cmdk` list adds complexity (cmdk's keyboard nav expects all items mounted to manage `data-selected`) for negligible gain once the parent re-render storm is gone. If the user still reports lag after step 1–4, follow-up: swap `CommandGroup` children for `react-window`'s `FixedSizeList` with `cmdk`'s `value` prop on each row — but only then.

## Out of scope

- `src/pages/customer-portal/**` — untouched.
- `useProductSearch` — untouched.
- UI layout, business logic, search results behavior, cart logic — unchanged.
- Other consumers of `productPickerQuery` / `productOptions` — none exist (grep-confirmed: both names appear only inside `TableOrderForm.tsx`).

## Files touched

- `src/components/TableOrderForm.tsx` only.

## Expected result

- Keystrokes update the input immediately (local state, no parent re-render).
- Filtering runs after 250 ms idle on a deferred value, off the input's critical path.
- Cart, totals, scheme panel, UOM selects do not re-render while the user types.
- Desktop and mobile typing latency drops to <50 ms per keystroke; no dropped keys.
