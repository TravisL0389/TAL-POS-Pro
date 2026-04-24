import { CartItem } from '../types';

export interface OrderSummaryInput {
  items: CartItem[];
  taxRate: number;
  discount?: number;
  tip?: number;
  deliveryFee?: number;
}

export interface OrderSummary {
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  tax: number;
  tip: number;
  deliveryFee: number;
  total: number;
}

export const roundToCents = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const formatPrice = (amount: number, currency: string = '$'): string => {
  return `${currency}${roundToCents(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const getCartItemTotal = (item: CartItem): number => {
  const modifiersTotal = item.selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0);
  return roundToCents((item.basePrice + modifiersTotal) * item.quantity);
};

export const calculateSubtotal = (items: CartItem[]): number => {
  return roundToCents(items.reduce((sum, item) => sum + getCartItemTotal(item), 0));
};

export const calculateOrderSummary = ({
  items,
  taxRate,
  discount = 0,
  tip = 0,
  deliveryFee = 0,
}: OrderSummaryInput): OrderSummary => {
  const subtotal = calculateSubtotal(items);
  const safeDiscount = Math.min(roundToCents(discount), subtotal);
  const taxableSubtotal = roundToCents(Math.max(0, subtotal - safeDiscount));
  const tax = roundToCents(taxableSubtotal * taxRate);
  const safeTip = roundToCents(Math.max(0, tip));
  const safeDeliveryFee = roundToCents(Math.max(0, deliveryFee));

  return {
    subtotal,
    discount: safeDiscount,
    taxableSubtotal,
    tax,
    tip: safeTip,
    deliveryFee: safeDeliveryFee,
    total: roundToCents(taxableSubtotal + tax + safeTip + safeDeliveryFee),
  };
};
