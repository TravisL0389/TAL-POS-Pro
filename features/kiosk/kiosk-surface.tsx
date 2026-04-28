import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  Gift,
  Keyboard,
  Mail,
  MessageSquare,
  Minus,
  Percent,
  Plus,
  Printer,
  ReceiptText,
  ShoppingCart,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useStore } from '../../store/StoreContext';
import { CartItem, MenuItem, Modifier, ModifierGroup, Order, OrderType, PaymentMethod } from '../../types';
import { calculateOrderSummary, calculateSubtotal, formatPrice, getCartItemTotal, roundToCents } from '../../lib/money';

const quickNotes = ['No onions', 'Sauce on side', 'Extra napkins', 'No ice', 'Allergy alert'];
const discountOptions = [
  { label: 'None', value: 0, type: 'flat' as const },
  { label: 'Promo $2', value: 2, type: 'flat' as const },
  { label: '10% Off', value: 10, type: 'percent' as const },
  { label: '15% VIP', value: 15, type: 'percent' as const },
];
const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'gift-card', label: 'Gift', icon: Gift },
  { id: 'manual-entry', label: 'Manual', icon: Keyboard },
];

const getDiscountAmount = (subtotal: number, discountLabel: string) => {
  const option = discountOptions.find((discount) => discount.label === discountLabel) || discountOptions[0];
  if (option.type === 'percent') {
    return roundToCents(subtotal * (option.value / 100));
  }

  return option.value;
};

const getTipAmount = (subtotalAfterDiscount: number, tipPercent: number) => {
  return roundToCents(subtotalAfterDiscount * (tipPercent / 100));
};

const serviceOptions: { type: OrderType; label: string; emoji: string; description: string }[] = [
  { type: 'dine-in', label: 'Dine In', emoji: '🍽️', description: 'Counter pickup with table service notes.' },
  { type: 'takeout', label: 'Takeout', emoji: '🥡', description: 'Fastest flow for food trucks and pop-up counters.' },
  { type: 'delivery', label: 'Delivery', emoji: '🚚', description: 'Includes address-ready totals and fees.' },
];

