import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Smile, Smartphone, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { RetailerTargetingFields } from '@/components/admin/RetailerTargetingFields';
import { FieldSalesTargetingFields } from '@/components/admin/FieldSalesTargetingFields';
import { DistributorTargetingFields } from '@/components/admin/DistributorTargetingFields';
import { Checkbox } from '@/components/ui/checkbox';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BroadcastNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const PORTAL_OPTIONS = [
  { value: 'field_sales_app', label: 'Field Sales App', icon: Smartphone },
  { value: 'customer_portal', label: 'Customer Portal', icon: Store },
  { value: 'distributor_portal', label: 'Distributor Portal', icon: Truck },
] as const;

export function BroadcastNotificationDialog({ open, onOpenChange, userId }: BroadcastNotificationDialogProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  
  // Customer portal targeting
  const [targetType, setTargetType] = useState('all');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  
  // Field sales targeting
  const [fieldSalesTargetType, setFieldSalesTargetType] = useState('all');
  const [fieldSalesTargetIds, setFieldSalesTargetIds] = useState<string[]>([]);
  
  // Distributor targeting
  const [distributorTargetType, setDistributorTargetType] = useState('all');
  const [distributorTargetIds, setDistributorTargetIds] = useState<string[]>([]);

  const togglePortal = (portal: string) => {
    setSelectedPortals(prev =>
      prev.includes(portal) ? prev.filter(p => p !== portal) : [...prev, portal]
    );
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSelectedPortals([]);
    setTargetType('all');
    setTargetIds([]);
    setFieldSalesTargetType('all');
    setFieldSalesTargetIds([]);
    setDistributorTargetType('all');
    setDistributorTargetIds([]);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('send_broadcast_notification', {
        p_title: title,
        p_message: message,
        p_actor_user_id: userId,
        p_target_type: selectedPortals.includes('customer_portal') ? targetType : 'all',
        p_target_ids: selectedPortals.includes('customer_portal') && targetType !== 'all' ? targetIds : null,
        p_portals: selectedPortals,
        p_field_sales_target_type: selectedPortals.includes('field_sales_app') ? fieldSalesTargetType : 'all',
        p_field_sales_target_ids: selectedPortals.includes('field_sales_app') && fieldSalesTargetType !== 'all' ? fieldSalesTargetIds : null,
        p_distributor_target_type: selectedPortals.includes('distributor_portal') ? distributorTargetType : 'all',
        p_distributor_target_ids: selectedPortals.includes('distributor_portal') && distributorTargetType !== 'all' ? distributorTargetIds : null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`Broadcast sent to ${count} user(s)`);
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send broadcast');
    },
  });

  const showRetailerTargeting = selectedPortals.includes('customer_portal');
  const showFieldSalesTargeting = selectedPortals.includes('field_sales_app');
  const showDistributorTargeting = selectedPortals.includes('distributor_portal');

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    selectedPortals.length > 0 &&
    (!showRetailerTargeting || targetType === 'all' || targetIds.length > 0) &&
    (!showFieldSalesTargeting || fieldSalesTargetType === 'all' || fieldSalesTargetIds.length > 0) &&
    (!showDistributorTargeting || distributorTargetType === 'all' || distributorTargetIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send size={18} /> Push Notification
          </DialogTitle>
          <DialogDescription>
            Send a one-time broadcast notification. Use {'{retailer_name}'} for Customer Portal or {'{user_name}'} for other portals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Portal Selection */}
          <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <Label className="text-sm font-medium">📡 Target Portal(s)</Label>
            <div className="grid grid-cols-1 gap-2">
              {PORTAL_OPTIONS.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors hover:bg-accent/50"
                  style={{
                    borderColor: selectedPortals.includes(value) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    backgroundColor: selectedPortals.includes(value) ? 'hsl(var(--primary) / 0.08)' : undefined,
                  }}
                >
                  <Checkbox
                    checked={selectedPortals.includes(value)}
                    onCheckedChange={() => togglePortal(value)}
                  />
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            {selectedPortals.length === 0 && (
              <p className="text-xs text-destructive">Select at least one portal</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-title">Title</Label>
            <Input
              id="broadcast-title"
              placeholder="e.g. New Scheme Available!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-message">Message</Label>
            <div className="relative">
              <Textarea
                id="broadcast-message"
                placeholder="e.g. Hi {retailer_name}, check out our new festive discount scheme..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 bottom-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Smile size={16} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none" side="top" align="end">
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: any) => setMessage(prev => prev + emoji.native)}
                    theme="light"
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Dynamic targeting based on selected portals */}
          {showRetailerTargeting && (
            <RetailerTargetingFields
              targetType={targetType}
              targetIds={targetIds}
              onTargetTypeChange={setTargetType}
              onTargetIdsChange={setTargetIds}
            />
          )}

          {showFieldSalesTargeting && (
            <FieldSalesTargetingFields
              targetType={fieldSalesTargetType}
              targetIds={fieldSalesTargetIds}
              onTargetTypeChange={setFieldSalesTargetType}
              onTargetIdsChange={setFieldSalesTargetIds}
            />
          )}

          {showDistributorTargeting && (
            <DistributorTargetingFields
              targetType={distributorTargetType}
              targetIds={distributorTargetIds}
              onTargetTypeChange={setDistributorTargetType}
              onTargetIdsChange={setDistributorTargetIds}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!canSend || sendMutation.isPending}
            className="gap-2"
          >
            {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
