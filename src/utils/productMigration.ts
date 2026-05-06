import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRODUCTS_DATA = [
  { name: 'ADUKU 20G', variants: ['ADUKU 100G', 'ADUKU 250G', 'ADUKU 500G'], rate: 342, unit: 'kg' },
  { name: 'DAKSHIN 30G', variants: ['DAKSHIN 250G'], rate: 209, unit: 'kg' },
  { name: 'KADAK GOLD', variants: ['1KG', '250G', '40G', '500G'] },
  { name: 'KADAK PYALI ADARAK', variants: ['250', '250G', '40G'] },
  { name: 'KADAK PYALI BLUE', variants: ['100G', '1KG', '20G', '250G', '40G', '500G'] },
  { name: 'KADAK PYALI ELACHI', variants: ['250G', '40G'] },
  { name: 'KADAK PYALI RL JAR', variants: ['1KG', '250G', '500G'] },
  { name: 'KADAK PYALI RL POUCH', variants: ['250G'] },
  { name: 'KADAK PYALI YELLOW', variants: ['100G', '1KG', '20G', '250G', '40G', '500G'] },
  { name: 'VAYU', variants: ['250G', '30G'] },
];

const getUnitFromVariant = (variant: string): string => {
  if (variant.includes('KG')) return 'kg';
  return 'grams';
};

export const migrateProducts = async () => {
  try {
    toast.loading('Starting product migration...');
    
    // Step 1: Clear related tables to avoid FK constraint errors
    // Delete children first, then parents
    // Inventory and operational child tables
    await supabase.from('van_live_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('van_inward_grn_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('van_closing_stock_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('van_return_grn_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('van_order_fulfillment').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('distributor_item_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Product child tables
    await supabase.from('product_schemes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Step 2: Delete all existing products
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) throw deleteError;
    
    // Step 2: Get or create default category
    let { data: categories, error: catError } = await supabase
      .from('product_categories')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (catError) throw catError;
    
    let categoryId = categories?.id;
    
    if (!categoryId) {
      const { data: newCat, error: newCatError } = await supabase
        .from('product_categories')
        .insert({ name: 'General', description: 'General category' })
        .select('id')
        .single();
      
      if (newCatError) throw newCatError;
      categoryId = newCat.id;
    }
    
    // Step 3: Insert products and their variants
    for (const product of PRODUCTS_DATA) {
      // Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          sku: `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate unique SKU
          category_id: categoryId,
          rate: product.rate || 0,
          unit: product.unit || 'grams',
          closing_stock: 0,
          is_active: true,
        })
        .select('id')
        .single();
      
      if (productError) {
        console.error(`Error inserting product ${product.name}:`, productError);
        continue;
      }
      
      // Insert variants for this product
      const variantsToInsert = product.variants.map((variant, idx) => ({
        product_id: newProduct.id,
        variant_name: variant,
        sku: `TEMP-${newProduct.id.substring(0, 8)}-${idx + 1}`,
        price: product.rate || 0,
        stock_quantity: 0,
        is_active: true,
      }));
      
      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert);
      
      if (variantsError) {
        console.error(`Error inserting variants for ${product.name}:`, variantsError);
      }
    }
    
    toast.dismiss();
    toast.success('Product migration completed successfully!');
    return true;
  } catch (error) {
    toast.dismiss();
    console.error('Migration error:', error);
    toast.error('Failed to migrate products. Check console for details.');
    return false;
  }
};
