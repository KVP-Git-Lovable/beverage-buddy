import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronsUpDown, X, Upload, Image as ImageIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const weeksOfMonth = [
  { value: 'week1', label: '1st Week' },
  { value: 'week2', label: '2nd Week' },
  { value: 'week3', label: '3rd Week' },
  { value: 'week4', label: '4th Week' }
];

const monthsOfYear = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' }
];

interface ProductCategory {
  id: string;
  name: string;
}

interface Territory {
  id: string;
  name: string;
  region: string;
}

interface ProductFormData {
  is_active: boolean;
  sku: string;
  product_number: string;
  name: string;
  description: string;
  category_id: string;
  base_unit: string;
  unit: string;
  conversion_factor: number;
  rate: number;
  closing_stock: number;
  barcode: string;
  barcode_image_url?: string;
  qr_code?: string;
  hsn_code?: string;
  brand?: string;
  gst_percentage?: number | null;
  is_focused_product: boolean;
  focused_type?: 'fixed_date' | 'recurring' | 'keep_open';
  focused_due_date: string;
  focused_target_quantity: number;
  focused_territories: string[];
  focused_recurring_config?: {
    days_of_week?: string[];
    weeks_of_month?: string[];
    months_of_year?: string[];
  };
}

interface ProductFormFieldsProps {
  form: ProductFormData;
  categories: ProductCategory[];
  territories: Territory[];
  onFormChange: (updates: Partial<ProductFormData>) => void;
  /** Code of the product's price-basis UOM (GRAM/KG/PIECE…) — used in the
   *  Base Rate hint text. Falls back to a neutral hint if unknown. */
  priceBasisCode?: string | null;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

export const ProductFormFields: React.FC<ProductFormFieldsProps> = ({
  form,
  categories,
  territories,
  onFormChange,
  priceBasisCode,
}) => {
  const [territoryComboOpen, setTerritoryComboOpen] = useState(false);
  const [recurringType, setRecurringType] = useState<'days' | 'weeks' | 'months'>('days');

  return (
    <div className="space-y-4">
      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => onFormChange({ is_active: !!checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      {/* SKU + Product Name + Manufacturer Code (mockup row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={form.sku}
            onChange={(e) => onFormChange({ sku: e.target.value })}
            placeholder="e.g. KG-250G"
            required
          />
        </div>
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => onFormChange({ name: e.target.value })}
            placeholder="e.g. KADAK GOLD 250G"
            required
          />
        </div>
        <div>
          <Label htmlFor="product_number">
            Manufacturer Code <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Input
            id="product_number"
            value={form.product_number}
            onChange={(e) => onFormChange({ product_number: e.target.value })}
            placeholder="e.g. MFG-KG-250"
          />
        </div>
      </div>

      {/* Category + Brand + HSN + GST (mockup row 2) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={form.category_id} onValueChange={(value) => onFormChange({ category_id: value })}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="brand">
            Brand <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Input
            id="brand"
            value={form.brand || ''}
            onChange={(e) => onFormChange({ brand: e.target.value })}
            placeholder="e.g. Tata Tea"
          />
        </div>
        <div>
          <Label htmlFor="hsn_code">HSN/SAC Code</Label>
          <Input
            id="hsn_code"
            value={form.hsn_code || ''}
            onChange={(e) => onFormChange({ hsn_code: e.target.value })}
            placeholder="e.g. 0902"
          />
        </div>
        <div>
          <Label htmlFor="gst_percentage">GST % *</Label>
          <Select
            value={
              form.gst_percentage === null || form.gst_percentage === undefined
                ? ''
                : String(form.gst_percentage)
            }
            onValueChange={(value) =>
              onFormChange({ gst_percentage: value === '' ? null : Number(value) })
            }
          >
            <SelectTrigger id="gst_percentage">
              <SelectValue placeholder="Select GST" />
            </SelectTrigger>
            <SelectContent>
              {GST_OPTIONS.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {g}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barcode (text only) + Description (mockup row 3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="barcode">
            Barcode / EAN <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Input
            id="barcode"
            value={form.barcode || ''}
            onChange={(e) => onFormChange({ barcode: e.target.value })}
            placeholder="e.g. 8901030748023"
          />
          <p className="text-xs text-muted-foreground mt-1">Enter barcode number (EAN/UPC)</p>
        </div>
        <div>
          <Label htmlFor="description">
            Description <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => onFormChange({ description: e.target.value })}
            placeholder="Premium quality kadak tea, strong taste and rich aroma."
            rows={3}
          />
        </div>
      </div>

      {/* Base Rate — rendered AFTER UOM editor by the parent. We expose it
          here as a separate sub-component callers can place anywhere. */}

      {/* Stock fields (opening / closing / reorder level) intentionally removed.
          All stock movements are managed in the Inventory module via
          distributor_inventory_transactions, never on the product row. */}

      {/* QR Code Display */}
      {form.qr_code && (
        <div>
          <Label>QR Code (Auto-generated)</Label>
          <div className="mt-2">
            <img src={form.qr_code} alt="QR Code" className="h-32 w-32 border rounded" />
          </div>
        </div>
      )}

      {/* Focused Product Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_focused_product"
            checked={form.is_focused_product}
            onCheckedChange={(checked) => onFormChange({ is_focused_product: !!checked })}
          />
          <Label htmlFor="is_focused_product" className="font-semibold">
            Mark as Focused Product
          </Label>
        </div>

        {form.is_focused_product && (
          <div className="space-y-4 pl-6 border-l-2 border-primary/20">
            <div className="flex items-center gap-2">
              <Label className="font-semibold">Focused Product Schedules</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Choose how to schedule this focused product</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={form.focused_type}
              onValueChange={(value) => onFormChange({ focused_type: value as 'fixed_date' | 'recurring' | 'keep_open' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed_date" id="fixed_date" />
                <Label htmlFor="fixed_date" className="cursor-pointer flex items-center gap-1">
                  Fixed Date
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">One-time campaign with specific end date</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="recurring" />
                <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-1">
                  Recurring
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Automated schedule based on selected pattern</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="keep_open" id="keep_open" />
                <Label htmlFor="keep_open" className="cursor-pointer flex items-center gap-1">
                  Keep it Open
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">No expiry date, active until manually disabled</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
            </RadioGroup>

            {/* Fixed Date Configuration */}
            {form.focused_type === 'fixed_date' && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div>
                  <Label htmlFor="focused_due_date">Due Date</Label>
                  <Input
                    id="focused_due_date"
                    type="date"
                    value={form.focused_due_date}
                    onChange={(e) => onFormChange({ focused_due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Recurring Configuration */}
            {form.focused_type === 'recurring' && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div>
                  <Label className="font-medium">Recurring Pattern</Label>
                  <RadioGroup
                    value={recurringType}
                    onValueChange={(value) => setRecurringType(value as 'days' | 'weeks' | 'months')}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="days" id="days" />
                      <Label htmlFor="days" className="cursor-pointer">Days of Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weeks" id="weeks" />
                      <Label htmlFor="weeks" className="cursor-pointer">Weeks of Month</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="months" id="months" />
                      <Label htmlFor="months" className="cursor-pointer">Months of Year</Label>
                    </div>
                  </RadioGroup>
                </div>

                {recurringType === 'days' && (
                  <div>
                    <Label>Select Days</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {daysOfWeek.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={form.focused_recurring_config?.days_of_week?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const current = form.focused_recurring_config?.days_of_week || [];
                              const updated = checked
                                ? [...current, day.value]
                                : current.filter(d => d !== day.value);
                              onFormChange({
                                focused_recurring_config: {
                                  days_of_week: updated,
                                  weeks_of_month: [],
                                  months_of_year: []
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurringType === 'weeks' && (
                  <div>
                    <Label>Select Weeks</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {weeksOfMonth.map(week => (
                        <div key={week.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`week-${week.value}`}
                            checked={form.focused_recurring_config?.weeks_of_month?.includes(week.value)}
                            onCheckedChange={(checked) => {
                              const current = form.focused_recurring_config?.weeks_of_month || [];
                              const updated = checked
                                ? [...current, week.value]
                                : current.filter(w => w !== week.value);
                              onFormChange({
                                focused_recurring_config: {
                                  days_of_week: [],
                                  weeks_of_month: updated,
                                  months_of_year: []
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`week-${week.value}`} className="cursor-pointer text-sm">
                            {week.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurringType === 'months' && (
                  <div>
                    <Label>Select Months</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {monthsOfYear.map(month => (
                        <div key={month.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`month-${month.value}`}
                            checked={form.focused_recurring_config?.months_of_year?.includes(month.value)}
                            onCheckedChange={(checked) => {
                              const current = form.focused_recurring_config?.months_of_year || [];
                              const updated = checked
                                ? [...current, month.value]
                                : current.filter(m => m !== month.value);
                              onFormChange({
                                focused_recurring_config: {
                                  days_of_week: [],
                                  weeks_of_month: [],
                                  months_of_year: updated
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`month-${month.value}`} className="cursor-pointer text-sm">
                            {month.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target Quantity - shown for all types */}
            <div>
              <Label htmlFor="focused_target_quantity">Target Quantity</Label>
              <Input
                id="focused_target_quantity"
                type="number"
                value={form.focused_target_quantity}
                onChange={(e) => onFormChange({ focused_target_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Enter target quantity"
              />
            </div>

            {/* Territories Multi-select - shown for all types */}
            <div>
              <Label>Territories</Label>
              <Popover open={territoryComboOpen} onOpenChange={setTerritoryComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={territoryComboOpen}
                    className="w-full justify-between"
                  >
                    {form.focused_territories.length > 0
                      ? `${form.focused_territories.length} selected`
                      : "Select territories..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search territories..." />
                    <CommandList>
                      <CommandEmpty>No territory found.</CommandEmpty>
                      <CommandGroup>
                        {territories.map((territory) => (
                          <CommandItem
                            key={territory.id}
                            value={territory.name}
                            onSelect={() => {
                              const isSelected = form.focused_territories.includes(territory.id);
                              const updated = isSelected
                                ? form.focused_territories.filter(id => id !== territory.id)
                                : [...form.focused_territories, territory.id];
                              onFormChange({ focused_territories: updated });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.focused_territories.includes(territory.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {territory.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.focused_territories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.focused_territories.map((id) => {
                    const territory = territories.find(t => t.id === id);
                    return territory ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {territory.name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => onFormChange({
                            focused_territories: form.focused_territories.filter(tid => tid !== id)
                          })}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Standalone Base Rate input — render this AFTER the UOM editor in the parent
 * so the user picks units first, then sets the price for the chosen price-basis
 * unit. The hint reads from `priceBasisCode` so the user knows what the rate
 * represents (per GRAM vs per KG vs per PIECE).
 */
export const BaseRateField: React.FC<{
  rate: number;
  priceBasisCode?: string | null;
  onRateChange: (v: number) => void;
}> = ({ rate, priceBasisCode, onRateChange }) => (
  <div>
    <Label htmlFor="rate">Base Rate (₹) *</Label>
    <Input
      id="rate"
      type="number"
      step="0.01"
      value={rate}
      onChange={(e) => onRateChange(parseFloat(e.target.value) || 0)}
      placeholder="0.00"
      required
    />
    <p className="text-xs text-muted-foreground mt-1">
      {priceBasisCode
        ? `Price is set per ${priceBasisCode}`
        : 'Pick a Price Basis Unit above to set what this rate represents.'}
    </p>
  </div>
);
