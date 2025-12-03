
export interface Product {
  id: string;
  reference: string;
  name: string;
  color: string;
  colorHex?: string;
  imageUrl: string;
  description?: string;
  stocks: { [key: string]: number }; // Stores quantity per size. Ex: { "P": 10, "M": 5 }
  totalStock: number; // Helper for sorting/displaying
  price?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  size: string; // Added size to transaction record
  date: string;
  customerId?: string;
  customerName?: string;
}

export type ViewState = 'CATALOG' | 'LOGIN' | 'DASHBOARD' | 'INVENTORY' | 'ADD_PRODUCT' | 'TRANSACTIONS' | 'CUSTOMERS' | 'REPORTS';

export const SIZES = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3'];
