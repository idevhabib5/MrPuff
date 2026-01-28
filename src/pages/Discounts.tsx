import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Discount } from '@/types/pos';
import {
  Plus,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  Tag,
  Loader2,
} from 'lucide-react';

export default function Discounts() {
  const { user, role } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');

  const canManage = role === 'super_admin' || role === 'manager';

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load discounts');
      return;
    }

    setDiscounts(data as Discount[] || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setType('percentage');
    setValue('');
    setEditingDiscount(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setName(discount.name);
    setType(discount.type);
    setValue(discount.value.toString());
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a discount name');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Please enter a valid value greater than 0');
      return;
    }

    if (type === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    setSaving(true);

    try {
      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update({
            name: name.trim(),
            type,
            value: numValue,
          })
          .eq('id', editingDiscount.id);

        if (error) throw error;
        toast.success('Discount updated successfully');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert({
            name: name.trim(),
            type,
            value: numValue,
            created_by: user!.id,
          });

        if (error) throw error;
        toast.success('Discount created successfully');
      }

      setShowDialog(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (discount: Discount) => {
    const { error } = await supabase
      .from('discounts')
      .update({ is_active: !discount.is_active })
      .eq('id', discount.id);

    if (error) {
      toast.error('Failed to update discount status');
      return;
    }

    toast.success(`Discount ${discount.is_active ? 'deactivated' : 'activated'}`);
    fetchDiscounts();
  };

  const handleDelete = async (discount: Discount) => {
    if (!confirm(`Are you sure you want to delete "${discount.name}"?`)) return;

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discount.id);

    if (error) {
      toast.error('Failed to delete discount');
      return;
    }

    toast.success('Discount deleted');
    fetchDiscounts();
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(discount.value);
  };

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have permission to manage discounts.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Discount Management</h1>
            <p className="text-muted-foreground">
              Create and manage pre-configured discounts for products
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Discount
          </Button>
        </div>

        {/* Discounts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Discount Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : discounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Tag className="w-10 h-10 mb-2 opacity-50" />
                <p>No discounts created yet</p>
                <p className="text-sm">Create your first discount preset</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-medium">{discount.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {discount.type === 'percentage' ? (
                            <><Percent className="w-3 h-3" /> Percentage</>
                          ) : (
                            <><DollarSign className="w-3 h-3" /> Fixed</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatDiscountValue(discount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={discount.is_active}
                            onCheckedChange={() => toggleActive(discount)}
                          />
                          <span className={discount.is_active ? 'text-profit' : 'text-muted-foreground'}>
                            {discount.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(discount)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(discount)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? 'Edit Discount' : 'Create Discount'}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? 'Update the discount preset details'
                : 'Create a new discount preset that cashiers can apply to products'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Discount Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Senior Discount, Employee Discount"
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'percentage' | 'fixed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Fixed Amount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                {type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
              </Label>
              <div className="relative">
                <Input
                  id="value"
                  type="number"
                  step={type === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={type === 'percentage' ? '100' : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'percentage' ? 'e.g., 10' : 'e.g., 5.00'}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {type === 'percentage' ? '%' : '$'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDiscount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
