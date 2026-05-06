
INSERT INTO storage.buckets (id, name, public) VALUES
  ('employee-photos', 'employee-photos', false),
  ('attendance-photos', 'attendance-photos', false),
  ('visit-photos', 'visit-photos', false),
  ('visits', 'visits', false),
  ('expense-bills', 'expense-bills', false),
  ('pm-attachments', 'pm-attachments', false),
  ('pm-knowledge', 'pm-knowledge', false),
  ('user-attachments', 'user-attachments', false),
  ('profile-attachments', 'profile-attachments', false),
  ('distributor-attachments', 'distributor-attachments', false),
  ('retailer-photos', 'retailer-photos', false),
  ('product-photos', 'product-photos', false),
  ('branding-photos', 'branding-photos', false),
  ('branding-documents', 'branding-documents', false),
  ('delivery-proofs', 'delivery-proofs', false),
  ('order-documents', 'order-documents', false),
  ('employee-docs', 'employee-docs', false),
  ('social-posts', 'social-posts', false),
  ('invoice-templates', 'invoice-templates', false),
  ('company-assets', 'company-assets', true),
  ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for public buckets
DO $$ BEGIN
  CREATE POLICY "Public read for public buckets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('company-assets','invoices'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can read all private buckets in this app
DO $$ BEGIN
  CREATE POLICY "Authenticated can read app buckets"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN (
      'employee-photos','attendance-photos','visit-photos','visits',
      'expense-bills','pm-attachments','pm-knowledge','user-attachments',
      'profile-attachments','distributor-attachments','retailer-photos',
      'product-photos','branding-photos','branding-documents',
      'delivery-proofs','order-documents','employee-docs','social-posts',
      'invoice-templates','company-assets','invoices'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can insert app buckets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN (
      'employee-photos','attendance-photos','visit-photos','visits',
      'expense-bills','pm-attachments','pm-knowledge','user-attachments',
      'profile-attachments','distributor-attachments','retailer-photos',
      'product-photos','branding-photos','branding-documents',
      'delivery-proofs','order-documents','employee-docs','social-posts',
      'invoice-templates','company-assets','invoices'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update app buckets"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN (
      'employee-photos','attendance-photos','visit-photos','visits',
      'expense-bills','pm-attachments','pm-knowledge','user-attachments',
      'profile-attachments','distributor-attachments','retailer-photos',
      'product-photos','branding-photos','branding-documents',
      'delivery-proofs','order-documents','employee-docs','social-posts',
      'invoice-templates','company-assets','invoices'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete app buckets"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id IN (
      'employee-photos','attendance-photos','visit-photos','visits',
      'expense-bills','pm-attachments','pm-knowledge','user-attachments',
      'profile-attachments','distributor-attachments','retailer-photos',
      'product-photos','branding-photos','branding-documents',
      'delivery-proofs','order-documents','employee-docs','social-posts',
      'invoice-templates','company-assets','invoices'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
