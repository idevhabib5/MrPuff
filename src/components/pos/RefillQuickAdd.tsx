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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefillOption } from '@/types/pos';
import { Droplet, Pencil, Loader2 } from 'lucide-react';

interface RefillQuickAddProps {
  onAddRefill: (name: string, price: number, volumeMl: number) => void;
}

export function RefillQuickAdd({ onAddRefill }: RefillQuickAddProps) {
  const [refillOptions, setRefillOptions] = useState<RefillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRefill, setSelectedRefill] = useState<RefillOption | null>(null);
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    fetchRefillOptions();
  }, []);

  const fetchRefillOptions = async () => {
    const { data, error } = await supabase
      .from('refill_options')
      .select('*')
      .eq('is_active', true)
      .order('volume_ml');

    if (error) {
      console.error('Error fetching refill options:', error);
      return;
    }

    setRefillOptions(data as RefillOption[] || []);
    setLoading(false);
  };

  const handleQuickAdd = (option: RefillOption) => {
    onAddRefill(option.name, Number(option.default_price), option.volume_ml);
    toast.success(`Added ${option.name}`);
  };

  const handleCustomPriceAdd = () => {
    if (!selectedRefill || !customPrice) return;
    
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    onAddRefill(
      `${selectedRefill.name} (Custom)`,
      price,
      selectedRefill.volume_ml
    );
    toast.success(`Added ${selectedRefill.name} at Rs ${price}`);
    setEditDialogOpen(false);
    setCustomPrice('');
    setSelectedRefill(null);
  };

  const openCustomPriceDialog = (option: RefillOption) => {
    setSelectedRefill(option);
    setCustomPrice(option.default_price.toString());
    setEditDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount}`;
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplet className="w-5 h-5 text-primary" />
            Quick Refills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {refillOptions.map((option) => (
              <div key={option.id} className="relative group">
                <Button
                  variant="outline"
                  className="w-full h-auto py-3 flex flex-col items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleQuickAdd(option)}
                >
                  <span className="font-bold text-lg">{option.volume_ml} ml</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatCurrency(Number(option.default_price))}
                  </Badge>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCustomPriceDialog(option);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Custom Refill Price
            </DialogTitle>
            <DialogDescription>
              Enter a custom price for {selectedRefill?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Default Price</p>
              <p className="text-2xl font-bold text-primary">
                {selectedRefill && formatCurrency(Number(selectedRefill.default_price))}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-price">Custom Price (Rs)</Label>
              <Input
                id="custom-price"
                type="number"
                step="1"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Enter custom price..."
                className="text-xl h-12 text-center font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomPriceAdd}>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
