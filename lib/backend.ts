import { MenuItem, Order, StaffMember, TenantConfig } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export interface BusinessSnapshot {
  tenantConfig: TenantConfig;
  menu: MenuItem[];
  orders: Order[];
  staff: StaffMember[];
}

interface BusinessRow {
  id: string;
  name: string;
  config: TenantConfig;
  menu: MenuItem[];
  orders: Order[];
  staff: StaffMember[];
}

const TABLE_NAME = 'pos_businesses';

export const loadBusinessSnapshot = async (businessId: string): Promise<BusinessSnapshot | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', businessId).maybeSingle<BusinessRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    tenantConfig: data.config,
    menu: data.menu || [],
    orders: data.orders || [],
    staff: data.staff || [],
  };
};

export const saveBusinessSnapshot = async (snapshot: BusinessSnapshot): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).upsert({
    id: snapshot.tenantConfig.id,
    name: snapshot.tenantConfig.name,
    config: snapshot.tenantConfig,
    menu: snapshot.menu,
    orders: snapshot.orders,
    staff: snapshot.staff,
  });

  if (error) {
    throw error;
  }
};

export const getBackendMode = (): 'supabase' | 'local' => {
  return isSupabaseConfigured() ? 'supabase' : 'local';
};
