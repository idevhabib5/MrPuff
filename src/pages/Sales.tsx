import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sale, SaleItem, getRolePermissions } from '@/types/pos';
import { Search, Receipt, Loader2, Calendar, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';

interface SaleWithProfile extends Sale {
  profiles?: { full_name: string } | null;
}

export default function Sales() {
  const { role } = useAuth();
  const [sales, setSales] = useState<SaleWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleWithProfile | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    // First fetch sales
    const { data: salesData, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }

    // Fetch cashier profiles
    const cashierIds = [...new Set(salesData?.map(s => s.cashier_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', cashierIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const salesWithProfiles = salesData?.map(sale => ({
      ...sale,
      total_amount: Number(sale.total_amount),
      total_profit: Number(sale.total_profit),
      discount_amount: Number(sale.discount_amount || 0),
      profiles: profilesMap.get(sale.cashier_id) || null,
    })) || [];

    setSales(salesWithProfiles);
    setLoading(false);
  };

  const openSaleDetails = async (sale: SaleWithProfile) => {
    setSelectedSale(sale);
    setDialogOpen(true);

    const { data } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id)
      .order('created_at');

    const items = data?.map(item => ({
      ...item,
      unit_price: Number(item.unit_price),
      buying_price: Number(item.buying_price),
      subtotal: Number(item.subtotal),
      profit: Number(item.profit),
    })) || [];

    setSaleItems(items);
  };

  const filteredSales = sales.filter((sale) => {
    const searchLower = searchQuery.toLowerCase();
    const cashierName = sale.profiles?.full_name?.toLowerCase() || '';
    const saleId = sale.id.toLowerCase();
    return cashierName.includes(searchLower) || saleId.includes(searchLower);
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">View and track all sales transactions</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by cashier or sale ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sales Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Receipt className="w-12 h-12 mb-4" />
                <p>No sales found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    {permissions?.canViewProfit && <TableHead>Profit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openSaleDetails(sale)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(sale.created_at), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{sale.profiles?.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 w-fit"
                        >
                          {sale.payment_method === 'cash' ? (
                            <Banknote className="w-3 h-3" />
                          ) : (
                            <CreditCard className="w-3 h-3" />
                          )}
                          {sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                      {permissions?.canViewProfit && (
                        <TableCell className="text-profit font-medium">
                          {formatCurrency(sale.total_profit)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sale Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Sale Details
              </DialogTitle>
              <DialogDescription>
                {selectedSale && format(new Date(selectedSale.created_at), 'MMMM d, yyyy h:mm a')}
              </DialogDescription>
            </DialogHeader>

            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cashier</p>
                    <p className="font-medium">{selectedSale.profiles?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <Badge variant="outline" className="mt-1">
                      {selectedSale.payment_method}
                    </Badge>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product_name}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(selectedSale.total_amount)}
                    </span>
                  </div>
                  {permissions?.canViewProfit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit</span>
                      <span className="text-profit font-medium">
                        {formatCurrency(selectedSale.total_profit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
