import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgeDollarSign,
  BellRing,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  Upload,
  UserRoundCog,
} from 'lucide-react';
import { THEMES } from '../../config/constants';
import { useStore } from '../../store/StoreContext';
import { MenuItem, Order, OrderStatus, ThemeName } from '../../types';
import { formatPrice } from '../../lib/money';
import { formatClockTime, formatDateTime, slugify } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { StatCard } from '../../components/ui/stat-card';

type AdminTab = 'overview' | 'orders' | 'menu' | 'team' | 'settings';

const getNextStatus = (status: OrderStatus): OrderStatus | null => {
  if (status === 'received') return 'preparing';
  if (status === 'preparing') return 'ready';
  if (status === 'ready') return 'completed';
  return null;
};

const emptyDraft = (categoryId: string): MenuItem => ({
  id: '',
  categoryId,
  sku: '',
  name: '',
  description: '',
  price: 0,
  image: '',
  available: true,
  prepTimeMinutes: 5,
  inventoryCount: 10,
  lowStockThreshold: 4,
  modifierGroups: [],
});

const getStatusVariant = (status: OrderStatus) => {
  if (status === 'completed') return 'success';
  if (status === 'ready') return 'info';
  if (status === 'preparing') return 'warning';
  if (status === 'refunded' || status === 'voided' || status === 'cancelled') return 'error';
  return 'neutral';
};

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const {
    activeStaff,
    applyBusinessPreset,
    backendMode,
    backendStatus,
    businessPresets,
    currentTheme,
    deleteMenuItem,
    markReceiptPrinted,
    menu,
    orders,
    refundOrder,
    setActiveStaff,
    setTheme,
    staff,
    tenantConfig,
    toggleMenuItemAvailability,
    updateOrderStatus,
    updateTenantConfig,
    upsertMenuItem,
    voidOrder,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [menuQuery, setMenuQuery] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const deferredMenuQuery = useDeferredValue(menuQuery);
  const activePresetId = tenantConfig.id;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read file.'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    startTransition(() => {
      setActiveTab(location.pathname.includes('/settings') ? 'settings' : 'overview');
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!banner) {
      return undefined;
    }

    const timer = window.setTimeout(() => setBanner(null), 2600);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const totalSales = useMemo(() => {
    return orders
      .filter((order) => order.paymentStatus === 'paid' || order.paymentStatus === 'refunded')
      .reduce((sum, order) => sum + (order.status === 'voided' ? 0 : order.total), 0);
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => ['received', 'preparing', 'ready'].includes(order.status)),
    [orders],
  );

  const lowStockItems = useMemo(
    () => menu.filter((item) => item.inventoryCount <= item.lowStockThreshold || !item.available),
    [menu],
  );

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        sales: 0,
      };
    });

    orders.forEach((order) => {
      const bucket = buckets.find(
        (entry) =>
          entry.key ===
          new Date(order.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
      );

      if (bucket && order.status !== 'voided') {
        bucket.sales += order.total;
      }
    });

    return buckets.map((entry) => ({
      name: entry.label,
      sales: Number(entry.sales.toFixed(2)),
    }));
  }, [orders]);

  const filteredMenu = useMemo(() => {
    const query = deferredMenuQuery.trim().toLowerCase();
    if (!query) {
      return menu;
    }

    return menu.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      );
    });
  }, [deferredMenuQuery, menu]);

  const backendLabel = useMemo(() => {
    if (backendStatus === 'live') return 'Supabase live';
    if (backendStatus === 'syncing') return 'Syncing to Supabase';
    if (backendStatus === 'error') return 'Supabase error';
    return 'Local demo mode';
  }, [backendStatus]);

  const backendVariant = backendStatus === 'live' ? 'success' : backendStatus === 'error' ? 'error' : backendStatus === 'syncing' ? 'warning' : 'neutral';

  const openNewItem = () => {
    setEditingItem(emptyDraft(menu[0]?.categoryId || 'signature'));
  };

  const saveItem = () => {
    if (!editingItem) {
      return;
    }

    if (!editingItem.name.trim() || editingItem.price <= 0) {
      setBanner('Add an item name and a valid price before saving.');
      return;
    }

    upsertMenuItem({
      ...editingItem,
      id: editingItem.id || `menu_${slugify(editingItem.name)}`,
      sku: editingItem.sku || `SKU-${slugify(editingItem.name).toUpperCase()}`,
      image:
        editingItem.image ||
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    });
    setEditingItem(null);
    setBanner(`${editingItem.name} is now available in the POS catalog.`);
  };

  const handleBusinessImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'coverImage',
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateTenantConfig({ [field]: dataUrl });
      setBanner(`${field === 'logo' ? 'Logo' : 'Cover image'} updated for ${tenantConfig.name}.`);
    } catch {
      setBanner('Image upload failed. Try another file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleMenuImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingItem) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEditingItem({ ...editingItem, image: dataUrl });
      setBanner(`${editingItem.name || 'Menu item'} photo updated.`);
    } catch {
      setBanner('Image upload failed. Try another file.');
    } finally {
      event.target.value = '';
    }
  };

  const exportSnapshot = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            business: tenantConfig,
            orders,
            menu,
            staff,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `localpos-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBanner('Operational snapshot exported.');
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-8">
      <section className="hero-panel grid-accent overflow-hidden rounded-[36px] border border-white/60">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
              <BellRing size={14} className="text-[var(--primary)]" />
              Release-ready operations cockpit
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
                Professional POS control center for kiosks, pop-ups, counters, and food service demos.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--body)] sm:text-lg">
                Run service from one place: watch queue health, manage the live menu, change staff roles, and
                white-label the experience in minutes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportSnapshot}
                className="touch-button inline-flex items-center gap-2 rounded-2xl bg-[var(--text)] px-5 py-3 font-semibold text-[var(--bg)] shadow-[0_16px_36px_rgba(15,23,42,0.18)] hover:scale-[1.02]"
              >
                <Download size={18} />
                Export Snapshot
              </button>
              <button
                onClick={openNewItem}
                className="touch-button inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3 font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Plus size={18} />
                Add Menu Item
              </button>
              <Link
                to="/kiosk"
                className="touch-button inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-5 py-3 font-semibold text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <ShoppingBag size={18} />
                Open Kiosk
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="metric-chip rounded-[22px] px-4 py-4">
                <div className="section-kicker">Live revenue</div>
                <div className="mt-2 text-2xl font-bold text-[var(--text)]">{formatPrice(totalSales, tenantConfig.currency)}</div>
              </div>
              <div className="metric-chip rounded-[22px] px-4 py-4">
                <div className="section-kicker">Open tickets</div>
                <div className="mt-2 text-2xl font-bold text-[var(--text)]">{activeOrders.length}</div>
              </div>
              <div className="metric-chip rounded-[22px] px-4 py-4">
                <div className="section-kicker">Brand mode</div>
                <div className="mt-2 text-2xl font-bold text-[var(--text)] capitalize">{backendMode}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div
              className="glass-panel relative overflow-hidden rounded-[30px] p-5 text-white"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.2)), url(${tenantConfig.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Current business</div>
              <div className="text-xl font-bold">{tenantConfig.name}</div>
              <div className="mt-2 text-sm text-white/80">{tenantConfig.address}</div>
              <div className="text-sm text-white/80">{tenantConfig.hours}</div>
              <div className="mt-4">
                <Badge variant={backendVariant}>{backendLabel}</Badge>
              </div>
            </div>
            <div className="glass-panel rounded-[30px] p-5">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Terminal status</div>
              <div className="text-xl font-bold text-[var(--text)]">{activeStaff.name}</div>
              <div className="mt-1 text-sm capitalize text-[var(--body)]">{activeStaff.role}</div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--bg)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--body)]">Live queue</span>
                <span className="text-lg font-bold text-[var(--primary)]">{activeOrders.length} open</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {banner && (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-sm font-medium text-[var(--text)]">
          {banner}
        </div>
      )}

      <div className="panel-card rounded-[26px] p-2">
        {(['overview', 'orders', 'menu', 'team', 'settings'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => startTransition(() => setActiveTab(tab))}
            className={`touch-button rounded-[18px] px-4 py-3 text-sm font-semibold capitalize ${
              activeTab === tab
                ? 'bg-[var(--primary)] text-white shadow-[0_14px_28px_rgba(29,78,216,0.24)]'
                : 'text-[var(--body)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Gross Sales" value={formatPrice(totalSales, tenantConfig.currency)} icon={BadgeDollarSign} trend="+9.8%" />
            <StatCard label="Open Orders" value={String(activeOrders.length)} icon={ClipboardList} trend="+3.1%" />
            <StatCard label="Menu Items" value={String(menu.length)} icon={ShoppingBag} trend="Live" />
            <StatCard label="Low Stock Alerts" value={String(lowStockItems.length)} icon={Receipt} trend="Check now" trendDirection="down" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="panel-card rounded-[30px] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">Sales trend</h2>
                  <p className="text-sm text-[var(--muted)]">Rolling 7-day revenue from demo orders.</p>
                </div>
                {isPending && <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Updating</span>}
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '18px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
                      }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel-card rounded-[30px] p-6">
              <h2 className="text-xl font-bold text-[var(--text)]">At-risk inventory</h2>
              <p className="mb-4 text-sm text-[var(--muted)]">Items that need attention before the next rush.</p>
              <div className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                    All items are stocked and ready.
                  </div>
                ) : (
                  lowStockItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-[var(--bg)] px-4 py-3">
                      <div>
                        <div className="font-semibold text-[var(--text)]">{item.name}</div>
                        <div className="text-sm text-[var(--muted)]">{item.sku}</div>
                      </div>
                      <Badge variant={item.available ? 'warning' : 'error'}>
                        {item.available ? `${item.inventoryCount} left` : 'Sold out'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <section className="panel-card rounded-[30px] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Order history and service recovery</h2>
              <p className="text-sm text-[var(--muted)]">Every order can move, refund, void, or print a new receipt.</p>
            </div>
            <div className="rounded-full bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--body)]">
              {orders.length} orders tracked
            </div>
          </div>

          <div className="space-y-4">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status);

              return (
                <article key={order.id} className="glass-panel rounded-[26px] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-[var(--text)]">#{order.orderNumber}</h3>
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        <span className="text-sm capitalize text-[var(--muted)]">{order.type}</span>
                        <span className="text-sm text-[var(--muted)]">{formatDateTime(order.createdAt)}</span>
                      </div>

                      <div className="text-sm text-[var(--body)]">
                        {order.customerName}
                        {order.customerEmail ? ` • ${order.customerEmail}` : ''}
                        {order.address ? ` • ${order.address}` : ''}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item) => (
                          <span key={item.id} className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-sm text-[var(--body)]">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-[280px] space-y-3">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                          <span>Payment</span>
                          <span className="capitalize">{order.paymentMethod}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-semibold text-[var(--body)]">{formatClockTime(order.createdAt)}</span>
                          <span className="text-xl font-bold text-[var(--primary)]">{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {nextStatus && (
                          <button
                            onClick={() => {
                              updateOrderStatus(order.id, nextStatus);
                              setBanner(`Order #${order.orderNumber} moved to ${nextStatus}.`);
                            }}
                            className="rounded-2xl bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-transform hover:scale-[1.02]"
                          >
                            Move to {nextStatus}
                          </button>
                        )}
                        {order.status !== 'voided' && order.status !== 'refunded' && order.status !== 'completed' && (
                          <button
                            onClick={() => {
                              voidOrder(order.id);
                              setBanner(`Order #${order.orderNumber} was voided and inventory restored.`);
                            }}
                            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                          >
                            Void Order
                          </button>
                        )}
                        {order.paymentStatus === 'paid' && order.status !== 'refunded' && order.status !== 'voided' && (
                          <button
                            onClick={() => {
                              refundOrder(order.id);
                              setBanner(`Order #${order.orderNumber} was marked refunded.`);
                            }}
                            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700"
                          >
                            Refund
                          </button>
                        )}
                        <button
                          onClick={() => {
                            markReceiptPrinted(order.id);
                            setBanner(`Receipt reprinted for order #${order.orderNumber}.`);
                          }}
                          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--body)]"
                        >
                          Print Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'menu' && (
        <section className="panel-card space-y-5 rounded-[30px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Live menu and inventory</h2>
              <p className="text-sm text-[var(--muted)]">Search, edit, enable, disable, and remove menu items without dead controls.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-[260px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <input
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  placeholder="Search by item name or SKU"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] py-3 pl-11 pr-4 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--primary)]"
                />
              </label>
              <button
                onClick={openNewItem}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
              >
                <Plus size={18} />
                New Item
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredMenu.map((item) => (
              <article key={item.id} className="flex gap-4 rounded-[26px] border border-[var(--border)] bg-[var(--bg)] p-4">
                <img src={item.image} alt={item.name} className="h-28 w-28 rounded-[22px] object-cover shadow-sm" />
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--text)]">{item.name}</h3>
                      <Badge variant={item.available ? (item.inventoryCount <= item.lowStockThreshold ? 'warning' : 'success') : 'error'}>
                        {item.available ? `${item.inventoryCount} in stock` : 'Unavailable'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--body)]">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                      <span>{item.sku}</span>
                      <span>{item.prepTimeMinutes} min prep</span>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        toggleMenuItemAvailability(item.id);
                        setBanner(`${item.name} is now ${item.available ? 'hidden from ordering' : 'available for sale'}.`);
                      }}
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--body)]"
                    >
                      {item.available ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--body)]"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        deleteMenuItem(item.id);
                        setBanner(`${item.name} was removed from the menu.`);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'team' && (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="panel-card rounded-[30px] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--bg)] p-3 text-[var(--primary)]">
                <UserRoundCog size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text)]">Role switcher</h2>
                <p className="text-sm text-[var(--muted)]">Swap terminal access for demos, training, or staff handoff.</p>
              </div>
            </div>
            <div className="glass-panel rounded-[24px] p-5">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Current staff profile</div>
              <div className="mt-3 text-2xl font-bold text-[var(--text)]">{activeStaff.name}</div>
              <div className="text-sm capitalize text-[var(--body)]">
                {activeStaff.role} • {activeStaff.shiftLabel}
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--body)]">
                PIN ready: <span className="font-mono font-semibold">{activeStaff.pin}</span>
              </div>
            </div>
          </div>

          <div className="panel-card rounded-[30px] p-6">
            <h2 className="text-xl font-bold text-[var(--text)]">Staff roster</h2>
            <p className="mb-5 text-sm text-[var(--muted)]">Every role card below is functional and can become the active terminal user.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {staff.map((member) => (
                <article key={member.id} className="glass-panel rounded-[24px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[var(--text)]">{member.name}</div>
                      <div className="text-sm capitalize text-[var(--body)]">{member.role}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{member.shiftLabel}</div>
                    </div>
                    <Badge variant={member.status === 'clocked-in' ? 'success' : member.status === 'break' ? 'warning' : 'neutral'}>
                      {member.status}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Manager PIN</div>
                      <div className="font-mono text-sm font-semibold text-[var(--text)]">{member.pin}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveStaff(member.id);
                        setBanner(`${member.name} is now the active terminal user.`);
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        activeStaff.id === member.id
                          ? 'bg-[var(--primary)] text-white'
                          : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--body)]'
                      }`}
                    >
                      {activeStaff.id === member.id ? 'Active' : 'Set Active'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="panel-card space-y-5 rounded-[30px] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">Backend and business switching</h2>
                  <p className="text-sm text-[var(--muted)]">Swap branded demos instantly and persist edits to Supabase when configured.</p>
                </div>
                <Badge variant={backendVariant}>{backendLabel}</Badge>
              </div>

              <div className="glass-panel rounded-[24px] p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--body)]">
                  <span className="font-semibold text-[var(--text)]">Mode:</span>
                  <span className="capitalize">{backendMode}</span>
                  <span className="text-[var(--muted)]">
                    {backendMode === 'supabase'
                      ? 'This POS is reading and saving business snapshots to Supabase.'
                      : 'Supabase env vars are missing, so the app is using local client-side snapshots.'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {businessPresets.map((preset) => {
                  const isActive = preset.id === activePresetId;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        applyBusinessPreset(preset.id);
                        setBanner(`${preset.name} is now loaded across admin, kiosk, KDS, and mobile ordering.`);
                      }}
                      className={`overflow-hidden rounded-[26px] border text-left transition-all ${
                        isActive
                          ? 'border-[var(--primary)] bg-[var(--bg)] shadow-[0_18px_36px_rgba(29,78,216,0.12)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      <div
                        className="h-32 w-full bg-cover bg-center"
                        style={{ backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.15), rgba(15,23,42,0.55)), url(${preset.tenantConfig.coverImage})` }}
                      />
                      <div className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-bold text-[var(--text)]">{preset.name}</div>
                            <div className="text-sm text-[var(--muted)]">{preset.description}</div>
                          </div>
                          {isActive && <Badge variant="info">Active</Badge>}
                        </div>
                        <div className="text-sm leading-6 text-[var(--body)]">{preset.tenantConfig.story}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="panel-card space-y-6 rounded-[30px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--bg)] p-3 text-[var(--primary)]">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">Business profile</h2>
                  <p className="text-sm text-[var(--muted)]">These fields power receipts, mobile ordering, and live branded demos.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Business name</span>
                  <input
                    value={tenantConfig.name}
                    onChange={(event) => updateTenantConfig({ name: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Story</span>
                  <textarea
                    value={tenantConfig.story}
                    onChange={(event) => updateTenantConfig({ story: event.target.value })}
                    className="min-h-[110px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Phone</span>
                  <input
                    value={tenantConfig.phone}
                    onChange={(event) => updateTenantConfig({ phone: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Email</span>
                  <input
                    value={tenantConfig.email}
                    onChange={(event) => updateTenantConfig({ email: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Address</span>
                  <input
                    value={tenantConfig.address}
                    onChange={(event) => updateTenantConfig({ address: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Hours</span>
                  <input
                    value={tenantConfig.hours}
                    onChange={(event) => updateTenantConfig({ hours: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Logo URL</span>
                  <input
                    value={tenantConfig.logo}
                    onChange={(event) => updateTenantConfig({ logo: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Cover image URL</span>
                  <input
                    value={tenantConfig.coverImage}
                    onChange={(event) => updateTenantConfig({ coverImage: event.target.value })}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                      <Upload size={14} />
                      Upload Logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleBusinessImageUpload(event, 'logo')}
                      className="text-sm text-[var(--body)]"
                    />
                    <span className="text-sm text-[var(--muted)]">Stores the image directly in the demo snapshot.</span>
                  </label>
                  <label className="grid gap-2 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                      <Upload size={14} />
                      Upload Cover
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleBusinessImageUpload(event, 'coverImage')}
                      className="text-sm text-[var(--body)]"
                    />
                    <span className="text-sm text-[var(--muted)]">Great for client-specific storefront mockups.</span>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Tax rate %</span>
                    <input
                      type="number"
                      value={Number((tenantConfig.taxRate * 100).toFixed(2))}
                      onChange={(event) => updateTenantConfig({ taxRate: Number(event.target.value || 0) / 100 })}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Delivery fee</span>
                    <input
                      type="number"
                      value={tenantConfig.deliveryFee}
                      onChange={(event) => updateTenantConfig({ deliveryFee: Number(event.target.value || 0) })}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Min order</span>
                    <input
                      type="number"
                      value={tenantConfig.minOrder}
                      onChange={(event) => updateTenantConfig({ minOrder: Number(event.target.value || 0) })}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                    />
                  </label>
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Tip options</span>
                  <input
                    value={tenantConfig.defaultTipOptions.join(', ')}
                    onChange={(event) =>
                      updateTenantConfig({
                        defaultTipOptions: event.target.value
                          .split(',')
                          .map((value) => Number(value.trim()))
                          .filter((value) => Number.isFinite(value)),
                      })
                    }
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel-card-strong overflow-hidden rounded-[30px]">
              <div
                className="h-52 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.18), rgba(15,23,42,0.56)), url(${tenantConfig.coverImage})` }}
              />
              <div className="grid gap-5 p-6 md:grid-cols-[120px_1fr] md:items-start">
                <img
                  src={tenantConfig.logo}
                  alt={tenantConfig.name}
                  className="h-24 w-24 rounded-[28px] object-cover shadow-[0_20px_40px_rgba(15,23,42,0.16)]"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-[var(--text)]">{tenantConfig.name}</h2>
                    <Badge variant={backendVariant}>{backendLabel}</Badge>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--body)]">{tenantConfig.story}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    <span>{tenantConfig.address}</span>
                    <span>{tenantConfig.phone}</span>
                    <span>{tenantConfig.hours}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-card rounded-[30px] p-6">
              <h2 className="text-xl font-bold text-[var(--text)]">Theme gallery</h2>
              <p className="mb-5 text-sm text-[var(--muted)]">Apply a polished visual preset across admin, kiosk, KDS, and mobile ordering.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
                  const theme = THEMES[themeName];
                  const selected = currentTheme === themeName;

                  return (
                    <button
                      key={themeName}
                      onClick={() => setTheme(themeName)}
                      className={`rounded-[26px] border p-4 text-left transition-all ${
                        selected
                          ? 'border-[var(--primary)] bg-[var(--bg)] shadow-[0_18px_36px_rgba(29,78,216,0.12)]'
                          : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-lg font-bold text-[var(--text)]">{themeName}</div>
                        {selected && <Badge variant="info">Live</Badge>}
                      </div>
                      <div className="mb-3 flex gap-2">
                        <span className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: theme.bg }} />
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-4" style={{ backgroundColor: theme.surface }}>
                        <div className="mb-2 h-3 w-1/2 rounded-full opacity-80" style={{ backgroundColor: theme.primary }} />
                        <div className="h-2 w-2/3 rounded-full opacity-60" style={{ backgroundColor: theme.muted }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_40px_90px_rgba(15,23,42,0.22)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[var(--text)]">{editingItem.id ? 'Edit menu item' : 'Add menu item'}</h3>
                <p className="text-sm text-[var(--muted)]">Changes save directly into the demo catalog for kiosk and mobile ordering.</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--body)]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Item name</span>
                <input
                  value={editingItem.name}
                  onChange={(event) => setEditingItem({ ...editingItem, name: event.target.value })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Description</span>
                <textarea
                  value={editingItem.description}
                  onChange={(event) => setEditingItem({ ...editingItem, description: event.target.value })}
                  className="min-h-[110px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Price</span>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(event) => setEditingItem({ ...editingItem, price: Number(event.target.value || 0) })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Category</span>
                <select
                  value={editingItem.categoryId}
                  onChange={(event) => setEditingItem({ ...editingItem, categoryId: event.target.value })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                >
                  {Array.from(new Set(menu.map((item) => item.categoryId))).map((categoryId) => (
                    <option key={categoryId} value={categoryId}>
                      {categoryId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Prep time (min)</span>
                <input
                  type="number"
                  value={editingItem.prepTimeMinutes}
                  onChange={(event) => setEditingItem({ ...editingItem, prepTimeMinutes: Number(event.target.value || 0) })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Inventory count</span>
                <input
                  type="number"
                  value={editingItem.inventoryCount}
                  onChange={(event) => setEditingItem({ ...editingItem, inventoryCount: Number(event.target.value || 0) })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Low stock alert</span>
                <input
                  type="number"
                  value={editingItem.lowStockThreshold}
                  onChange={(event) => setEditingItem({ ...editingItem, lowStockThreshold: Number(event.target.value || 0) })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Image URL</span>
                <input
                  value={editingItem.image}
                  onChange={(event) => setEditingItem({ ...editingItem, image: event.target.value })}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="grid gap-2 md:col-span-2 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  <Upload size={14} />
                  Upload Item Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleMenuImageUpload(event)}
                  className="text-sm text-[var(--body)]"
                />
                <span className="text-sm text-[var(--muted)]">Perfect for fast client demos without needing storage buckets first.</span>
              </label>

              <div className="md:col-span-2 overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg)]">
                <img src={editingItem.image} alt={editingItem.name} className="h-52 w-full object-cover" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--body)]">
                <input
                  type="checkbox"
                  checked={editingItem.available}
                  onChange={(event) => setEditingItem({ ...editingItem, available: event.target.checked })}
                />
                Visible in ordering flows
              </label>

              <button
                onClick={saveItem}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 font-semibold text-white"
              >
                <Save size={18} />
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
