import React from 'react';
import { ChefHat, ChevronRight, Clock3, PackageCheck, PackageOpen } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useStore } from '../../store/StoreContext';
import { OrderStatus } from '../../types';
import { formatTimeElapsed } from '../../lib/utils';

const columns: { title: string; status: OrderStatus; variant: 'info' | 'warning' | 'success' }[] = [
  { title: 'New Tickets', status: 'received', variant: 'info' },
  { title: 'Preparing', status: 'preparing', variant: 'warning' },
  { title: 'Ready for Pickup', status: 'ready', variant: 'success' },
];

const getNextStatus = (status: OrderStatus): OrderStatus | null => {
  if (status === 'received') return 'preparing';
  if (status === 'preparing') return 'ready';
  if (status === 'ready') return 'completed';
  return null;
};

export const KDSSurface: React.FC = () => {
  const { orders, updateOrderStatus } = useStore();
  const liveOrders = orders.filter((order) => ['received', 'preparing', 'ready'].includes(order.status));

  return (
    <div className="kds-surface mx-auto w-full max-w-[1680px] space-y-6">
      <section className="grid-accent overflow-hidden rounded-[34px] border border-[var(--border-strong)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--text)_94%,transparent),color-mix(in_srgb,var(--primary)_48%,black))] px-6 py-8 text-white shadow-[var(--shadow-strong)]">
        <div className="responsive-kds-header flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              <ChefHat size={14} />
              Kitchen display system
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">Fast, readable ticket flow for the prep line.</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Tap one button to move tickets forward. This surface is optimized for quick glances, clear status, and big touch targets.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Open tickets</div>
            <div className="mt-2 text-4xl font-bold">{liveOrders.length}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = liveOrders.filter((order) => order.status === column.status);

          return (
            <div key={column.status} className="panel-card rounded-[30px] p-5">
              <div className="responsive-summary-row mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">{column.title}</h2>
                  <p className="text-sm text-[var(--muted)]">{columnOrders.length} tickets</p>
                </div>
                <Badge variant={column.variant}>{column.status}</Badge>
              </div>

              <div className="space-y-4">
                {columnOrders.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-10 text-center">
                    <PackageCheck size={34} className="mx-auto mb-3 text-[var(--muted)]" />
                    <div className="text-sm font-medium text-[var(--muted)]">No tickets in this lane.</div>
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const nextStatus = getNextStatus(order.status);

                    return (
                      <article key={order.id} className="glass-panel rounded-[26px] p-4">
                        <div className="responsive-summary-row mb-4 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-2xl font-bold text-[var(--text)]">#{order.orderNumber}</div>
                            <div className="text-sm capitalize text-[var(--body)]">
                              {order.type} • {order.customerName}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white/85 px-3 py-2 text-right text-sm">
                            <div className="flex items-center gap-1 text-[var(--muted)]">
                              <Clock3 size={14} />
                              {formatTimeElapsed(order.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-[22px] bg-white/90 px-4 py-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg)] text-sm font-bold text-[var(--text)]">
                                {item.quantity}x
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-[var(--text)]">{item.name}</div>
                                {item.selectedModifiers.length > 0 && (
                                  <div className="text-sm text-[var(--muted)]">
                                    {item.selectedModifiers.map((modifier) => modifier.name).join(', ')}
                                  </div>
                                )}
                                {item.notes && <div className="text-sm italic text-amber-600">{item.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {nextStatus ? (
                          <button
                            onClick={() => updateOrderStatus(order.id, nextStatus)}
                            className="touch-button-lg mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--text)] px-4 py-4 text-base font-semibold text-[var(--bg)] hover:scale-[1.01]"
                          >
                            Move to {nextStatus}
                            <ChevronRight size={18} />
                          </button>
                        ) : (
                          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-semibold text-[var(--muted)]">
                            <PackageOpen size={18} />
                            Workflow complete
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
