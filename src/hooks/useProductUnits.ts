import { useQuery } from '@tanstack/react-query';
import { loadProductUnits, type ProductUnit } from '@/lib/uomEngine';

export function useProductUnits(productId: string | null | undefined) {
  return useQuery<ProductUnit[]>({
    queryKey: ['uom', 'product', productId],
    queryFn: () => loadProductUnits(productId as string),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
