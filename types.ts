
export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'voided';

export type OrderType = 'dine-in' | 'takeout' | 'delivery';
export type PaymentMethod = 'card' | 'cash' | 'gift-card' | 'manual-entry';
export type PaymentStatus = 'paid' | 'unpaid' | 'partially-paid' | 'refunded' | 'voided';
export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen';

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: Modifier[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  prepTimeMinutes: number;
  inventoryCount: number;
  lowStockThreshold: number;
  modifierGroups?: ModifierGroup[];
  allergyTags?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
}

export interface SelectedModifier {
  groupId: string;
  modifierId: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  notes?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  shiftLabel: string;
  status: 'clocked-in' | 'break' | 'offline';
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  tax: number;
  deliveryFee?: number;
  tip: number;
  total: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  completedAt?: string;
  estimatedTime: string;
  notes?: string;
  splitPayment?: boolean;
  tenderedCash?: number;
  changeDue?: number;
  receiptPrintedAt?: string;
  receiptSentAt?: string;
  staffId?: string;
  staffName?: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  theme: ThemeName;
  currency: string;
  taxRate: number;
  deliveryFee: number;
  minOrder: number;
  address: string;
  phone: string;
  email: string;
  hours: string;
  story: string;
  defaultTipOptions: number[];
}

export interface BusinessPreset {
  id: string;
  name: string;
  description: string;
  tenantConfig: TenantConfig;
  menu: MenuItem[];
  orders: Order[];
}

export type ThemeName =
  | 'Retail Aurora'
  | 'Cafe Cream'
  | 'Studio Pop'
  | 'Green Grocer'
  | 'Luxury Mono'
  | 'Midnight Mint'
  | 'Cyber Noir';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  accent: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  body: string;
  muted: string;
}
