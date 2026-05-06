CREATE TABLE IF NOT EXISTS public.product_data_import_staging (
  sku text PRIMARY KEY,
  gst_percentage numeric NOT NULL
);
TRUNCATE public.product_data_import_staging;