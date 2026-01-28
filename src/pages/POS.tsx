import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Product, Category, CartItem, Discount, Brand } from '@/types/pos';
import { RefillQuickAdd } from '@/components/pos/RefillQuickAdd';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ShoppingCart,
  Package,
  Check,
  Loader2,
  Receipt,
  AlertCircle,
  Printer,
  X,
  Tag,
  Percent,
  DollarSign,
} from 'lucide-react';

interface ReceiptData {
  saleId: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  cashReceived?: number;
  changeAmount?: number;
  date: Date;
}

export default function POS() {
  const { user, role, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Cash payment state
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showCashDialog, setShowCashDialog] = useState(false);
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
    fetchDiscounts();
  }, []);

  useEffect(() => {
    if (showCashDialog && cashInputRef.current) {
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
  }, [showCashDialog]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, parent_id), brands(id, name)')
      .gt('stock_quantity', 0)
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

  const fetchDiscounts = async () => {
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setDiscounts(data as Discount[] || []);
  };

  // Get main categories and sub-categories for filtering
  const mainCategories = categories.filter(c => !c.parent_id);
  const getSubCategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || product.brand_id === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Handler for adding refills to cart
  const addRefillToCart = (name: string, price: number, volumeMl: number) => {
    // Create a virtual product for refill
    const refillProduct: Product = {
      id: `refill-${Date.now()}`,
      name,
      barcode: null,
      category_id: null,
      brand_id: null,
      buying_price: 0, // No buying price for refills
      selling_price: price,
      stock_quantity: 999, // Unlimited stock for service
      low_stock_threshold: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCart([...cart, { product: refillProduct, quantity: 1, discount: null }]);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error('Not enough stock available');
        return;
      }
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, discount: null }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.product.stock_quantity) {
          toast.error('Not enough stock available');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const applyDiscount = (productId: string, discount: Discount | null) => {
    setCart(cart.map((item) =>
      item.product.id === productId
        ? { ...item, discount }
        : item
    ));
    if (discount) {
      toast.success(`Applied "${discount.name}" discount`);
    }
  };

  const removeDiscount = (productId: string) => {
    setCart(cart.map((item) =>
      item.product.id === productId
        ? { ...item, discount: null }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived('');
  };

  const calculateItemDiscount = (item: CartItem): number => {
    if (!item.discount) return 0;
    
    const originalSubtotal = item.product.selling_price * item.quantity;
    
    if (item.discount.type === 'percentage') {
      return originalSubtotal * (item.discount.value / 100);
    } else {
      // Fixed discount per item
      return item.discount.value * item.quantity;
    }
  };

  const calculateItemSubtotal = (item: CartItem): number => {
    const originalSubtotal = item.product.selling_price * item.quantity;
    const discountAmount = calculateItemDiscount(item);
    return Math.max(0, originalSubtotal - discountAmount);
  };

  const calculateTotals = () => {
    const originalSubtotal = cart.reduce(
      (sum, item) => sum + item.product.selling_price * item.quantity,
      0
    );
    
    const totalDiscount = cart.reduce(
      (sum, item) => sum + calculateItemDiscount(item),
      0
    );
    
    const subtotal = originalSubtotal - totalDiscount;
    
    const totalProfit = cart.reduce(
      (sum, item) => {
        const itemSubtotal = calculateItemSubtotal(item);
        const itemCost = item.product.buying_price * item.quantity;
        return sum + (itemSubtotal - itemCost);
      },
      0
    );
    
    return { originalSubtotal, totalDiscount, subtotal, totalProfit };
  };

  const { originalSubtotal, totalDiscount, subtotal, totalProfit } = calculateTotals();

  const cashReceivedAmount = parseFloat(cashReceived) || 0;
  const changeAmount = cashReceivedAmount - subtotal;
  const isValidCashPayment = paymentMethod === 'card' || cashReceivedAmount >= subtotal;

  const handleInitiateCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!user || !role) {
      toast.error('You must be logged in to process sales');
      return;
    }

    if (paymentMethod === 'cash') {
      setCashReceived('');
      setShowCashDialog(true);
    } else {
      processCheckout();
    }
  };

  const handleCashCheckout = () => {
    if (cashReceivedAmount < subtotal) {
      toast.error('Insufficient cash received');
      return;
    }
    setShowCashDialog(false);
    processCheckout(cashReceivedAmount, changeAmount);
  };

  const processCheckout = async (cashAmount?: number, change?: number) => {
    setProcessing(true);

    try {
      // Create the sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          cashier_id: user!.id,
          total_amount: subtotal,
          total_profit: totalProfit,
          discount_amount: totalDiscount,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items with discount info
      const saleItems = cart.map((item) => {
        const originalItemSubtotal = item.product.selling_price * item.quantity;
        const discountAmount = calculateItemDiscount(item);
        const finalSubtotal = calculateItemSubtotal(item);
        const profit = finalSubtotal - (item.product.buying_price * item.quantity);
        const isRefill = item.product.id.startsWith('refill-');
        
        return {
          sale_id: sale.id,
          product_id: isRefill ? null : item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          buying_price: item.product.buying_price,
          subtotal: finalSubtotal,
          profit,
          discount_id: item.discount?.id || null,
          discount_type: item.discount?.type || null,
          discount_value: item.discount?.value || null,
          discount_amount: discountAmount,
          original_subtotal: originalItemSubtotal,
        };
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update stock quantities (skip refill items as they don't track stock)
      for (const item of cart) {
        const isRefill = item.product.id.startsWith('refill-');
        if (isRefill) continue;
        
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock_quantity: item.product.stock_quantity - item.quantity,
          })
          .eq('id', item.product.id);

        if (stockError) throw stockError;
      }

      // Set receipt data
      setReceiptData({
        saleId: sale.id,
        items: [...cart],
        subtotal: originalSubtotal,
        totalDiscount,
        total: subtotal,
        paymentMethod,
        cashReceived: cashAmount,
        changeAmount: change,
        date: new Date(),
      });

      toast.success('Sale completed successfully!');
      setShowReceipt(true);
      setCart([]);
      setCashReceived('');
      fetchProducts();
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDiscountBadge = (discount: Discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return formatCurrency(discount.value);
  };

  const quickCashAmounts = [
    Math.ceil(subtotal),
    Math.ceil(subtotal / 10) * 10,
    Math.ceil(subtotal / 50) * 50,
    Math.ceil(subtotal / 100) * 100,
  ].filter((v, i, a) => v >= subtotal && a.indexOf(v) === i).slice(0, 4);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col">
          {/* Quick Refills Section */}
          <div className="mb-4">
            <RefillQuickAdd onAddRefill={addRefillToCart} />
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
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
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products */}
          <ScrollArea className="flex-1">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="pos-grid-item"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                      {product.stock_quantity <= product.low_stock_threshold && (
                        <Badge variant="outline" className="status-warning text-xs">
                          Low
                        </Badge>
                      )}
                    </div>
                    {product.brand && (
                      <Badge variant="secondary" className="text-xs mb-1 gap-1">
                        <Tag className="w-2 h-2" />
                        {product.brand.name}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.category?.name || 'Uncategorized'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">
                        {formatCurrency(product.selling_price)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock_quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart */}
        <Card className="w-96 flex flex-col shadow-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Sale
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Cart Items */}
            <ScrollArea className="flex-1 px-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Click products to add them</p>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.selling_price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Discount Row */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {item.discount ? (
                            <Badge variant="secondary" className="gap-1 bg-profit/20 text-profit">
                              {item.discount.type === 'percentage' ? (
                                <Percent className="w-3 h-3" />
                              ) : (
                                <DollarSign className="w-3 h-3" />
                              )}
                              {item.discount.name}
                              <button
                                onClick={() => removeDiscount(item.product.id)}
                                className="ml-1 hover:text-profit/70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                                  <Tag className="w-3 h-3" />
                                  Add Discount
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2" align="start">
                                <div className="space-y-1">
                                  {discounts.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2 text-center">
                                      No discounts available
                                    </p>
                                  ) : (
                                    discounts.map((discount) => (
                                      <button
                                        key={discount.id}
                                        onClick={() => applyDiscount(item.product.id, discount)}
                                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary text-sm"
                                      >
                                        <span>{discount.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {formatDiscountBadge(discount)}
                                        </Badge>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        
                        <div className="text-right">
                          {item.discount && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(item.product.selling_price * item.quantity)}
                            </p>
                          )}
                          <p className="font-medium text-sm">
                            {formatCurrency(calculateItemSubtotal(item))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Checkout Section */}
            <div className="p-6 border-t border-border space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(originalSubtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-profit">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount
                    </span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="pos-total-display">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearCart}
                  disabled={cart.length === 0 || processing}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleInitiateCheckout}
                  disabled={cart.length === 0 || processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Complete Sale
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Payment Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Cash Payment
            </DialogTitle>
            <DialogDescription>
              Enter the amount received from the customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Total Display */}
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Amount Due</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(subtotal)}</p>
              {totalDiscount > 0 && (
                <p className="text-xs text-profit mt-1">
                  Includes {formatCurrency(totalDiscount)} discount
                </p>
              )}
            </div>

            {/* Cash Received Input */}
            <div className="space-y-2">
              <Label htmlFor="cash-received">Cash Received</Label>
              <Input
                ref={cashInputRef}
                id="cash-received"
                type="number"
                step="0.01"
                min="0"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Enter amount..."
                className="text-2xl h-14 text-center font-bold"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickCashAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCashReceived(amount.toString())}
                  className="text-xs"
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>

            {/* Change Display */}
            {cashReceivedAmount > 0 && (
              <div className={`p-4 rounded-lg border-2 ${
                changeAmount >= 0 
                  ? 'bg-profit/10 border-profit/30' 
                  : 'bg-destructive/10 border-destructive/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {changeAmount >= 0 ? (
                      <Check className="w-5 h-5 text-profit" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      {changeAmount >= 0 ? 'Change to Return' : 'Insufficient Amount'}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${
                    changeAmount >= 0 ? 'text-profit' : 'text-destructive'
                  }`}>
                    {changeAmount >= 0 ? formatCurrency(changeAmount) : formatCurrency(Math.abs(changeAmount)) + ' short'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCashDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCashCheckout}
              disabled={!isValidCashPayment || cashReceivedAmount === 0}
              className="min-w-32"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>

          {receiptData && (
            <div className="space-y-4 py-4" id="receipt-content">
              {/* Store Header */}
              <div className="text-center pb-4 border-b border-dashed">
                <div className="flex flex-col items-center gap-2 mb-1">
                  <img
                    src="/mrpuff-logo.png"
                    alt="MrPuff logo"
                    className="w-16 h-16 object-contain print:w-20 print:h-20"
                  />
                  <h2 className="text-xl font-bold">MrPuff POS</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {receiptData.date.toLocaleDateString()} {receiptData.date.toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receipt #{receiptData.saleId.slice(0, 8).toUpperCase()}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {receiptData.items.map((item) => (
                  <div key={item.product.id} className="text-sm">
                    <div className="flex justify-between">
                      <div>
                        <span>{item.product.name}</span>
                        <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                      </div>
                      <span>{formatCurrency(item.product.selling_price * item.quantity)}</span>
                    </div>
                    {item.discount && (
                      <div className="flex justify-between text-xs text-profit pl-4">
                        <span>
                          {item.discount.name} ({formatDiscountBadge(item.discount)})
                        </span>
                        <span>-{formatCurrency(calculateItemDiscount(item))}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(receiptData.subtotal)}</span>
                </div>
                
                {receiptData.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-profit">
                    <span>Total Discount</span>
                    <span>-{formatCurrency(receiptData.totalDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(receiptData.total)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <Badge variant="outline">
                    {receiptData.paymentMethod === 'cash' ? (
                      <><Banknote className="w-3 h-3 mr-1" /> Cash</>
                    ) : (
                      <><CreditCard className="w-3 h-3 mr-1" /> Card</>
                    )}
                  </Badge>
                </div>

                {receiptData.paymentMethod === 'cash' && receiptData.cashReceived && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cash Received</span>
                      <span>{formatCurrency(receiptData.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-profit">
                      <span>Change</span>
                      <span>{formatCurrency(receiptData.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-dashed">
                <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
                <p className="text-xs text-muted-foreground">Cashier: {profile?.full_name}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeReceipt}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
