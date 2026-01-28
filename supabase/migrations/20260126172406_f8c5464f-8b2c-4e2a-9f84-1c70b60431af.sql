-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'cashier');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create product categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    buying_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES auth.users(id) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sale items table
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    buying_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin', 'manager')
    )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for categories (all authenticated can view, admin/manager can manage)
CREATE POLICY "All authenticated users can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and managers can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for products
CREATE POLICY "All authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and managers can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for sales
CREATE POLICY "Cashiers can view their own sales"
ON public.sales FOR SELECT
TO authenticated
USING (cashier_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "All authenticated can create sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "Admin can manage all sales"
ON public.sales FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for sale_items
CREATE POLICY "Users can view sale items for their sales"
ON public.sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = sale_id
        AND (s.cashier_id = auth.uid() OR public.is_admin_or_manager(auth.uid()))
    )
);

CREATE POLICY "All authenticated can create sale items"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for activity_logs
CREATE POLICY "Super admins can view all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated can create logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
('Disposables', 'Disposable vape devices'),
('E-Liquids', 'Vape juice and e-liquids'),
('Mods', 'Vape mods and box mods'),
('Accessories', 'Coils, tanks, batteries, and other accessories'),
('Starter Kits', 'Beginner-friendly vape kits');

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();