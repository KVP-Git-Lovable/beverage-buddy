CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    CASE NEW.delivery_status
      WHEN 'in_packing_list' THEN
        NEW.status := 'processing';
      WHEN 'dispatched' THEN
        NEW.status := 'dispatched';
        -- Auto-create notification for customer portal
        INSERT INTO public.notifications (retailer_id, title, message, type, related_table, related_id, target_portal)
        VALUES (
          NEW.retailer_id,
          'Order Out for Delivery',
          'Your order #' || COALESCE(NEW.invoice_number, LEFT(NEW.id::text, 8)) || ' is out for delivery. Please keep the payment ready.',
          'order_status',
          'orders',
          NEW.id::text,
          'customer_portal'
        );
      WHEN 'delivered' THEN
        NEW.status := 'delivered';
      ELSE
        NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;