import { useMemo } from 'react';
import { useProductUnits } from '@/hooks/useProductUnits';
import type { ProductUnit } from '@/lib/uomEngine';

export interface UnitPriceResult {
  loading: boolean;
  activeUnits: ProductUnit[];
  baseUnit: ProductUnit | null;
  priceBasisUnit: ProductUnit | null;
  defaultUnitCode: string;
  priceForCode: (unitCode: string | undefined | null) => number;
  baseUnitCode: string;
  /** True when the result is derived from search-row hints, not the real
   *  product_uom_mapping. Conversion factors are unknown — non-default units
   *  fall back to baseRate. */
  isHintFallback: boolean;
}

export interface UseUnitPriceOptions {
  /** From search row: products.default_uom_code. Used to render price
   *  synchronously before product_uom_mapping has loaded. */
  hintDefaultCode?: string | null;
  /** From search row: products.allowed_uom_codes. Used by hint fallback. */
  hintAllowedCodes?: string[] | null;
}

/**
 * Synchronous companion to uomEngine.getPriceForUnit. When the per-product
 * UOM mapping is still loading, the optional `hint*` codes from the search
 * row let render code show `baseRate` immediately at the default unit —
 * the mapping later refines per-unit prices for non-default UOMs.
 */
export function useUnitPrice(
  productId: string | null | undefined,
  baseRate: number,
  options?: UseUnitPriceOptions,
): UnitPriceResult {
  const { data, isLoading } = useProductUnits(productId || null);
  const hintDefaultCode = options?.hintDefaultCode || '';
  const hintAllowedCodes = options?.hintAllowedCodes || null;

  return useMemo(() => {
    const mappingUnits = data || [];
    const haveMapping = mappingUnits.length > 0;

    // Hint fallback — synthesize a minimal ProductUnit list from the search
    // row so render code can show a price immediately.
    const hintUnits: ProductUnit[] = !haveMapping
      ? (() => {
          const codes = new Set<string>();
          if (hintDefaultCode) codes.add(hintDefaultCode);
          (hintAllowedCodes || []).forEach((c) => c && codes.add(c));
          return Array.from(codes).map((code, idx) => ({
            uomId: `__hint_${code}`,
            code,
            name: code,
            // We don't know real conversion factors; treat each hint as 1:1
            // so priceForCode(code) === baseRate. Real mapping replaces this.
            conversionToBase: 1,
            isBase: idx === 0,
            isPriceBasis: code === hintDefaultCode,
            isDefaultSales: code === hintDefaultCode,
          })) as ProductUnit[];
        })()
      : [];

    const activeUnits = haveMapping ? mappingUnits : hintUnits;
    const isHintFallback = !haveMapping && hintUnits.length > 0;

    const baseUnit = activeUnits.find((u) => u.isBase) ?? null;
    const priceBasisUnit =
      activeUnits.find((u) => u.isPriceBasis) ??
      activeUnits.find((u) => u.isDefaultSales) ??
      baseUnit;
    const defaultUnit =
      activeUnits.find((u) => u.isDefaultSales) ?? baseUnit;

    const basisConv = priceBasisUnit?.conversionToBase || 1;

    const priceForCode = (unitCode: string | undefined | null): number => {
      const safeRate = Number(baseRate) || 0;
      if (!unitCode || activeUnits.length === 0) return safeRate;
      const target = activeUnits.find(
        (u) => u.code.toUpperCase() === unitCode.toUpperCase(),
      );
      if (!target) return safeRate;
      return safeRate * (target.conversionToBase / basisConv);
    };

    return {
      loading: isLoading,
      activeUnits,
      baseUnit,
      priceBasisUnit,
      defaultUnitCode:
        defaultUnit?.code || baseUnit?.code || hintDefaultCode || '',
      baseUnitCode: baseUnit?.code || hintDefaultCode || '',
      priceForCode,
      isHintFallback,
    };
  }, [data, isLoading, baseRate, hintDefaultCode, hintAllowedCodes]);
}
