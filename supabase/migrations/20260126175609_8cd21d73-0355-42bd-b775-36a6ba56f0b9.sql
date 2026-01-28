-- Create store_settings table
CREATE TABLE public.store_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT NOT NULL DEFAULT 'VapeShop POS',
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view store settings
CREATE POLICY "All authenticated users can view store settings"
ON public.store_settings
FOR SELECT
USING (true);

-- Policy: Only super admins can update store settings
CREATE POLICY "Super admins can update store settings"
ON public.store_settings
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Policy: Only super admins can insert store settings
CREATE POLICY "Super admins can insert store settings"
ON public.store_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.store_settings (store_name, low_stock_threshold)
VALUES ('VapeShop POS', 10);