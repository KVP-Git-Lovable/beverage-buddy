-- packing_list_items.product_id was text while every related table uses uuid.
-- The atomic create RPC compares it against (jsonb->>'product_id')::uuid which raised
-- "operator does not exist: text = uuid". Convert the column to uuid for consistency.

ALTER TABLE public.packing_list_items
  ALTER COLUMN product_id TYPE uuid USING product_id::uuid;