export const KioskSurface: React.FC = () => {
  const {
    addOrder,
    categories,
    markReceiptEmailed,
    markReceiptPrinted,
    menu,
    orders,
    tenantConfig,
  } = useStore();
  const [stage, setStage] = useState<'welcome' | 'service' | 'menu' | 'receipt'>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || '');
  const [orderType, setOrderType] = useState<OrderType>('takeout');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modifierSelections, setModifierSelections] = useState<Record<string, Modifier[]>>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [discountLabel, setDiscountLabel] = useState('None');
  const [tipPercent, setTipPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [splitPayment, setSplitPayment] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [receiptNotice, setReceiptNotice] = useState<string | null>(null);

  const subtotal = calculateSubtotal(cart);
  const discountAmount = getDiscountAmount(subtotal, discountLabel);
  const taxableSubtotal = roundToCents(Math.max(0, subtotal - discountAmount));
  const deliveryFee = orderType === 'delivery' ? tenantConfig.deliveryFee : 0;
  const tipAmount = getTipAmount(taxableSubtotal, tipPercent);
  const orderSummary = calculateOrderSummary({
    items: cart,
    taxRate: tenantConfig.taxRate,
    discount: discountAmount,
    tip: tipAmount,
    deliveryFee,
  });

  const displayedOrder = useMemo(() => {
    if (!latestOrder) {
      return null;
    }

    return orders.find((order) => order.id === latestOrder.id) || latestOrder;
  }, [latestOrder, orders]);

  const hasMissingRequiredModifiers = customizingItem?.modifierGroups?.some((group) => {
    return (modifierSelections[group.id] || []).length < group.minSelection;
  });

  const flattenedModifiers = useMemo<CartItem['selectedModifiers']>(() => {
    return Object.entries(modifierSelections).flatMap(([groupId, modifiers]) =>
      (modifiers as Modifier[]).map((modifier) => ({
        groupId,
        modifierId: modifier.id,
        name: modifier.name,
        price: modifier.price,
      })),
    );
  }, [modifierSelections]);

  const openItemCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
    setModifierSelections({});
    setItemQuantity(1);
    setItemNotes('');
  };

  const toggleModifier = (group: ModifierGroup, modifier: Modifier) => {
    setModifierSelections((previous) => {
      const currentSelections = previous[group.id] || [];
      const isSelected = currentSelections.some((entry) => entry.id === modifier.id);

      if (isSelected) {
        return {
          ...previous,
          [group.id]: currentSelections.filter((entry) => entry.id !== modifier.id),
        };
      }

      if (group.maxSelection === 1) {
        return { ...previous, [group.id]: [modifier] };
      }

      if (currentSelections.length >= group.maxSelection) {
        return previous;
      }

      return { ...previous, [group.id]: [...currentSelections, modifier] };
    });
  };

  const addQuickNote = (note: string) => {
    if (!itemNotes.includes(note)) {
      setItemNotes((previous) => (previous ? `${previous}, ${note}` : note));
    }
  };

  const addItemToCart = () => {
    if (!customizingItem || hasMissingRequiredModifiers) {
      return;
    }

    setCart((previous) => [
      ...previous,
      {
        id: `${customizingItem.id}_${Math.random().toString(36).slice(2, 9)}`,
        menuItemId: customizingItem.id,
        name: customizingItem.name,
        basePrice: customizingItem.price,
        quantity: itemQuantity,
        selectedModifiers: flattenedModifiers,
        notes: itemNotes.trim() || undefined,
      },
    ]);

    setCustomizingItem(null);
    setCartOpen(true);
  };

  const updateCartItemQuantity = (cartItemId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((previous) => previous.filter((item) => item.id !== cartItemId));
      return;
    }

    setCart((previous) =>
      previous.map((item) => (item.id === cartItemId ? { ...item, quantity: nextQuantity } : item)),
    );
  };

  const completePayment = () => {
    if (cart.length === 0) {
      return;
    }

    if (paymentMethod === 'cash' && Number(cashTendered || 0) < orderSummary.total) {
      setReceiptNotice('Enter enough cash received to complete the sale.');
      return;
    }

    const newOrder = addOrder({
      items: cart,
      subtotal: orderSummary.subtotal,
      discount: orderSummary.discount,
      discountLabel,
      tax: orderSummary.tax,
      deliveryFee: orderSummary.deliveryFee,
      tip: orderSummary.tip,
      total: orderSummary.total,
      type: orderType,
      customerName: orderType === 'dine-in' ? 'Counter Guest' : 'Walk-in Guest',
      customerEmail: receiptEmail || undefined,
      paymentMethod,
      splitPayment,
      paymentStatus: 'paid',
      estimatedTime: orderType === 'delivery' ? '18-25 mins' : '8-12 mins',
      tenderedCash: paymentMethod === 'cash' ? Number(cashTendered || 0) : undefined,
      changeDue:
        paymentMethod === 'cash' ? roundToCents(Number(cashTendered || 0) - orderSummary.total) : undefined,
    });

    setLatestOrder(newOrder);
    setReceiptNotice(null);
    setPaymentOpen(false);
    setCart([]);
    setReceiptEmail('');
    setCashTendered('');
    setTipPercent(0);
    setDiscountLabel('None');
    setSplitPayment(false);
    setStage('receipt');
    setCartOpen(false);
  };

  const resetFlow = () => {
    setStage('welcome');
    setCart([]);
    setLatestOrder(null);
    setReceiptNotice(null);
    setPaymentOpen(false);
    setCartOpen(false);
    setTipPercent(0);
    setDiscountLabel('None');
    setPaymentMethod('card');
    setSplitPayment(false);
  };

  if (stage === 'welcome') {
    return (
    <div className="kiosk-surface flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <div
          className="hero-panel grid-accent relative w-full max-w-6xl overflow-hidden rounded-[44px] border border-[var(--border-strong)] p-8 sm:p-12"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.68)), url(${tenantConfig.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={() => setStage('service')}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.16),transparent_26%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                <ReceiptText size={14} className="text-[var(--primary)]" />
                Touch-first checkout
              </div>
              <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-[var(--text)] sm:text-6xl">
                Speedy, premium POS flow built for busy counters.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--body)]">
                Start an order, customize products, collect payment, and hand off a receipt without leaving the screen.
              </p>
              <div className="inline-flex items-center gap-3 rounded-[24px] border border-white/65 bg-white/80 px-4 py-3 shadow-sm">
                <img src={tenantConfig.logo} alt={tenantConfig.name} className="h-12 w-12 rounded-2xl object-cover" />
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">{tenantConfig.name}</div>
                  <div className="text-sm text-[var(--body)]">{tenantConfig.story}</div>
                </div>
              </div>
              <div className="inline-flex rounded-[24px] bg-[var(--text)] px-6 py-4 text-lg font-semibold text-[var(--bg)] shadow-[0_22px_44px_rgba(15,23,42,0.18)]">
                Tap anywhere to begin
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-[30px] p-5">
                <div className="section-kicker">Large touch targets</div>
                <div className="mt-2 text-2xl font-bold text-[var(--text)]">Fast lane checkout</div>
              </div>
              <div className="glass-panel rounded-[30px] p-5">
                <div className="section-kicker">Receipt handoff</div>
                <div className="mt-2 text-2xl font-bold text-[var(--text)]">Print or email in one tap</div>
              </div>
              <div className="glass-panel rounded-[30px] p-5 sm:col-span-2">
                <div className="section-kicker">{tenantConfig.name}</div>
                <div className="mt-2 text-lg text-[var(--body)]">{tenantConfig.address}</div>
                <div className="text-lg text-[var(--body)]">{tenantConfig.hours}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'service') {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => setStage('welcome')}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-semibold text-[var(--body)]"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="grid gap-5 lg:grid-cols-3">
          {serviceOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                setOrderType(option.type);
                setStage('menu');
              }}
              className="panel-card rounded-[34px] p-8 text-left hover:-translate-y-1 hover:shadow-[var(--shadow-strong)]"
            >
              <div className="mb-5 text-6xl">{option.emoji}</div>
              <div className="text-3xl font-bold text-[var(--text)]">{option.label}</div>
              <p className="mt-3 text-base leading-7 text-[var(--body)]">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'receipt' && displayedOrder) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="panel-card-strong overflow-hidden rounded-[36px]">
          <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] px-8 py-10 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={40} />
            </div>
            <div className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Payment complete</div>
            <h2 className="mt-2 text-4xl font-bold text-[var(--text)]">Order #{displayedOrder.orderNumber} is ready for handoff.</h2>
            <p className="mt-3 text-lg text-[var(--body)]">
              {displayedOrder.type} • {displayedOrder.estimatedTime} • {formatPrice(displayedOrder.total, tenantConfig.currency)}
            </p>
          </div>

          <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {displayedOrder.items.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--bg)] px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[var(--text)]">
                        {item.quantity}x {item.name}
                      </div>
                      {item.selectedModifiers.length > 0 && (
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {item.selectedModifiers.map((modifier) => modifier.name).join(', ')}
                        </div>
                      )}
                      {item.notes && <div className="mt-1 text-sm italic text-[var(--body)]">{item.notes}</div>}
                    </div>
                    <div className="text-lg font-bold text-[var(--primary)]">
                      {formatPrice(getCartItemTotal(item), tenantConfig.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-card space-y-4 rounded-[28px] p-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-[var(--muted)]">
                  <span>Subtotal</span>
                  <span>{formatPrice(displayedOrder.subtotal, tenantConfig.currency)}</span>
                </div>
                {displayedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>{displayedOrder.discountLabel || 'Discount'}</span>
                    <span>-{formatPrice(displayedOrder.discount, tenantConfig.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-[var(--muted)]">
                  <span>Tax</span>
                  <span>{formatPrice(displayedOrder.tax, tenantConfig.currency)}</span>
                </div>
                {displayedOrder.tip > 0 && (
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>Tip</span>
                    <span>{formatPrice(displayedOrder.tip, tenantConfig.currency)}</span>
                  </div>
                )}
                {(displayedOrder.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>Delivery fee</span>
                    <span>{formatPrice(displayedOrder.deliveryFee || 0, tenantConfig.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--border)] pt-3 text-lg font-bold text-[var(--text)]">
                  <span>Total</span>
                  <span>{formatPrice(displayedOrder.total, tenantConfig.currency)}</span>
                </div>
                {displayedOrder.changeDue !== undefined && displayedOrder.changeDue > 0 && (
                  <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Change due: {formatPrice(displayedOrder.changeDue, tenantConfig.currency)}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    markReceiptPrinted(displayedOrder.id);
                    setReceiptNotice('Receipt sent to the printer queue.');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--text)] px-4 py-4 font-semibold text-[var(--bg)]"
                >
                  <Printer size={18} />
                  Print Receipt
                </button>
                <button
                  onClick={() => {
                    markReceiptEmailed(displayedOrder.id, receiptEmail || displayedOrder.customerEmail || 'guest@example.com');
                    setReceiptNotice('Receipt email simulated successfully.');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 font-semibold text-[var(--body)]"
                >
                  <Mail size={18} />
                  Email Receipt
                </button>
              </div>

              {receiptNotice && (
                <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--text)]">
                  {receiptNotice}
                </div>
              )}

              <button
                onClick={resetFlow}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 font-semibold text-[var(--text)]"
              >
                Start Next Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="panel-card rounded-[30px] px-5 py-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStage('service')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Live kiosk</div>
            <div className="text-2xl font-bold text-[var(--text)]">{serviceOptions.find((option) => option.type === orderType)?.label} Order</div>
          </div>
        </div>

        <button
          onClick={() => setCartOpen(true)}
          className="touch-button-lg relative inline-flex items-center gap-3 rounded-[24px] bg-[var(--text)] px-5 py-4 text-lg font-semibold text-[var(--bg)] shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
        >
          <ShoppingCart size={22} />
          {formatPrice(orderSummary.total, tenantConfig.currency)}
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/15 px-2 text-sm">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <aside className="panel-card rounded-[30px] p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Categories</div>
          <div className="grid gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-[24px] border px-4 py-5 text-left ${
                  selectedCategory === category.id
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--body)]'
                }`}
              >
                <div className="text-3xl">{category.icon}</div>
                <div className="mt-2 text-lg font-bold">{category.name}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {menu
            .filter((item) => item.categoryId === selectedCategory)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => item.available && openItemCustomization(item)}
                className={`overflow-hidden rounded-[32px] border bg-[var(--surface-strong)] text-left shadow-sm ${
                  item.available
                    ? 'border-[var(--border)] hover:-translate-y-1 hover:shadow-[0_26px_44px_rgba(15,23,42,0.12)]'
                    : 'border-red-200 opacity-60'
                }`}
              >
                <div className="relative h-52 overflow-hidden">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  {!item.available && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-lg font-bold text-white">
                      Sold Out
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text)]">{item.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--body)]">{item.description}</p>
                    </div>
                    <div className="rounded-full bg-[var(--bg)] px-3 py-1 text-sm font-semibold text-[var(--muted)]">
                      {item.prepTimeMinutes}m
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[var(--primary)]">{formatPrice(item.price, tenantConfig.currency)}</span>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
                      <Plus size={22} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
        </section>
      </div>

      {customizingItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="panel-card-strong max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[36px]">
            <div className="relative h-64">
              <img src={customizingItem.image} alt={customizingItem.name} className="h-full w-full object-cover" />
              <button
                onClick={() => setCustomizingItem(null)}
                className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
              >
                <X size={20} />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-6 pb-6 pt-16">
                <h3 className="text-3xl font-bold text-white">{customizingItem.name}</h3>
                <p className="mt-2 max-w-2xl text-white/80">{customizingItem.description}</p>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
              <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
                {customizingItem.modifierGroups?.map((group) => (
                  <div key={group.id} className="panel-card rounded-[26px] p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-[var(--text)]">{group.name}</div>
                        <div className="text-sm text-[var(--muted)]">
                          {group.minSelection > 0 ? `Choose at least ${group.minSelection}` : 'Optional'}
                          {group.maxSelection > 1 ? ` • up to ${group.maxSelection}` : ''}
                        </div>
                      </div>
                      {group.minSelection > 0 && <Badge variant="warning">Required</Badge>}
                    </div>
                    <div className="space-y-3">
                      {group.options.map((option) => {
                        const selected = (modifierSelections[group.id] || []).some((modifier) => modifier.id === option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleModifier(group, option)}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                              selected
                                ? 'border-[var(--primary)] bg-white shadow-[0_14px_28px_rgba(29,78,216,0.12)]'
                                : 'border-[var(--border)] bg-white'
                            }`}
                          >
                            <span className="font-semibold text-[var(--text)]">{option.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-[var(--muted)]">
                                {option.price > 0 ? `+${formatPrice(option.price, tenantConfig.currency)}` : 'Included'}
                              </span>
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                  selected ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'
                                }`}
                              >
                                {selected && <Check size={16} />}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="panel-card rounded-[26px] p-5">
                  <div className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                    <MessageSquare size={18} className="text-[var(--primary)]" />
                    Special instructions
                  </div>
                  <textarea
                    value={itemNotes}
                    onChange={(event) => setItemNotes(event.target.value)}
                    placeholder="Any allergies or custom prep notes?"
                    className="min-h-[120px] w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickNotes.map((note) => (
                      <button
                        key={note}
                        onClick={() => addQuickNote(note)}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--body)]"
                      >
                        + {note}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel-card space-y-4 rounded-[28px] p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Quantity</div>
                <div className="flex items-center justify-between rounded-[22px] bg-white p-3">
                  <button
                    onClick={() => setItemQuantity((previous) => Math.max(1, previous - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-3xl font-bold text-[var(--text)]">{itemQuantity}</span>
                  <button
                    onClick={() => setItemQuantity((previous) => previous + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="rounded-[22px] bg-white p-4">
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>Current item total</span>
                    <span>{formatPrice(getCartItemTotal({
                      id: 'preview',
                      menuItemId: customizingItem.id,
                      name: customizingItem.name,
                      basePrice: customizingItem.price,
                      quantity: itemQuantity,
                      selectedModifiers: flattenedModifiers,
                    }), tenantConfig.currency)}</span>
                  </div>
                </div>
                <button
                  onClick={addItemToCart}
                  disabled={Boolean(hasMissingRequiredModifiers)}
                  className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[var(--text)] px-4 py-5 text-lg font-semibold text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/55 backdrop-blur-sm">
          <div className="panel-card-strong flex h-full w-full max-w-[520px] flex-col border-l border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Current cart</div>
                <h3 className="text-2xl font-bold text-[var(--text)]">{cart.length === 0 ? 'No items yet' : `${cart.length} line items`}</h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {cart.length === 0 ? (
                <div className="panel-card rounded-[26px] px-4 py-10 text-center text-[var(--muted)]">
                  Add items from the grid to begin checkout.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="panel-card rounded-[26px] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-[var(--text)]">{item.name}</div>
                        {item.selectedModifiers.length > 0 && (
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            {item.selectedModifiers.map((modifier) => modifier.name).join(', ')}
                          </div>
                        )}
                        {item.notes && <div className="mt-1 text-sm italic text-[var(--body)]">{item.notes}</div>}
                      </div>
                      <div className="text-lg font-bold text-[var(--primary)]">{formatPrice(getCartItemTotal(item), tenantConfig.currency)}</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-[18px] bg-white p-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--body)]"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="min-w-8 text-center text-lg font-bold text-[var(--text)]">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <button
                        onClick={() => updateCartItemQuantity(item.id, 0)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <div className="space-y-2 text-sm text-[var(--muted)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(orderSummary.subtotal, tenantConfig.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatPrice(orderSummary.tax, tenantConfig.currency)}</span>
                </div>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3 text-xl font-bold text-[var(--text)]">
                <span>Total</span>
                <span>{formatPrice(orderSummary.total, tenantConfig.currency)}</span>
              </div>
              <button
                onClick={() => setPaymentOpen(true)}
                disabled={cart.length === 0}
                className="w-full rounded-[22px] bg-[var(--primary)] px-4 py-5 text-lg font-semibold text-white disabled:opacity-50"
              >
                Review & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="panel-card-strong w-full max-w-5xl overflow-hidden rounded-[36px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Checkout</div>
                <h3 className="text-2xl font-bold text-[var(--text)]">Tender selection and receipt handoff</h3>
              </div>
              <button
                onClick={() => setPaymentOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <div className="panel-card rounded-[28px] p-5">
                  <div className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                    <Percent size={18} className="text-[var(--primary)]" />
                    Discounts
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {discountOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setDiscountLabel(option.label)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          discountLabel === option.label
                            ? 'border-[var(--primary)] bg-white shadow-[0_16px_28px_rgba(29,78,216,0.12)]'
                            : 'border-[var(--border)] bg-white'
                        }`}
                      >
                        <div className="font-semibold text-[var(--text)]">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel-card rounded-[28px] p-5">
                  <div className="mb-4 text-lg font-bold text-[var(--text)]">Tips</div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[0, 10, 15, 20].map((tip) => (
                      <button
                        key={tip}
                        onClick={() => setTipPercent(tip)}
                        className={`rounded-2xl border px-4 py-4 font-semibold transition-all ${
                          tipPercent === tip
                            ? 'border-[var(--primary)] bg-white text-[var(--primary)] shadow-[0_16px_28px_rgba(29,78,216,0.12)]'
                            : 'border-[var(--border)] bg-white text-[var(--body)]'
                        }`}
                      >
                        {tip === 0 ? 'No Tip' : `${tip}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel-card rounded-[28px] p-5">
                  <div className="mb-4 text-lg font-bold text-[var(--text)]">Payment method</div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`rounded-2xl border px-4 py-5 transition-all ${
                            paymentMethod === method.id
                              ? 'border-[var(--primary)] bg-white shadow-[0_16px_28px_rgba(29,78,216,0.12)]'
                              : 'border-[var(--border)] bg-white'
                          }`}
                        >
                          <Icon size={24} className={paymentMethod === method.id ? 'text-[var(--primary)]' : 'text-[var(--body)]'} />
                          <div className="mt-3 font-semibold text-[var(--text)]">{method.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="panel-card rounded-[28px] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[var(--text)]">Split payment preview</div>
                      <div className="text-sm text-[var(--muted)]">Visual demo for mixed tender without leaving a dead control.</div>
                    </div>
                    <button
                      onClick={() => setSplitPayment((previous) => !previous)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        splitPayment ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-white text-[var(--body)]'
                      }`}
                    >
                      {splitPayment ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {splitPayment && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                        <div className="text-sm font-semibold text-[var(--muted)]">Primary tender</div>
                        <div className="mt-2 text-xl font-bold text-[var(--text)]">
                          {formatPrice(orderSummary.total * 0.6, tenantConfig.currency)}
                        </div>
                        <div className="text-sm text-[var(--body)]">Card or gift balance</div>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                        <div className="text-sm font-semibold text-[var(--muted)]">Remaining balance</div>
                        <div className="mt-2 text-xl font-bold text-[var(--text)]">
                          {formatPrice(orderSummary.total * 0.4, tenantConfig.currency)}
                        </div>
                        <div className="text-sm text-[var(--body)]">Cash or manual entry</div>
                      </div>
                    </div>
                  )}
                </div>

                {paymentMethod === 'cash' && (
                  <label className="panel-card grid gap-2 rounded-[28px] p-5">
                    <span className="text-lg font-bold text-[var(--text)]">Cash received</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(event) => setCashTendered(event.target.value)}
                      placeholder="0.00"
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-lg outline-none focus:border-[var(--primary)]"
                    />
                  </label>
                )}

                <label className="panel-card grid gap-2 rounded-[28px] p-5">
                  <span className="text-lg font-bold text-[var(--text)]">Receipt email (optional)</span>
                  <input
                    type="email"
                    value={receiptEmail}
                    onChange={(event) => setReceiptEmail(event.target.value)}
                    placeholder="guest@example.com"
                    className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 outline-none focus:border-[var(--primary)]"
                  />
                </label>
              </div>

              <div className="panel-card space-y-4 rounded-[28px] p-5">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Order summary</div>
                <div className="space-y-3 rounded-[22px] bg-white p-4">
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>Subtotal</span>
                    <span>{formatPrice(orderSummary.subtotal, tenantConfig.currency)}</span>
                  </div>
                  {orderSummary.discount > 0 && (
                    <div className="flex justify-between text-sm text-[var(--muted)]">
                      <span>{discountLabel}</span>
                      <span>-{formatPrice(orderSummary.discount, tenantConfig.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-[var(--muted)]">
                    <span>Tax</span>
                    <span>{formatPrice(orderSummary.tax, tenantConfig.currency)}</span>
                  </div>
                  {orderSummary.tip > 0 && (
                    <div className="flex justify-between text-sm text-[var(--muted)]">
                      <span>Tip</span>
                      <span>{formatPrice(orderSummary.tip, tenantConfig.currency)}</span>
                    </div>
                  )}
                  {orderSummary.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-[var(--muted)]">
                      <span>Delivery fee</span>
                      <span>{formatPrice(orderSummary.deliveryFee, tenantConfig.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[var(--border)] pt-3 text-xl font-bold text-[var(--text)]">
                    <span>Total</span>
                    <span>{formatPrice(orderSummary.total, tenantConfig.currency)}</span>
                  </div>
                </div>

                {receiptNotice && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {receiptNotice}
                  </div>
                )}

                <button
                  onClick={completePayment}
                  className="w-full rounded-[22px] bg-[var(--primary)] px-4 py-5 text-lg font-semibold text-white shadow-[0_20px_40px_rgba(29,78,216,0.22)]"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
