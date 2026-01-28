-- Add parent_id to categories for sub-categories (hierarchy support)
ALTER TABLE public.categories ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create brands table
CREATE TABLE public.brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- RLS policies for brands
CREATE POLICY "All authenticated users can view brands"
ON public.brands FOR SELECT
USING (true);

CREATE POLICY "Admin and managers can manage brands"
ON public.brands FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Add brand_id to products
ALTER TABLE public.products ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- Create refill_options table for fixed refill prices
CREATE TABLE public.refill_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    volume_ml integer NOT NULL,
    default_price numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on refill_options
ALTER TABLE public.refill_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for refill_options
CREATE POLICY "All authenticated users can view refill options"
ON public.refill_options FOR SELECT
USING (true);

CREATE POLICY "Admin and managers can manage refill options"
ON public.refill_options FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Add trigger for updated_at on refill_options
CREATE TRIGGER update_refill_options_updated_at
BEFORE UPDATE ON public.refill_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default main categories
INSERT INTO public.categories (id, name, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Devices', 'Vape devices and mods'),
    ('22222222-2222-2222-2222-222222222222', 'Coils', 'Replacement coils'),
    ('33333333-3333-3333-3333-333333333333', 'Flavours', 'E-liquids and flavours')
ON CONFLICT (id) DO NOTHING;

-- Insert Flavours sub-categories
INSERT INTO public.categories (id, name, description, parent_id) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Flavour Bottles', 'Packed bottles sold as products', '33333333-3333-3333-3333-333333333333'),
    ('55555555-5555-5555-5555-555555555555', 'Refills', 'Refill services', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- Insert default brands
INSERT INTO public.brands (name) VALUES
    ('Oxva'),
    ('Voopoo'),
    ('Caliburn'),
    ('Smok'),
    ('Vaporesso'),
    ('Geek Vape')
ON CONFLICT (name) DO NOTHING;

-- Insert default refill options
INSERT INTO public.refill_options (name, volume_ml, default_price) VALUES
    ('1 ml Refill', 1, 150),
    ('2 ml Refill', 2, 250),
    ('3 ml Refill', 3, 300);