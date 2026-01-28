import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Product, Category, Brand, getRolePermissions } from '@/types/pos';
import { CategoryBrandManager } from '@/components/inventory/CategoryBrandManager';
import { Plus, Pencil, Trash2, Search, Package, Loader2, AlertTriangle, Tag } from 'lucide-react';

export default function Inventory() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    brand_id: '',
    buying_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
  });

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    if (!permissions?.canManageProducts) {
      navigate('/dashboard');
      return;
    }
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [role]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, parent_id), brands(id, name)')
      .order('name');

    if (error) {
      toast.error('Failed to load products');
      return;
    }

    const productsWithRelations = data?.map(p => ({
      ...p,
      buying_price: Number(p.buying_price),
      selling_price: Number(p.selling_price),
      category: p.categories as Category | undefined,
      brand: p.brands as Brand | undefined,
    })) || [];

    setProducts(productsWithRelations);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    setCategories((data as Category[]) || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    setBrands((data as Brand[]) || []);
  };

  // Get main categories and sub-categories
  const mainCategories = categories.filter(c => !c.parent_id);
  const getSubCategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || product.brand_id === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      category_id: '',
      brand_id: '',
      buying_price: '',
      selling_price: '',
      stock_quantity: '',
      low_stock_threshold: '10',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      buying_price: product.buying_price.toString(),
      selling_price: product.selling_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.selling_price) {
      toast.error('Name and selling price are required');
      return;
    }

    setSaving(true);

    const productData = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim() || null,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      buying_price: parseFloat(formData.buying_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Product added successfully');
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      toast.error('Failed to delete product');
      return;
    }

    toast.success('Product deleted');
    fetchProducts();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories & Brands</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-64 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {mainCategories.map((cat) => {
                    const subCats = getSubCategories(cat.id);
                    return (
                      <SelectGroup key={cat.id}>
                        <SelectLabel className="font-semibold">{cat.name}</SelectLabel>
                        <SelectItem value={cat.id}>{cat.name} (All)</SelectItem>
                        {subCats.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            ↳ {sub.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Table */}
            <Card className="shadow-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Package className="w-12 h-12 mb-4" />
                    <p>No products found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Barcode</TableHead>
                        {permissions?.canViewBuyingPrice && <TableHead>Buying Price</TableHead>}
                        <TableHead>Selling Price</TableHead>
                        {permissions?.canViewProfit && <TableHead>Profit</TableHead>}
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const profit = product.selling_price - product.buying_price;
                        const isLowStock = product.stock_quantity <= product.low_stock_threshold;

                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              {product.brand ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Tag className="w-3 h-3" />
                                  {product.brand.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {product.category?.name || 'Uncategorized'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {product.barcode || '-'}
                            </TableCell>
                            {permissions?.canViewBuyingPrice && (
                              <TableCell>{formatCurrency(product.buying_price)}</TableCell>
                            )}
                            <TableCell className="font-medium text-primary">
                              {formatCurrency(product.selling_price)}
                            </TableCell>
                            {permissions?.canViewProfit && (
                              <TableCell className={profit >= 0 ? 'text-profit' : 'text-loss'}>
                                {formatCurrency(profit)}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isLowStock && (
                                  <AlertTriangle className="w-4 h-4 text-warning" />
                                )}
                                <span className={isLowStock ? 'text-warning' : ''}>
                                  {product.stock_quantity}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(product)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(product)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <CategoryBrandManager onUpdate={() => {
              fetchCategories();
              fetchBrands();
              fetchProducts();
            }} />
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? 'Update the product details below'
                  : 'Fill in the details for the new product'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Elf Bar 5000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Scan or enter barcode"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((cat) => {
                        const subCats = getSubCategories(cat.id);
                        return (
                          <SelectGroup key={cat.id}>
                            <SelectLabel>{cat.name}</SelectLabel>
                            <SelectItem value={cat.id}>{cat.name}</SelectItem>
                            {subCats.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                ↳ {sub.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buying_price">Buying Price</Label>
                  <Input
                    id="buying_price"
                    type="number"
                    step="0.01"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingProduct ? (
                  'Update Product'
                ) : (
                  'Add Product'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
