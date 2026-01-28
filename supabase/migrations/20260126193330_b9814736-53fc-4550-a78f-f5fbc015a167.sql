-- Make product_id nullable for service items like refills
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;

-- Update the foreign key to allow NULL values (it already does by default for foreign keys)
-- No additional changes needed for the foreign key itself