import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Star, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFocusedProductActive } from "@/utils/focusedProductChecker";
import { useProductSearch, type ProductSearchResult } from "@/hooks/useProductSearch";

export interface PickerOption {
  value: string;
  label: string;
  product: any;
  variant?: any;
  sku: string;
  price: number;
  type: "product" | "variant";
}

interface ProductPickerPopoverProps {
  rowId: string;
  selectedProduct?: any;
  selectedVariant?: any;
  selectedCategory: string;
  products: any[];
  productsById: Map<string, any>;
  hasActiveSchemes: (product: any) => boolean;
  onSelect: (rowId: string, option: PickerOption) => void;
}

function ProductPickerPopoverInner({
  rowId,
  selectedProduct,
  selectedVariant,
  selectedCategory,
  products,
  productsById,
  hasActiveSchemes,
  onSelect,
}: ProductPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const deferredInput = useDeferredValue(inputValue);
  const debouncedQuery = deferredInput.trim();

  // Single debounce now lives inside useProductSearch (150ms). Removed the
  // outer 250ms wrapper that was stacking on top of it and causing the
  // dropdown to feel slow vs. Customer Portal.

  const {
    results: searchResults,
    isSearching,
    needsMoreChars,
  } = useProductSearch(debouncedQuery, selectedCategory, products);

  const productOptions = useMemo<PickerOption[]>(() => {
    const t0 = import.meta.env.DEV ? performance.now() : 0;
    const options: PickerOption[] = [];

    const hydrate = (r: ProductSearchResult) => {
      const live = productsById.get(r.id);
      if (live) return live;
      return {
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category_name ? { name: r.category_name } : null,
        rate: Number(r.rate),
        unit: r.unit,
        closing_stock: r.closing_stock ?? 0,
        is_active: r.is_active ?? true,
        is_focused_product: r.is_focused_product ?? false,
        variants: (r.variants || []).map((v) => ({
          id: v.id,
          variant_name: v.variant_name,
          sku: v.sku,
          price: Number(v.price),
          stock_quantity: 0,
          discount_amount: 0,
          discount_percentage: 0,
          is_active: v.is_active !== false,
          is_focused_product: v.is_focused_product ?? false,
        })),
      };
    };

    // NOTE: server-side RPC has already filtered by query+category. Do NOT
    // re-filter on the client — that was hiding products like "WINOLAP" when
    // the offline-hydrated row's `name` differed from the server row.

    for (const r of searchResults) {
      const product = hydrate(r);
      {
        options.push({
          value: product.id,
          label: `${product.name} | ₹${product.rate}`,
          product,
          sku: product.sku,
          price: product.rate,
          type: "product",
        });
      }
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.is_active === false) continue;
          options.push({
            value: `${product.id}_variant_${variant.id}`,
            label: `${variant.variant_name} | ₹${variant.price}`,
            product,
            variant,
            sku: variant.sku,
            price: variant.price,
            type: "variant",
          });
        }
      }
    }

    if (import.meta.env.DEV) {
      const dt = performance.now() - t0;
      if (dt > 50) console.warn("[picker] options build", dt.toFixed(1), "ms");
    }
    return options;
  }, [searchResults, productsById, debouncedQuery]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setInputValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-start h-9 md:h-11 text-xs md:text-sm font-normal bg-background px-2"
        >
          {selectedProduct ? (
            <div className="flex items-center gap-1.5 w-full overflow-hidden">
              {(selectedVariant
                ? isFocusedProductActive(selectedVariant)
                : isFocusedProductActive(selectedProduct)) && (
                <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
              )}
              {hasActiveSchemes(selectedProduct) && (
                <Sparkles size={12} className="fill-orange-500 text-orange-500 flex-shrink-0" />
              )}
              <span className="truncate text-left flex-1 font-medium text-foreground">
                {selectedVariant
                  ? (() => {
                      let n = selectedVariant.variant_name as string;
                      if (n.toLowerCase().startsWith(selectedProduct.name.toLowerCase())) {
                        n = n.substring(selectedProduct.name.length).trim();
                        n = n.replace(/^[-\s]+/, "");
                      }
                      return n || selectedVariant.variant_name;
                    })()
                  : selectedProduct.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs md:text-sm">Select...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] md:w-[320px] p-0 bg-background z-50"
        align="start"
      >
        {open && (
          <Command className="bg-background" shouldFilter={false}>
            <CommandInput
              placeholder="Search products by name or SKU..."
              className="h-9 md:h-10 text-xs md:text-sm"
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList className="bg-background max-h-[250px] md:max-h-[300px]">
              {needsMoreChars ? (
                <div className="py-6 text-center text-xs md:text-sm text-muted-foreground">
                  Type at least 2 characters to search…
                </div>
              ) : isSearching && productOptions.length === 0 ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : productOptions.length === 0 ? (
                <CommandEmpty>No product found.</CommandEmpty>
              ) : (
                <CommandGroup className="bg-background">
                  {productOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onSelect(rowId, option);
                        setOpen(false);
                        setInputValue("");
                        
                      }}
                      onMouseMove={(e) => e.preventDefault()}
                      className="text-xs md:text-sm bg-background hover:bg-accent py-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3 md:h-4 md:w-4",
                          selectedProduct?.id === option.product.id &&
                            ((!selectedVariant && !option.variant) ||
                              selectedVariant?.id === option.variant?.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex-1 flex items-center gap-1.5">
                        {(option.variant
                          ? isFocusedProductActive(option.variant)
                          : isFocusedProductActive(option.product)) && (
                          <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                        )}
                        {hasActiveSchemes(option.product) && (
                          <Sparkles size={12} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-[10px] md:text-xs text-muted-foreground">
                            SKU: {option.sku} | ₹
                            {option.variant ? option.variant.price : option.product.rate}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const ProductPickerPopover = React.memo(ProductPickerPopoverInner);
