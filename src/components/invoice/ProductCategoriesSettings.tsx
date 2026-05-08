import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, X, Save, Loader2, Tag, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Category {
  name: string;
  subcategories: string[];
}

interface CategoriesJson {
  categories: Category[];
}

const PREDEFINED_CATEGORIES = ['Beverages', 'Dairy', 'Snacks', 'Processed Food', 'Personal Care', 'Home Care', 'Confectionery', 'Spices & Condiments'];

const PREDEFINED_SUBCATEGORIES: Record<string, string[]> = {
  'Beverages': ['Tea', 'Coffee', 'Milk', 'Malt', 'Juice', 'Soft Drinks', 'Energy Drinks', 'Water'],
  'Dairy': ['Milk', 'Curd', 'Butter', 'Cheese', 'Paneer', 'Ghee', 'Ice Cream'],
  'Snacks': ['Chips', 'Namkeen', 'Biscuits', 'Cookies', 'Nuts', 'Popcorn'],
  'Processed Food': ['Nuggets', 'Sausages', 'Noodles', 'Pasta', 'Ready to Eat', 'Frozen Food'],
  'Personal Care': ['Soap', 'Shampoo', 'Toothpaste', 'Cream', 'Lotion', 'Deodorant'],
  'Home Care': ['Detergent', 'Cleaner', 'Freshener', 'Dishwash'],
  'Confectionery': ['Chocolates', 'Candies', 'Gum', 'Toffees'],
  'Spices & Condiments': ['Haldi', 'Mirch', 'Jeera', 'Dhania', 'Garam Masala', 'Salt'],
};

export default function ProductCategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubInputs, setNewSubInputs] = useState<Record<number, string>>({});
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get company
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (!company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);

      // Get existing categories
      const { data } = await supabase
        .from('company_product_categories')
        .select('*')
        .eq('company_id', company.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingId(Number(data.id));
        const json = data.categories_json as unknown as CategoriesJson;
        if (json?.categories) {
          setCategories(json.categories);
        }
      }
    } catch (err) {
      console.error('Error fetching product categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = (name: string) => {
    if (!name.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: 'Category already exists', variant: 'destructive' });
      return;
    }
    const suggestions = PREDEFINED_SUBCATEGORIES[name] || [];
    setCategories(prev => [...prev, { name: name.trim(), subcategories: suggestions.slice(0, 3) }]);
    setAddCategoryOpen(false);
    setCustomCategoryInput('');
  };

  const removeCategory = (index: number) => {
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  const updateCategoryName = (index: number, name: string) => {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, name } : c));
  };

  const addSubcategory = (catIndex: number, sub: string) => {
    if (!sub.trim()) return;
    setCategories(prev => prev.map((c, i) => {
      if (i !== catIndex) return c;
      if (c.subcategories.some(s => s.toLowerCase() === sub.trim().toLowerCase())) return c;
      return { ...c, subcategories: [...c.subcategories, sub.trim()] };
    }));
    setNewSubInputs(prev => ({ ...prev, [catIndex]: '' }));
  };

  const removeSubcategory = (catIndex: number, subIndex: number) => {
    setCategories(prev => prev.map((c, i) => {
      if (i !== catIndex) return c;
      return { ...c, subcategories: c.subcategories.filter((_, si) => si !== subIndex) };
    }));
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({ title: 'No company found', variant: 'destructive' });
      return;
    }

    if (categories.length === 0) {
      toast({ title: 'Add at least 1 category', variant: 'destructive' });
      return;
    }

    const invalid = categories.find(c => !c.name.trim() || c.subcategories.length === 0);
    if (invalid) {
      toast({ title: `Category "${invalid.name || 'Unnamed'}" needs at least 1 subcategory`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const jsonData: CategoriesJson = { categories };

      if (existingId) {
        const { error } = await supabase
          .from('company_product_categories')
          .update({ categories_json: jsonData as any })
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_product_categories')
          .insert({ company_id: companyId, categories_json: jsonData as any })
          .select('id')
          .single();
        if (error) throw error;
        if (data) setExistingId(Number(data.id));
      }

      toast({ title: 'Product categories saved successfully!' });
    } catch (err: any) {
      console.error('Error saving categories:', err);
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = PREDEFINED_CATEGORIES.filter(
    pc => !categories.some(c => c.name.toLowerCase() === pc.toLowerCase())
  );

  const getSuggestedSubs = (categoryName: string, existing: string[]) => {
    const subs = PREDEFINED_SUBCATEGORIES[categoryName] || [];
    return subs.filter(s => !existing.some(e => e.toLowerCase() === s.toLowerCase()));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Product Categories & Offerings
            </CardTitle>
            <CardDescription>
              Define your product categories and subcategories. This data will be used for retailer matching and scoring.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => addCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Custom category..."
                        value={customCategoryInput}
                        onChange={e => setCustomCategoryInput(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            addCategory(customCategoryInput);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => addCategory(customCategoryInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No categories added yet. Click "Add Category" to get started.</p>
          </div>
        ) : (
          categories.map((cat, catIndex) => {
            const suggestedSubs = getSuggestedSubs(cat.name, cat.subcategories);
            return (
              <Card key={catIndex} className="border bg-muted/30">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Category</Label>
                    <Input
                      value={cat.name}
                      onChange={e => updateCategoryName(catIndex, e.target.value)}
                      className="h-9 font-medium"
                      placeholder="Category name"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCategory(catIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Subcategory pills */}
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.map((sub, subIndex) => (
                      <span
                        key={subIndex}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        {sub}
                        <button
                          onClick={() => removeSubcategory(catIndex, subIndex)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Suggested subcategories */}
                  {suggestedSubs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-1 self-center">Suggestions:</span>
                      {suggestedSubs.slice(0, 5).map(sub => (
                        <button
                          key={sub}
                          className="text-xs border border-dashed border-muted-foreground/30 rounded-full px-2 py-0.5 hover:bg-accent hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
                          onClick={() => addSubcategory(catIndex, sub)}
                        >
                          + {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add custom subcategory */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add subcategory..."
                      value={newSubInputs[catIndex] || ''}
                      onChange={e => setNewSubInputs(prev => ({ ...prev, [catIndex]: e.target.value }))}
                      className="h-8 text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addSubcategory(catIndex, newSubInputs[catIndex] || '');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={() => addSubcategory(catIndex, newSubInputs[catIndex] || '')}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
