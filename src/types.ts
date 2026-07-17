export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  background_color: string;
  icon: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category_id: string;
  category?: string; // Sticking to optional mapped name for legacy compatibility
  price: number;
  cost: number;
  status: "Available" | "Sold Out" | "Out Of Stock" | "Seasonal" | "Coming Soon" | "Discontinued" | "Draft";
  popularity: number; // 1-5 star rating or index
  image?: string;
  description?: string;
  isVeg?: boolean;
  short_description?: string;
  sub_category?: string;
  discounted_price?: number;
  gst_percentage?: number;
  calories?: number;
  spice_level?: string;
  dietary_preference?: string;
  tags?: string[];
  timing_slot?: string;
  stock_type?: string;
  current_stock?: number;
  addons?: any[];
  removable_ingredients?: any[];
  images?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  currentQty: number;
  unit: string;
  reorderLevel: number;
  supplierId: string;
  unitPrice: number;
  supplierName?: string;
  lastUpdated?: string;
  whatsapp_status?: string;
  whatsapp_sent_at?: string;
  whatsapp_sid?: string;
  whatsapp_error?: string;
  voice_status?: string;
  voice_called_at?: string;
  voice_sid?: string;
  voice_error?: string;
  last_notification_type?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: any;
}

export interface Order {
  id: string; // e.g. #1042
  customerName: string;
  phone?: string;
  tableOrType: string; // Table 4, Takeaway, Delivery
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Completed" | "Pending" | "Accepted" | "Cancelled" | "Preparing" | "Ready" | "Served";
  payment_method?: string;
  payment_status?: string;
  special_instructions?: string;
  timestamp: string; // ISO date string
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  visitCount: number;
  totalSpent: number;
  lastOrderDate: string;
  notes: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  itemsSupplied: string[];
  pendingPayments: number;
}

export interface FinanceEntry {
  id: string;
  timestamp: string;
  type: "Income" | "Expense";
  category: "Order Revenue" | "Supplier Payment" | "Rent" | "Salaries" | "Utilities" | "Other";
  amount: number;
  description: string;
}

export interface RestaurantState {
  menu: MenuItem[];
  inventory: InventoryItem[];
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
  finances: FinanceEntry[];
}

export interface ChatMessage {
  id: string;
  sender: "owner" | "ai";
  text: string;
  timestamp: string;
  metadata?: {
    actionType?: "create_order" | "low_stock" | "finance_summary" | "supplier_payout" | "general";
    actionData?: any;
    confirmNeeded?: boolean;
    confirmed?: boolean;
  };
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  currentState: RestaurantState;
}

export interface ChatResponse {
  reply: string;
  updatedState?: RestaurantState;
  actionDetails?: {
    success: boolean;
    type: string;
    description: string;
  };
}
