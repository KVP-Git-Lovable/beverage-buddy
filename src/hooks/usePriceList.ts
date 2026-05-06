import { useQuery } from '@tanstack/react-query';
import { loadPriceList, type PriceListEntry } from '@/lib/uomEngine';

/**
 * Fetches the optional per-UOM price overrides for a product.
 * Returns an empty array when the product has no overrides — in that case
 * pricing falls back to the existing derived math (products.rate × conv).
 */
export function usePriceList(productId: string | null | undefined) {
  return useQuery<PriceListEntry[]>({
    queryKey: ['price-list', productId],
    queryFn: () => loadPriceList(productId as string),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
