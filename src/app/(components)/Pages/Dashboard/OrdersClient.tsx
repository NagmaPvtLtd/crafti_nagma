"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import { formatCurrency } from "../../../../utils/Formator/formatCurrency.util";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrderStatus = "pending" | "shipped" | "completed" | "cancelled";

type OrderListItem = {
  id: string;
  placed: string;
  total: number;
  status: OrderStatus;
  items: { name: string; quantity: number }[];
};

/**
 * Cleared until the orders API exists — no sample customers, amounts or
 * dates. The list layout is ready for the real rows.
 */
const ORDERS: OrderListItem[] = [];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  shipped: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-stone-200 bg-stone-100 text-stone-500",
};

const STATUS_ICONS = {
  pending: Clock,
  shipped: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
} as const;

/* ------------------------------------------------------------------ */
/*  Order row — a list line, not a card                                */
/* ------------------------------------------------------------------ */

function OrderRow({ order }: { order: OrderListItem }) {
  const StatusIcon = STATUS_ICONS[order.status];
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1.4fr_0.8fr_auto] sm:items-center sm:gap-4 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
            {order.id}
          </span>
          <span className="text-[11px] text-stone-400">
            Placed {order.placed}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-stone-900">
          {order.items.length > 0
            ? order.items.map((item) => item.name).join(", ")
            : "No items"}
        </p>
        <p className="mt-0.5 text-[11px] text-stone-500">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      </div>

      <p className="text-sm font-semibold tabular-nums text-stone-900 sm:text-right">
        {formatCurrency(order.total)}
      </p>

      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:justify-self-end ${STATUS_STYLES[order.status]}`}
      >
        <StatusIcon className="h-3 w-3" />
        {order.status}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-400">
        <Package aria-hidden className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <h3 className="text-base font-semibold text-stone-900">No orders yet</h3>
      <p className="max-w-xs text-sm leading-relaxed text-stone-500">
        Start shopping to see your orders here and track your journey from
        crafting to delivery.
      </p>
      <Link
        href="/collections"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        Browse collections
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OrdersPage() {
  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow>Customer orders</SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              Your Orders
            </h1>
          </div>

          <Link
            href="/collections"
            className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-2 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse collections
          </Link>
        </div>

        <SectionDivider className="my-6" size={11} />

        <div className="mb-4 max-w-2xl">
          <SectionEyebrow>Recent activity</SectionEyebrow>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            Latest orders
          </h2>
        </div>

        {ORDERS.length > 0 ? (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
            {ORDERS.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </div>
    </PageWrapper>
  );
}
