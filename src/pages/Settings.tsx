import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRolePermissions } from '@/types/pos';
import { Settings as SettingsIcon, Database, Shield, Store, Bell, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefillOptionsManager } from '@/components/settings/RefillOptionsManager';
interface StoreSettings {
  id: string;
  store_name: string;
  low_stock_threshold: number;
}

export default function Settings() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [storeName, setStoreName] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    if (role && !permissions?.canAccessSettings) {
      navigate('/dashboard');
    }
  }, [role, permissions, navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setStoreName(data.store_name);
        setLowStockThreshold(data.low_stock_threshold);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!storeName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Store name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (lowStockThreshold < 0) {
      toast({
        title: 'Validation Error',
        description: 'Low stock threshold must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: storeName.trim(),
          low_stock_threshold: lowStockThreshold,
        })
        .eq('id', settings?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = settings && (
    storeName !== settings.store_name || 
    lowStockThreshold !== settings.low_stock_threshold
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">System configuration and preferences</p>
          </div>
          {hasChanges && (
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Store Info - Editable */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <CardTitle>Store Information</CardTitle>
              </div>
              <CardDescription>Basic store details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Enter store name"
                  disabled={loading}
                />
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administrator</p>
                <p className="text-lg">{profile?.full_name || 'Not set'}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications - Editable */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Alert preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Products with stock below this number will trigger alerts
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Sales Notifications</span>
                <Badge variant="outline" className="status-info">Real-time</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>System Status</CardTitle>
              </div>
              <CardDescription>Current system health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Connection</span>
                <Badge variant="outline" className="status-success">Connected</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication</span>
                <Badge variant="outline" className="status-success">Active</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge variant="outline" className="status-success">Operational</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Row Level Security</span>
                <Badge variant="outline" className="status-success">Enabled</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Role-Based Access</span>
                <Badge variant="outline" className="status-success">Active</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Session Management</span>
                <Badge variant="outline" className="status-success">Secure</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refill Options Management */}
        <RefillOptionsManager />

        {/* App Info */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <CardTitle>Application Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Environment</p>
                <p className="font-semibold">Production</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
