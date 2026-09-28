export interface Product {
  id?: string;
  product_code?: string;
  product_name: string;
  category_name: string;
  variety?: string | null;
  description?: string | null;
  growth_stage?: string;
  plant_height?: number | null;
  current_stock: number;
  sale_price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  restored_at?: string | null;
}
