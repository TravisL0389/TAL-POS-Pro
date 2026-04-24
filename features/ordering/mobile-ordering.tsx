import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Heart,
  Mail,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { CartItem, MenuItem, Order, OrderType, PaymentMethod } from '../../types';
import { calculateOrderSummary, formatPrice, getCartItemTotal } from '../../lib/money';

const paymentOptions: PaymentMethod[] = ['card', 'cash', 'gift-card', 'manual-entry'];

export const MobileOrdering: React.FC = () => {
  const { addOrder, categories, markReceiptEmailed, menu, orders, tenantConfig } = useStore();
  const [view, setView] = useState<'menu' | 'cart' | 'receipt'>('menu');
  const [serviceMode, setServiceMode] = useState<OrderType>('takeout');
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tipPercent, setTipPercent] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchValue);

  const filteredMenu = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = activeCategory ? item.categoryId === activeCategory : true;
      const matchesQuery = query
        ? item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
        : true;

      return matchesCategory && matchesQuery && item.available;
    });
  }, [activeCategory, deferredSearch, menu]);

  const deliveryFee = serviceMode === 'delivery' ? tenantConfig.deliveryFee : 0;
  const summary = calculateOrderSummary({
    items: cart,
    taxRate: tenantConfig.taxRate,
    tip: calculateOrderSummary({
      items: cart,
      taxRate: 0,
      tip: 0,
    }).subtotal * (tipPercent / 100),
    deliveryFee,
  });

  const displayedOrder = useMemo(() => {
    if (!latestOrder) return null;
    return orders.find((order) => order.id === latestOrder.id) || latestOrder;
  }, [latestOrder, orders]);

  const addSelectedItem = () => {
    if (!selectedItem) {
      return;
    }

    setCart((previous) => [
      ...previous,
      {
        id: `${selectedItem.id}_${Math.random().toString(36).slice(2, 9)}`,
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        basePrice: selectedItem.price,
        quantity,
        selectedModifiers: [],
      },
    ]);
    setSelectedItem(null);
    setQuantity(1);
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      return;
    }

    const order = addOrder({
      items: cart,
      subtotal: summary.subtotal,
      discount: 0,
      tax: summary.tax,
      deliveryFee: summary.deliveryFee,
      tip: summary.tip,
      total: summary.total,
      type: serviceMode,
      customerName: serviceMode === 'delivery' ? 'Mobile Delivery Guest' : 'Mobile Pickup Guest',
      customerEmail: receiptEmail || undefined,
      paymentMethod,
      paymentStatus: 'paid',
      estimatedTime: serviceMode === 'delivery' ? '20-25 mins' : '12-15 mins',
    });

    setLatestOrder(order);
    setCart([]);
    setView('receipt');
    setNotice(null);
  };

  return (
    <div className="panel-card-strong mx-auto max-w-[520px] overflow-hidden rounded-[34px]">
      {view === 'menu' && (
        <div className="relative min-h-[calc(100vh-8rem)] bg-[var(--surface)]">
          <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_16%,white),transparent)]" />

          <div
            className="relative space-y-5 p-5"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.97)), url(${tenantConfig.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-kicker">Mobile ordering</div>
                <div className="mt-3 flex items-center gap-3">
                  <img src={tenantConfig.logo} alt={tenantConfig.name} className="h-14 w-14 rounded-[22px] object-cover shadow-sm" />
                  <div>
                    <h1 className="text-3xl font-bold text-[var(--text)]">{tenantConfig.name}</h1>
                    <div className="mt-1 text-sm text-[var(--body)]">{tenantConfig.story}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--body)]">
                  <MapPin size={16} className="text-[var(--primary)]" />
                  {tenantConfig.address}
                </div>
              </div>
              <button
                onClick={() => setFavoriteIds((previous) => (previous.includes('store') ? previous.filter((id) => id !== 'store') : [...previous, 'store']))}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                  favoriteIds.includes('store')
                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                    : 'border-[var(--border)] bg-white text-[var(--muted)]'
                }`}
              >
                <Heart size={18} fill={favoriteIds.includes('store') ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="panel-card rounded-[26px] p-2">
              {(['takeout', 'delivery'] as OrderType[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setServiceMode(mode)}
                  className={`touch-button rounded-[20px] px-4 py-4 text-sm font-semibold capitalize ${
                    serviceMode === mode ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search sandwiches, drinks, desserts..."
                className="w-full rounded-[24px] border border-[var(--border)] bg-white py-4 pl-11 pr-4 text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
            </label>

            <div className="flex gap-3 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                  !activeCategory ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-white text-[var(--body)]'
                }`}
              >
                All items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`touch-button rounded-full px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                    activeCategory === category.id
                      ? 'bg-[var(--primary)] text-white'
                      : 'border border-[var(--border)] bg-white text-[var(--body)]'
                  }`}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>

            <div className="space-y-4 pb-28">
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setQuantity(1);
                  }}
                  className="glass-panel flex w-full gap-4 rounded-[28px] p-4 text-left"
                >
                  <img src={item.image} alt={item.name} className="h-24 w-24 rounded-[22px] object-cover" />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-[var(--text)]">{item.name}</h3>
                        <span className="rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                          {item.prepTimeMinutes}m
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--body)]">{item.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-[var(--primary)]">{formatPrice(item.price, tenantConfig.currency)}</span>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
                        <Plus size={18} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 p-5">
              <button
                onClick={() => setView('cart')}
                className="touch-button-lg flex w-full items-center justify-between rounded-[26px] bg-[var(--text)] px-5 py-5 text-white shadow-[0_26px_50px_rgba(15,23,42,0.24)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/15 px-2 text-sm font-semibold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                  <span className="text-lg font-semibold">View basket</span>
                </div>
                <span className="text-lg font-semibold">{formatPrice(summary.total, tenantConfig.currency)}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'cart' && (
        <div className="min-h-[calc(100vh-8rem)] space-y-5 bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('menu')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Basket</div>
              <h2 className="text-2xl font-bold text-[var(--text)]">Checkout flow</h2>
            </div>
          </div>

          <div className="space-y-4">
            {cart.map((item) => (
              <article key={item.id} className="panel-card rounded-[28px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-[var(--text)]">{item.name}</div>
                    <div className="text-sm text-[var(--muted)]">{formatPrice(item.basePrice, tenantConfig.currency)}</div>
                  </div>
                  <div className="text-lg font-bold text-[var(--primary)]">{formatPrice(getCartItemTotal(item), tenantConfig.currency)}</div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-[18px] bg-white p-2">
                    <button
                      onClick={() =>
                        setCart((previous) =>
                          previous
                            .map((entry) => (entry.id === item.id ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))
                            .filter((entry) => entry.quantity > 0),
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--body)]"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="min-w-8 text-center text-lg font-bold text-[var(--text)]">{item.quantity}</span>
                    <button
                      onClick={() =>
                        setCart((previous) => previous.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)))
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    onClick={() => setCart((previous) => previous.filter((entry) => entry.id !== item.id))}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="panel-card space-y-4 rounded-[28px] p-5">
            <div className="text-lg font-bold text-[var(--text)]">Tip</div>
            <div className="grid grid-cols-4 gap-3">
              {[0, 10, 15, 20].map((tip) => (
                <button
                  key={tip}
                  onClick={() => setTipPercent(tip)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    tipPercent === tip ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-white text-[var(--body)]'
                  }`}
                >
                  {tip === 0 ? 'No tip' : `${tip}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card space-y-4 rounded-[28px] p-5">
            <div className="text-lg font-bold text-[var(--text)]">Payment</div>
            <div className="grid grid-cols-2 gap-3">
              {paymentOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setPaymentMethod(option)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold capitalize ${
                    paymentMethod === option ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-white text-[var(--body)]'
                  }`}
                >
                  {option.replace('-', ' ')}
                </button>
              ))}
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--body)]">Email receipt</span>
              <input
                type="email"
                value={receiptEmail}
                onChange={(event) => setReceiptEmail(event.target.value)}
                placeholder="guest@example.com"
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
              />
            </label>
          </div>

          <div className="panel-card space-y-3 rounded-[28px] p-5">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Subtotal</span>
              <span>{formatPrice(summary.subtotal, tenantConfig.currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Tax</span>
              <span>{formatPrice(summary.tax, tenantConfig.currency)}</span>
            </div>
            {summary.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-[var(--muted)]">
                <span>Delivery fee</span>
                <span>{formatPrice(summary.deliveryFee, tenantConfig.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Tip</span>
              <span>{formatPrice(summary.tip, tenantConfig.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-xl font-bold text-[var(--text)]">
              <span>Total</span>
              <span>{formatPrice(summary.total, tenantConfig.currency)}</span>
            </div>
            <button
              onClick={placeOrder}
              className="touch-button-lg flex w-full items-center justify-center gap-2 rounded-[24px] bg-[var(--primary)] px-5 py-5 text-lg font-semibold text-white shadow-[0_22px_46px_rgba(29,78,216,0.22)]"
            >
              <CreditCard size={18} />
              Place Order
            </button>
          </div>
        </div>
      )}

      {view === 'receipt' && displayedOrder && (
        <div className="min-h-[calc(100vh-8rem)] space-y-5 bg-[var(--surface)] p-5">
          <div className="hero-panel rounded-[32px] border border-[var(--border-strong)] px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={40} />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Order confirmed</div>
            <h2 className="mt-2 text-3xl font-bold text-[var(--text)]">Order #{displayedOrder.orderNumber}</h2>
            <p className="mt-3 text-[var(--body)]">
              {displayedOrder.type} • {displayedOrder.estimatedTime} • {formatPrice(displayedOrder.total, tenantConfig.currency)}
            </p>
          </div>

          <div className="panel-card space-y-4 rounded-[28px] p-5">
            {displayedOrder.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-4">
                <div>
                  <div className="font-semibold text-[var(--text)]">
                    {item.quantity}x {item.name}
                  </div>
                </div>
                <div className="font-semibold text-[var(--primary)]">{formatPrice(getCartItemTotal(item), tenantConfig.currency)}</div>
              </div>
            ))}
          </div>

          <div className="panel-card space-y-4 rounded-[28px] p-5">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Paid with</span>
              <span className="capitalize">{displayedOrder.paymentMethod.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-[var(--text)]">
              <span>Total</span>
              <span>{formatPrice(displayedOrder.total, tenantConfig.currency)}</span>
            </div>
            <button
              onClick={() => {
                markReceiptEmailed(displayedOrder.id, receiptEmail || displayedOrder.customerEmail || 'guest@example.com');
                setNotice('Digital receipt sent.');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 font-semibold text-[var(--body)]"
            >
              <Mail size={18} />
              Email Receipt
            </button>
            {notice && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
            <button
              onClick={() => {
                setView('menu');
                setLatestOrder(null);
                setReceiptEmail('');
                setTipPercent(10);
                setNotice(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[var(--text)] px-4 py-4 font-semibold text-[var(--bg)]"
            >
              <ShoppingBag size={18} />
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="panel-card-strong w-full max-w-[520px] overflow-hidden rounded-[30px]">
            <img src={selectedItem.image} alt={selectedItem.name} className="h-52 w-full object-cover" />
            <div className="space-y-5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text)]">{selectedItem.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--body)]">{selectedItem.description}</p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--body)]"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-[24px] bg-[var(--bg)] p-3">
                <button
                  onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-white text-[var(--body)]"
                >
                  <Minus size={18} />
                </button>
                <span className="text-3xl font-bold text-[var(--text)]">{quantity}</span>
                <button
                  onClick={() => setQuantity((previous) => previous + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"
                >
                  <Plus size={18} />
                </button>
              </div>

              <button
                onClick={addSelectedItem}
                className="flex w-full items-center justify-between rounded-[24px] bg-[var(--text)] px-5 py-5 text-lg font-semibold text-white"
              >
                <span>Add to Basket</span>
                <span>{formatPrice(selectedItem.price * quantity, tenantConfig.currency)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
