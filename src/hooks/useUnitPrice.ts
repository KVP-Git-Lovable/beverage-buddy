import { useMemo } from 'react';
import { useProductUnits } from '@/hooks/useProductUnits';
import type { ProductUnit } from '@/lib/uomEngine';

export interface UnitPriceResult {
  loading: boolean;
  activeUnits: ProductUnit[];
  baseUnit: ProductUnit | null;
  priceBasisUnit: ProductUnit | null;
  defaultUnitCode: string;
  /**
   * Returns the rate (₹) of one `unitCode` for this product, derived from
   * `baseRate` (which is the rate of one *price-basis* unit — i.e. products.rate).
   *
   * Formula (matches uomEngine.getPriceForUnit fallback, minus the price-list override):
   *     rate × (target.conversionToBase / basis.conversionToBase)
   *
   * If the product has no UOM mappings (legacy products), returns `baseRate` unchanged.
   */
  priceForCode: (unitCode: string | undefined | null) => number;
  /** Convenience: code of the base UOM, or '' if not configured. */
  baseUnitCode: string;
}

/**
 * Synchronous companion to uomEngine.getPriceForUnit — uses already-cached
 * product units from React Query so render code can compute per-UOM prices
 * without async work. Falls back to baseRate when units are unknown.
 */
export function useUnitPrice(
  productId: string | null | undefined,
  baseRate: number,
): UnitPriceResult {
  const { data, isLoading } = useProductUnits(productId || null);

  return useMemo(() => {
    const activeUnits = data || [];
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
      defaultUnitCode: defaultUnit?.code || baseUnit?.code || '',
      baseUnitCode: baseUnit?.code || '',
      priceForCode,
    };
  }, [data, isLoading, baseRate]);
}
