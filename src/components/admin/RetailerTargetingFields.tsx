import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface RetailerTargetingFieldsProps {
  targetType: string;
  targetIds: string[];
  onTargetTypeChange: (val: string) => void;
  onTargetIdsChange: (ids: string[]) => void;
}

const TARGET_TYPES = [
  { value: 'all', label: 'All Portal Retailers' },
  { value: 'beat', label: 'By Beat' },
  { value: 'territory', label: 'By Territory' },
  { value: 'category', label: 'By Category' },
  { value: 'owner', label: 'By Sales Rep' },
];

export function RetailerTargetingFields({
  targetType,
  targetIds,
  onTargetTypeChange,
  onTargetIdsChange,
}: RetailerTargetingFieldsProps) {
  const { data: beats = [] } = useQuery({
    queryKey: ['beats-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('beats')
        .select('id, beat_name')
        .eq('is_active', true)
        .order('beat_name');
      return data || [];
    },
    enabled: targetType === 'beat',
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('territories')
        .select('id, name')
        .order('name');
      return data || [];
    },
    enabled: targetType === 'territory',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['retailer-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('retailers')
        .select('category')
        .not('category', 'is', null);
      const unique = [...new Set((data || []).map((r: any) => r.category).filter(Boolean))];
      return unique.sort();
    },
    enabled: targetType === 'category',
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ['sales-reps-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      return data || [];
    },
    enabled: targetType === 'owner',
  });

  const getOptions = () => {
    switch (targetType) {
      case 'beat':
        return beats.map((b: any) => ({ value: b.id, label: b.beat_name }));
      case 'territory':
        return territories.map((t: any) => ({ value: t.id, label: t.name }));
      case 'category':
        return categories.map((c: string) => ({ value: c, label: c }));
      case 'owner':
        return salesReps.map((p: any) => ({ value: p.id, label: p.full_name || 'Unnamed' }));
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
      <Label className="text-sm font-medium">🎯 Retailer Target Audience</Label>
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
            <SelectTrigger><SelectValue placeholder={`Select ${targetType}...`} /></SelectTrigger>
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
        </div>
      )}
    </div>
  );
}
