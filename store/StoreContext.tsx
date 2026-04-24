import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BusinessPreset,
  CartItem,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  StaffMember,
  TenantConfig,
  ThemeName,
} from '../types';
import {
  BUSINESS_PRESETS,
  DEFAULT_PRESET_ID,
  getBusinessPreset,
  MOCK_CATEGORIES,
  MOCK_STAFF,
} from '../config/constants';
import { BusinessSnapshot, getBackendMode, loadBusinessSnapshot, saveBusinessSnapshot } from '../lib/backend';
import { createId, getStorageItem, setStorageItem, slugify, STORAGE_KEYS } from '../lib/utils';

interface StoreState {
  orders: Order[];
  categories: MenuCategory[];
  menu: MenuItem[];
  staff: StaffMember[];
  activeStaff: StaffMember;
  tenantConfig: TenantConfig;
  currentTheme: ThemeName;
  businessPresets: BusinessPreset[];
  backendMode: 'supabase' | 'local';
  backendStatus: 'local' | 'syncing' | 'live' | 'error';
  addOrder: (order: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  refundOrder: (orderId: string) => void;
  voidOrder: (orderId: string) => void;
  markReceiptPrinted: (orderId: string) => void;
  markReceiptEmailed: (orderId: string, email: string) => void;
  updateTenantConfig: (config: Partial<TenantConfig>) => void;
  setTheme: (theme: ThemeName) => void;
  upsertMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (itemId: string) => void;
  toggleMenuItemAvailability: (itemId: string) => void;
  setActiveStaff: (staffId: string) => void;
  applyBusinessPreset: (presetId: string) => void;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getNextOrderNumber = (orders: Order[]) => {
  const maxNumber = orders.reduce((highest, order) => {
    const value = Number(order.orderNumber);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 1046);

  return String(maxNumber + 1);
};

const updateInventoryFromOrder = (menu: MenuItem[], items: CartItem[], direction: 'decrement' | 'increment') => {
  return menu.map((menuItem) => {
    const orderedQuantity = items
      .filter((item) => item.menuItemId === menuItem.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (!orderedQuantity) {
      return menuItem;
    }

    const nextCount =
      direction === 'decrement'
        ? Math.max(0, menuItem.inventoryCount - orderedQuantity)
        : menuItem.inventoryCount + orderedQuantity;

    return {
      ...menuItem,
      inventoryCount: nextCount,
      available: nextCount > 0,
    };
  });
};

const toSnapshot = (
  tenantConfig: TenantConfig,
  menu: MenuItem[],
  orders: Order[],
  staff: StaffMember[],
): BusinessSnapshot => ({
  tenantConfig,
  menu,
  orders,
  staff,
});

const getPresetSnapshot = (presetId: string): BusinessSnapshot => {
  const preset = getBusinessPreset(presetId);

  return toSnapshot(
    clone(preset.tenantConfig),
    clone(preset.menu),
    clone(preset.orders),
    clone(MOCK_STAFF),
  );
};

const getStoredSnapshot = (businessId: string): BusinessSnapshot | null => {
  return getStorageItem<BusinessSnapshot | null>(STORAGE_KEYS.businessSnapshot(businessId), null);
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const backendMode = getBackendMode();
  const initialBusinessId =
    getStorageItem(STORAGE_KEYS.currentBusinessId, DEFAULT_PRESET_ID) || DEFAULT_PRESET_ID;
  const initialSnapshot = getStoredSnapshot(initialBusinessId) || getPresetSnapshot(initialBusinessId);

  const [categories] = useState<MenuCategory[]>(MOCK_CATEGORIES);
  const [businessPresets] = useState<BusinessPreset[]>(BUSINESS_PRESETS.map((preset) => clone(preset)));
  const [orders, setOrders] = useState<Order[]>(initialSnapshot.orders);
  const [menu, setMenu] = useState<MenuItem[]>(initialSnapshot.menu);
  const [staff, setStaff] = useState<StaffMember[]>(initialSnapshot.staff);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>(initialSnapshot.tenantConfig);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialSnapshot.tenantConfig.theme);
  const [activeStaffId, setActiveStaffId] = useState<string>(() =>
    getStorageItem(STORAGE_KEYS.activeStaffId, MOCK_STAFF[0].id),
  );
  const [currentBusinessId, setCurrentBusinessId] = useState<string>(initialBusinessId);
  const [backendStatus, setBackendStatus] = useState<'local' | 'syncing' | 'live' | 'error'>(
    backendMode === 'supabase' ? 'syncing' : 'local',
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.activeStaffId, activeStaffId);
  }, [activeStaffId]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.currentBusinessId, currentBusinessId);
  }, [currentBusinessId]);

  const activeStaff = useMemo(() => {
    return staff.find((member) => member.id === activeStaffId) || staff[0];
  }, [activeStaffId, staff]);

  const hydratePreset = useCallback(async (presetId: string) => {
    const fallbackSnapshot = getStoredSnapshot(presetId) || getPresetSnapshot(presetId);

    if (backendMode === 'local') {
      setTenantConfig(fallbackSnapshot.tenantConfig);
      setCurrentTheme(fallbackSnapshot.tenantConfig.theme);
      setMenu(fallbackSnapshot.menu);
      setOrders(fallbackSnapshot.orders);
      setStaff(fallbackSnapshot.staff);
      setBackendStatus('local');
      setHydrated(true);
      return;
    }

    setBackendStatus('syncing');

    try {
      const remoteSnapshot = await loadBusinessSnapshot(presetId);
      const nextSnapshot = remoteSnapshot || fallbackSnapshot;

      setTenantConfig(nextSnapshot.tenantConfig);
      setCurrentTheme(nextSnapshot.tenantConfig.theme);
      setMenu(nextSnapshot.menu);
      setOrders(nextSnapshot.orders);
      setStaff(nextSnapshot.staff);

      if (!remoteSnapshot) {
        await saveBusinessSnapshot(nextSnapshot);
      }

      setBackendStatus('live');
    } catch {
      setTenantConfig(fallbackSnapshot.tenantConfig);
      setCurrentTheme(fallbackSnapshot.tenantConfig.theme);
      setMenu(fallbackSnapshot.menu);
      setOrders(fallbackSnapshot.orders);
      setStaff(fallbackSnapshot.staff);
      setBackendStatus('error');
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void hydratePreset(currentBusinessId);
  }, [currentBusinessId, hydratePreset]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const snapshot = toSnapshot(tenantConfig, menu, orders, staff);
    setStorageItem(STORAGE_KEYS.businessSnapshot(currentBusinessId), snapshot);

    if (backendMode !== 'supabase') {
      setBackendStatus('local');
      return;
    }

    setBackendStatus('syncing');
    const timeout = window.setTimeout(async () => {
      try {
        await saveBusinessSnapshot(snapshot);
        setBackendStatus('live');
      } catch {
        setBackendStatus('error');
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [backendMode, currentBusinessId, hydrated, menu, orders, staff, tenantConfig]);

  const addOrder = useCallback(
    (orderData: Partial<Order>): Order => {
      const orderNumber = getNextOrderNumber(orders);
      const createdAt = new Date().toISOString();
      const items = orderData.items || [];

      const newOrder: Order = {
        id: createId('order'),
        orderNumber,
        status: orderData.status || 'received',
        type: orderData.type || 'takeout',
        items,
        subtotal: orderData.subtotal || 0,
        discount: orderData.discount || 0,
        discountLabel: orderData.discountLabel,
        tax: orderData.tax || 0,
        deliveryFee: orderData.deliveryFee || 0,
        tip: orderData.tip || 0,
        total: orderData.total || 0,
        customerName: orderData.customerName || 'Walk-in Guest',
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        address: orderData.address,
        paymentMethod: orderData.paymentMethod || 'card',
        paymentStatus: orderData.paymentStatus || 'paid',
        createdAt,
        estimatedTime: orderData.estimatedTime || '10-15 mins',
        notes: orderData.notes,
        splitPayment: orderData.splitPayment,
        tenderedCash: orderData.tenderedCash,
        changeDue: orderData.changeDue,
        staffId: orderData.staffId || activeStaff.id,
        staffName: orderData.staffName || activeStaff.name,
      };

      setOrders((previousOrders) => [newOrder, ...previousOrders]);
      setMenu((previousMenu) => updateInventoryFromOrder(previousMenu, items, 'decrement'));

      return newOrder;
    },
    [activeStaff.id, activeStaff.name, orders],
  );

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              completedAt: status === 'completed' ? new Date().toISOString() : order.completedAt,
            }
          : order,
      ),
    );
  }, []);

  const refundOrder = useCallback((orderId: string) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: 'refunded',
              paymentStatus: 'refunded',
            }
          : order,
      ),
    );
  }, []);

  const voidOrder = useCallback(
    (orderId: string) => {
      const orderToVoid = orders.find((order) => order.id === orderId);
      if (!orderToVoid || orderToVoid.status === 'voided') {
        return;
      }

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: 'voided',
                paymentStatus: 'voided',
              }
            : order,
        ),
      );

      setMenu((previousMenu) => updateInventoryFromOrder(previousMenu, orderToVoid.items, 'increment'));
    },
    [orders],
  );

  const markReceiptPrinted = useCallback((orderId: string) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId ? { ...order, receiptPrintedAt: new Date().toISOString() } : order,
      ),
    );
  }, []);

  const markReceiptEmailed = useCallback((orderId: string, email: string) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              customerEmail: email,
              receiptSentAt: new Date().toISOString(),
            }
          : order,
      ),
    );
  }, []);

  const updateTenantConfig = useCallback((config: Partial<TenantConfig>) => {
    setTenantConfig((previousConfig) => ({ ...previousConfig, ...config }));
  }, []);

  const setTheme = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    setTenantConfig((previousConfig) => ({ ...previousConfig, theme }));
  }, []);

  const upsertMenuItem = useCallback((item: MenuItem) => {
    setMenu((previousMenu) => {
      const existingItem = previousMenu.find((menuItem) => menuItem.id === item.id);
      if (existingItem) {
        return previousMenu.map((menuItem) => (menuItem.id === item.id ? item : menuItem));
      }

      return [
        {
          ...item,
          id: item.id || createId('menu'),
          sku: item.sku || `SKU-${slugify(item.name).toUpperCase()}`,
        },
        ...previousMenu,
      ];
    });
  }, []);

  const deleteMenuItem = useCallback((itemId: string) => {
    setMenu((previousMenu) => previousMenu.filter((item) => item.id !== itemId));
  }, []);

  const toggleMenuItemAvailability = useCallback((itemId: string) => {
    setMenu((previousMenu) =>
      previousMenu.map((item) =>
        item.id === itemId
          ? {
              ...item,
              available: !item.available,
            }
          : item,
      ),
    );
  }, []);

  const setActiveStaff = useCallback((staffId: string) => {
    setActiveStaffId(staffId);
  }, []);

  const applyBusinessPreset = useCallback((presetId: string) => {
    const nextSnapshot = getStoredSnapshot(presetId) || getPresetSnapshot(presetId);
    setCurrentBusinessId(presetId);
    setTenantConfig(clone(nextSnapshot.tenantConfig));
    setCurrentTheme(nextSnapshot.tenantConfig.theme);
    setMenu(clone(nextSnapshot.menu));
    setOrders(clone(nextSnapshot.orders));
    setStaff(clone(nextSnapshot.staff));
    setBackendStatus(backendMode === 'supabase' ? 'syncing' : 'local');
  }, [backendMode]);

  const value = useMemo(
    () => ({
      orders,
      categories,
      menu,
      staff,
      activeStaff,
      tenantConfig,
      currentTheme,
      businessPresets,
      backendMode,
      backendStatus,
      addOrder,
      updateOrderStatus,
      refundOrder,
      voidOrder,
      markReceiptPrinted,
      markReceiptEmailed,
      updateTenantConfig,
      setTheme,
      upsertMenuItem,
      deleteMenuItem,
      toggleMenuItemAvailability,
      setActiveStaff,
      applyBusinessPreset,
    }),
    [
      activeStaff,
      addOrder,
      applyBusinessPreset,
      backendMode,
      backendStatus,
      businessPresets,
      categories,
      currentTheme,
      deleteMenuItem,
      markReceiptEmailed,
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
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return context;
};
