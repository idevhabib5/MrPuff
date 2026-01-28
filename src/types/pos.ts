export type AppRole = 'super_admin' | 'manager' | 'cashier';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface RefillOption {
  id: string;
  name: string;
  volume_ml: number;
  default_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category_id: string | null;
  brand_id: string | null;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  brand?: Brand;
}

export interface Sale {
  id: string;
  cashier_id: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  discount_amount: number;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  buying_price: number;
  subtotal: number;
  profit: number;
  discount_id?: string | null;
  discount_type?: 'percentage' | 'fixed' | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  original_subtotal?: number | null;
  created_at: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: Discount | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Permission helpers
export const ROLE_PERMISSIONS = {
  super_admin: {
    canManageUsers: true,
    canViewBuyingPrice: true,
    canViewProfit: true,
    canManageProducts: true,
    canViewReports: true,
    canOverrideTransactions: true,
    canAccessSettings: true,
    canViewActivityLogs: true,
  },
  manager: {
    canManageUsers: false,
    canViewBuyingPrice: true,
    canViewProfit: true,
    canManageProducts: true,
    canViewReports: true,
    canOverrideTransactions: false,
    canAccessSettings: false,
    canViewActivityLogs: false,
  },
  cashier: {
    canManageUsers: false,
    canViewBuyingPrice: false,
    canViewProfit: false,
    canManageProducts: false,
    canViewReports: false,
    canOverrideTransactions: false,
    canAccessSettings: false,
    canViewActivityLogs: false,
  },
} as const;

export const getRolePermissions = (role: AppRole) => ROLE_PERMISSIONS[role];

export const getRoleLabel = (role: AppRole): string => {
  const labels: Record<AppRole, string> = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    cashier: 'Cashier',
  };
  return labels[role];
};

export const getRoleColor = (role: AppRole): string => {
  const colors: Record<AppRole, string> = {
    super_admin: 'role-super-admin',
    manager: 'role-manager',
    cashier: 'role-cashier',
  };
  return colors[role];
};
