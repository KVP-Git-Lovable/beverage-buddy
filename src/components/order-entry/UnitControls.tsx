import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUnitPrice } from '@/hooks/useUnitPrice';
import { cn } from '@/lib/utils';

/**
 * Per-line UOM picker — STRICT mapping-only.
 *
 * Source of truth: `product_uom_mapping` (filtered by enabled UOM Master)
 * via the `get_product_units` RPC, surfaced through `useUnitPrice`.
 *
 * Rules (Golden Rule):
 *   - If product has UOM mappings → show ONLY those.
 *   - If product has NO UOM mappings → render a disabled select with
 *     "No units configured" (admin must add units in Product Master).
 *
 * No hardcoded kg/grams fallback. No silent unit injection.
 */
export const UnitSelect: React.FC<{
  productId: string;
  baseRate: number;
  /** Currently selected UOM code (controlled). */
  value: string | undefined;
  onChange: (code: string) => void;
  className?: string;
}> = ({ productId, baseRate, value, onChange, className }) => {
  const { activeUnits, defaultUnitCode, loading } = useUnitPrice(productId, baseRate);

  // Empty mapping → disabled error placeholder. The product is misconfigured;
  // admin must add UOM rows in Product Master before this product can be ordered.
  if (!loading && activeUnits.length === 0) {
    return (
      <Select disabled value="">
        <SelectTrigger
          className={cn(
            'border-destructive text-destructive',
            className || 'h-6 text-xs p-1 w-full',
          )}
          title="No units configured for this product. Open Product Master → complete Step 1 (Price basis + Default sales) and Step 2 (packaging), then save."
        >
          <SelectValue placeholder="No unit set" />
        </SelectTrigger>
      </Select>
    );
  }

  const options = activeUnits.map((u) => ({ code: u.code, name: u.name || u.code }));
  const effectiveValue = value || defaultUnitCode || options[0]?.code || '';

  return (
    <Select value={effectiveValue} onValueChange={onChange}>
      <SelectTrigger className={className || 'h-6 text-xs p-1 w-full'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.code} value={o.code}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * Renders the per-unit display price for a product/variant, derived purely
 * from UOM Master conversion factors stored in `product_uom_mapping`.
 *
 * No mappings → render the raw `baseRate` (no implied conversion).
 */
export const UnitRateDisplay: React.FC<{
  productId: string;
  baseRate: number;
  selectedUnitCode: string | undefined;
}> = ({ productId, baseRate, selectedUnitCode }) => {
  const { priceForCode, baseUnitCode, activeUnits } = useUnitPrice(productId, baseRate);

  // No mapping → product is misconfigured. Refuse to display a price; the
  // raw baseRate has no meaningful unit and would silently mislead the user.
  if (activeUnits.length === 0) {
    return (
      <span className="text-destructive text-[10px] font-medium">
        No unit set
      </span>
    );
  }

  const effective = selectedUnitCode || baseUnitCode || '';
  const price = priceForCode(effective);
  const baseLabel = (baseUnitCode || '').toLowerCase();
  const showHint =
    !!effective && !!baseLabel && effective.toLowerCase() !== baseLabel;

  if (!showHint) {
    return <span>₹{price.toFixed(2)}</span>;
  }

  return (
    <div className="flex flex-col">
      <span>₹{price.toFixed(2)}</span>
      <span className="text-[9px] text-muted-foreground">
        (₹{baseRate.toFixed(2)}/{baseLabel})
      </span>
    </div>
  );
};
