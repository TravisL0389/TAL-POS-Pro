export const STORAGE_KEYS = {
  orders: 'localpos_v2_orders',
  menu: 'localpos_v2_menu',
  config: 'localpos_v2_config',
  staff: 'localpos_v2_staff',
  activeStaffId: 'localpos_v2_active_staff',
  currentBusinessId: 'localpos_v2_current_business',
  businessSnapshot: (businessId: string) => `localpos_v2_snapshot_${businessId}`,
} as const;

export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const createId = (prefix: string): string => {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

export const formatTimeElapsed = (dateString: string): string => {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatClockTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};
