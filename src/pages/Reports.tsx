import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRolePermissions } from '@/types/pos';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Loader2,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface ReportStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgOrderValue: number;
}

interface DailySales {
  date: string;
  revenue: number;
  profit: number;
  count: number;
}

interface CategorySales {
  name: string;
  value: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Reports() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgOrderValue: 0,
  });
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    if (!permissions?.canViewReports) {
      navigate('/dashboard');
      return;
    }
    fetchReportData();
  }, [role, period]);

  const getDateRange = () => {
    const today = new Date();
    switch (period) {
      case 'daily':
        return { start: subDays(today, 7), end: today };
      case 'weekly':
        return { start: startOfWeek(subDays(today, 28)), end: endOfWeek(today) };
      case 'monthly':
        return { start: startOfMonth(subDays(today, 90)), end: endOfMonth(today) };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Fetch sales in date range
      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount, total_profit, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (sales) {
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
        const totalProfit = sales.reduce((sum, s) => sum + Number(s.total_profit), 0);

        setStats({
          totalSales: sales.length,
          totalRevenue,
          totalProfit,
          avgOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
        });

        // Group by date for chart
        const salesByDate = new Map<string, { revenue: number; profit: number; count: number }>();
        
        sales.forEach((sale) => {
          const dateKey = format(new Date(sale.created_at), 'MMM d');
          const existing = salesByDate.get(dateKey) || { revenue: 0, profit: 0, count: 0 };
          salesByDate.set(dateKey, {
            revenue: existing.revenue + Number(sale.total_amount),
            profit: existing.profit + Number(sale.total_profit),
            count: existing.count + 1,
          });
        });

        const chartData = Array.from(salesByDate.entries()).map(([date, data]) => ({
          date,
          ...data,
        }));

        setDailySales(chartData);
      }

      // Fetch sales by category
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('subtotal, products(category_id, categories(name))')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (saleItems) {
        const categoryTotals = new Map<string, number>();
        
        saleItems.forEach((item: any) => {
          const categoryName = item.products?.categories?.name || 'Uncategorized';
          const existing = categoryTotals.get(categoryName) || 0;
          categoryTotals.set(categoryName, existing + Number(item.subtotal));
        });

        const categoryData = Array.from(categoryTotals.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setCategorySales(categoryData);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Sales analytics and profit reports</p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="daily">Last 7 Days</TabsTrigger>
              <TabsTrigger value="weekly">Last 4 Weeks</TabsTrigger>
              <TabsTrigger value="monthly">Last 3 Months</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Sales
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSales}</div>
                  <p className="text-xs text-muted-foreground">transactions</p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">gross sales</p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Profit
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-profit" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-profit">
                    {formatCurrency(stats.totalProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground">net profit</p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Order Value
                  </CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
                  <p className="text-xs text-muted-foreground">per transaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Revenue & Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          name="Revenue"
                        />
                        <Bar
                          dataKey="profit"
                          fill="hsl(var(--profit))"
                          radius={[4, 4, 0, 0]}
                          name="Profit"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {categorySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySales}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {categorySales.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No sales data for this period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
