import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Droplet, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { RefillOption } from '@/types/pos';

export function RefillOptionsManager() {
  const [refillOptions, setRefillOptions] = useState<RefillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<RefillOption | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    volume_ml: 0,
    default_price: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchRefillOptions();
  }, []);

  const fetchRefillOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('refill_options')
        .select('*')
        .order('volume_ml', { ascending: true });

      if (error) throw error;
      setRefillOptions(data || []);
    } catch (error) {
      console.error('Error fetching refill options:', error);
      toast({
        title: 'Error',
        description: 'Failed to load refill options',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (option?: RefillOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        name: option.name,
        volume_ml: option.volume_ml,
        default_price: option.default_price,
        is_active: option.is_active,
      });
    } else {
      setEditingOption(null);
      setFormData({
        name: '',
        volume_ml: 0,
        default_price: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.volume_ml <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Volume must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (formData.default_price < 0) {
      toast({
        title: 'Validation Error',
        description: 'Price cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingOption) {
        const { error } = await supabase
          .from('refill_options')
          .update({
            name: formData.name.trim(),
            volume_ml: formData.volume_ml,
            default_price: formData.default_price,
            is_active: formData.is_active,
          })
          .eq('id', editingOption.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Refill option updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('refill_options')
          .insert({
            name: formData.name.trim(),
            volume_ml: formData.volume_ml,
            default_price: formData.default_price,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Refill option created successfully',
        });
      }

      setDialogOpen(false);
      fetchRefillOptions();
    } catch (error) {
      console.error('Error saving refill option:', error);
      toast({
        title: 'Error',
        description: 'Failed to save refill option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this refill option?')) return;

    try {
      const { error } = await supabase
        .from('refill_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Refill option deleted successfully',
      });
      fetchRefillOptions();
    } catch (error) {
      console.error('Error deleting refill option:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete refill option',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (option: RefillOption) => {
    try {
      const { error } = await supabase
        .from('refill_options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;
      fetchRefillOptions();
    } catch (error) {
      console.error('Error toggling refill option:', error);
      toast({
        title: 'Error',
        description: 'Failed to update refill option',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-primary" />
            <CardTitle>Refill Options</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingOption ? 'Edit Refill Option' : 'Add Refill Option'}
                </DialogTitle>
                <DialogDescription>
                  {editingOption
                    ? 'Update the refill option details'
                    : 'Create a new refill option for the POS'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., 1ml Refill"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume_ml">Volume (ml)</Label>
                  <Input
                    id="volume_ml"
                    type="number"
                    min={1}
                    value={formData.volume_ml}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        volume_ml: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_price">Default Price (Rs)</Label>
                  <Input
                    id="default_price"
                    type="number"
                    min={0}
                    value={formData.default_price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        default_price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingOption ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Manage refill pricing options available in POS
        </CardDescription>
      </CardHeader>
      <CardContent>
        {refillOptions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No refill options configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refillOptions.map((option) => (
                <TableRow key={option.id}>
                  <TableCell className="font-medium">{option.name}</TableCell>
                  <TableCell>{option.volume_ml} ml</TableCell>
                  <TableCell>Rs {option.default_price}</TableCell>
                  <TableCell>
                    <Switch
                      checked={option.is_active}
                      onCheckedChange={() => handleToggleActive(option)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(option)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(option.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
