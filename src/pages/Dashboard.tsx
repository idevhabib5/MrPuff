import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRolePermissions, getRoleLabel } from '@/types/pos';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
  totalProducts: number;
  lowStockCount: number;
  totalUsers: number;
}

export default function Dashboard() {
  const { role, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    fetchDashboardStats();
  }, [role]);

  const fetchDashboardStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's sales
      const { data: salesData, count: salesCount } = await supabase
        .from('sales')
        .select('total_amount, total_profit', { count: 'exact' })
        .gte('created_at', today.toISOString());

      const todayRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const todayProfit = salesData?.reduce((sum, sale) => sum + Number(sale.total_profit), 0) || 0;

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 10);

      // Fetch users count (only for super admin)
      let usersCount = 0;
      if (permissions?.canManageUsers) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        usersCount = count || 0;
      }

      setStats({
        todaySales: salesCount || 0,
        todayRevenue,
        todayProfit,
        totalProducts: productsCount || 0,
        lowStockCount: lowStockCount || 0,
        totalUsers: usersCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
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
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground">
            {role ? `Logged in as ${getRoleLabel(role)}` : 'Role not assigned - contact Super Admin'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Sales */}
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Sales
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySales}</div>
              <p className="text-xs text-muted-foreground">transactions today</p>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
              <p className="text-xs text-muted-foreground">total sales amount</p>
            </CardContent>
          </Card>

          {/* Today's Profit - Only for admin/manager */}
          {permissions?.canViewProfit && (
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Profit
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-profit" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-profit">
                  {formatCurrency(stats.todayProfit)}
                </div>
                <p className="text-xs text-muted-foreground">net profit today</p>
              </CardContent>
            </Card>
          )}

          {/* Total Products */}
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">items in inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section - Only for admin/manager */}
        {permissions?.canManageProducts && stats.lowStockCount > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <CardTitle className="text-warning">Low Stock Alert</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {stats.lowStockCount} product{stats.lowStockCount > 1 ? 's' : ''} have low stock levels.
                Check inventory to restock.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors shadow-card hover:shadow-glow"
            onClick={() => window.location.href = '/pos'}
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Open POS</h3>
                <p className="text-sm text-muted-foreground">Start a new sale</p>
              </div>
            </CardContent>
          </Card>

          {permissions?.canManageProducts && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors shadow-card hover:shadow-glow"
              onClick={() => window.location.href = '/inventory'}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Inventory</h3>
                  <p className="text-sm text-muted-foreground">Add or update products</p>
                </div>
              </CardContent>
            </Card>
          )}

          {permissions?.canManageUsers && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors shadow-card hover:shadow-glow"
              onClick={() => window.location.href = '/users'}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">{stats.totalUsers} team members</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
