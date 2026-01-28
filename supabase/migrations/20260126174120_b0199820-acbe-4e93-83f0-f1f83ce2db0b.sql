-- Create discount_type enum
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

-- Create discounts table for pre-configured discounts
CREATE TABLE public.discounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type discount_type NOT NULL,
    value NUMERIC NOT NULL CHECK (value > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active discounts
CREATE POLICY "All authenticated users can view active discounts"
ON public.discounts
FOR SELECT
USING (is_active = true OR is_admin_or_manager(auth.uid()));

-- Admin and managers can manage discounts
CREATE POLICY "Admin and managers can manage discounts"
ON public.discounts
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_discounts_updated_at
    BEFORE UPDATE ON public.discounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add discount columns to sale_items for tracking applied discounts
ALTER TABLE public.sale_items
ADD COLUMN discount_id UUID REFERENCES public.discounts(id),
ADD COLUMN discount_type discount_type,
ADD COLUMN discount_value NUMERIC DEFAULT 0,
ADD COLUMN discount_amount NUMERIC DEFAULT 0,
ADD COLUMN original_subtotal NUMERIC;