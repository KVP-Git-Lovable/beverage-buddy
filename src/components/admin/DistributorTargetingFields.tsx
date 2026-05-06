import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface DistributorTargetingFieldsProps {
  targetType: string;
  targetIds: string[];
  onTargetTypeChange: (val: string) => void;
  onTargetIdsChange: (ids: string[]) => void;
}

const TARGET_TYPES = [
  { value: 'all', label: 'All Distributors' },
  { value: 'type', label: 'By Distributor Type' },
  { value: 'specific', label: 'By Specific Distributor' },
  { value: 'parent', label: 'By Parent (include children)' },
];

export function DistributorTargetingFields({
  targetType,
  targetIds,
  onTargetTypeChange,
  onTargetIdsChange,
}: DistributorTargetingFieldsProps) {
  const { data: distributorTypes = [] } = useQuery({
    queryKey: ['distributor-types-for-targeting'],
    queryFn: async () => {
      const { data } = await supabase
        .from('distributor_types')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: targetType === 'type',
  });

  const { data: distributors = [] } = useQuery({
    queryKey: ['distributors-for-targeting'],
    queryFn: async () => {
      const { data } = await supabase
        .from('distributors')
        .select('id, name')
        .order('name');
      return data || [];
    },
    enabled: targetType === 'specific' || targetType === 'parent',
  });

  const getOptions = () => {
    switch (targetType) {
      case 'type':
        return distributorTypes.map((t: any) => ({ value: t.id, label: `${t.name} (${t.code})` }));
      case 'specific':
      case 'parent':
        return distributors.map((d: any) => ({ value: d.id, label: d.name }));
      default:
        return [];
    }
  };

  const options = getOptions();

  const toggleId = (id: string) => {
    if (targetIds.includes(id)) {
      onTargetIdsChange(targetIds.filter(x => x !== id));
    } else {
      onTargetIdsChange([...targetIds, id]);
    }
  };

  const getLabel = (id: string) => {
    const opt = options.find(o => o.value === id);
    return opt?.label || id;
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <Label className="text-sm font-medium">🚚 Distributor Target Audience</Label>
      <Select value={targetType} onValueChange={(val) => { onTargetTypeChange(val); onTargetIdsChange([]); }}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {TARGET_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {targetType !== 'all' && (
        <div className="space-y-2">
          <Select onValueChange={toggleId}>
            <SelectTrigger><SelectValue placeholder={`Select ${targetType === 'type' ? 'type' : 'distributor'}...`} /></SelectTrigger>
            <SelectContent>
              {options.filter(o => !targetIds.includes(o.value)).map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {targetIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {targetIds.map(id => (
                <Badge key={id} variant="secondary" className="gap-1 text-xs">
                  {getLabel(id)}
                  <X size={12} className="cursor-pointer" onClick={() => toggleId(id)} />
                </Badge>
              ))}
            </div>
          )}
          {targetType === 'parent' && targetIds.length > 0 && (
            <p className="text-xs text-muted-foreground">All child distributors of selected parent(s) will also receive the notification.</p>
          )}
        </div>
      )}
    </div>
  );
}
