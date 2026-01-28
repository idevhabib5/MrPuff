import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Category, Brand } from '@/types/pos';
import { Plus, Pencil, Trash2, FolderTree, Tag, Loader2 } from 'lucide-react';

interface CategoryBrandManagerProps {
  onUpdate?: () => void;
}

export function CategoryBrandManager({ onUpdate }: CategoryBrandManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: '',
  });
  
  // Brand dialog state
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [categoriesRes, brandsRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
    ]);

    if (categoriesRes.data) {
      setCategories(categoriesRes.data as Category[]);
    }
    if (brandsRes.data) {
      setBrands(brandsRes.data as Brand[]);
    }
    setLoading(false);
  };

  // Get main categories (no parent)
  const mainCategories = categories.filter(c => !c.parent_id);
  
  // Get sub-categories for a parent
  const getSubCategories = (parentId: string) => 
    categories.filter(c => c.parent_id === parentId);

  // Category handlers
  const openAddCategory = (parentId?: string) => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      parent_id: parentId || '',
    });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSaving(true);

    const categoryData = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      parent_id: categoryForm.parent_id || null,
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);
        if (error) throw error;
        toast.success('Category added');
      }

      setCategoryDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const subCategories = getSubCategories(category.id);
    if (subCategories.length > 0) {
      toast.error('Cannot delete category with sub-categories');
      return;
    }

    if (!confirm(`Delete "${category.name}"?`)) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      toast.error('Failed to delete category');
      return;
    }

    toast.success('Category deleted');
    fetchData();
    onUpdate?.();
  };

  // Brand handlers
  const openAddBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandDialogOpen(true);
  };

  const openEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandDialogOpen(true);
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }

    setSaving(true);

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({ name: brandName.trim() })
          .eq('id', editingBrand.id);
        if (error) throw error;
        toast.success('Brand updated');
      } else {
        const { error } = await supabase
          .from('brands')
          .insert({ name: brandName.trim() });
        if (error) throw error;
        toast.success('Brand added');
      }

      setBrandDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`Delete "${brand.name}"?`)) return;

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brand.id);

    if (error) {
      toast.error('Failed to delete brand. It may be in use by products.');
      return;
    }

    toast.success('Brand deleted');
    fetchData();
    onUpdate?.();
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Categories & Brands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="categories">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => openAddCategory()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <Accordion type="multiple" className="w-full">
                {mainCategories.map((category) => {
                  const subCats = getSubCategories(category.id);
                  
                  return (
                    <AccordionItem key={category.id} value={category.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <FolderTree className="w-4 h-4 text-primary" />
                          <span className="font-medium">{category.name}</span>
                          {subCats.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {subCats.length} sub
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-7 space-y-2">
                          <div className="flex items-center justify-between pb-2">
                            <span className="text-sm text-muted-foreground">
                              {category.description || 'No description'}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditCategory(category)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteCategory(category)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {subCats.map((subCat) => (
                            <div
                              key={subCat.id}
                              className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
                            >
                              <span className="text-sm">{subCat.name}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => openEditCategory(subCat)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteCategory(subCat)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => openAddCategory(category.id)}
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Sub-category
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {mainCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No categories yet. Add your first category!
                </p>
              )}
            </TabsContent>

            <TabsContent value="brands" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={openAddBrand}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Brand
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-medium">{brand.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditBrand(brand)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteBrand(brand)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {brands.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No brands yet. Add your first brand!
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {categoryForm.parent_id
                ? 'Add a sub-category under the selected parent'
                : 'Create a new main category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g., Devices, Coils, Flavours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select
                value={categoryForm.parent_id}
                onValueChange={(value) =>
                  setCategoryForm({ ...categoryForm, parent_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Main Category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Main Category)</SelectItem>
                  {mainCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingCategory ? (
                'Update Category'
              ) : (
                'Add Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </DialogTitle>
            <DialogDescription>
              Brands help organize products within categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name *</Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Oxva, Voopoo, Caliburn"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBrand} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingBrand ? (
                'Update Brand'
              ) : (
                'Add Brand'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
