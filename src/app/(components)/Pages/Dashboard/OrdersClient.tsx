"use client";

import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

// Mock order data
const MOCK_ORDERS = [
  {
    id: "ord-001",
    customer: "Riya Sharma",
    total: 2499,
    status: "completed",
    items: [
      { name: "Rose Garden Granny Square Blanket", price: 2499, quantity: 1 },
      { name: "Lavender Embroidery Pillow", price: 149, quantity: 2 },
    ],
    placed: "2026-11-10",
    shipped: "2026-11-12",
  },
  {
    id: "ord-002",
    customer: "Arjun Mehta",
    total: 899,
    status: "pending",
    items: [
      { name: "Tiny Treasures Gift Hamper", price: 499, quantity: 1 },
      { name: "Personalized Name Necklace", price: 199, quantity: 1 },
    ],
    placed: "2026-11-09",
    shipped: null,
  },
  {
    id: "ord-003",
    customer: "Priya Desai",
    total: 1599,
    status: "shipped",
    items: [
      { name: "Boho Wall Hanging", price: 799, quantity: 1 },
      { name: "Handmade Throw Pillow", price: 349, quantity: 2 },
    ],
    placed: "2026-11-08",
    shipped: "2026-11-13",
  },
  {
    id: "ord-004",
    customer: "Mohit Kumar",
    total: 4299,
    status: "cancelled",
    items: [{ name: "Crafty Home Collection", price: 4299, quantity: 1 }],
    placed: "2026-11-07",
    shipped: null,
  },
];

function OrderCard({ order }: { order: (typeof MOCK_ORDERS)[0] }) {
  const statusClass = order.status;
  const statusIcon =
    statusClass === "completed"
      ? "✅"
      : statusClass === "pending"
        ? "⏳"
        : "🚚";

  return (
    <div className="group flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
            {order.id}
          </p>
          <h3 className="mt-1 text-base font-semibold text-stone-900">
            {order.customer}
          </h3>
          <p className="mt-0.5 text-sm text-stone-600">
            {order.total.toLocaleString()} INR
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600`}
        >
          {statusIcon} {order.status}
        </span>
      </div>

      <div className="mb-3 text-xs text-stone-500">
        Placed on {order.placed}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {order.items.map((item, i) => (
          <span
            key={i}
            className="rounded-full border border-stone-200 bg-stone-50/80 px-2 py-0.5 text-[10px] text-stone-600"
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderStats() {
  const counts = {
    completed: MOCK_ORDERS.filter((o) => o.status === "completed").length,
    pending: MOCK_ORDERS.filter((o) => o.status === "pending").length,
    shipped: MOCK_ORDERS.filter((o) => o.status === "shipped").length,
    cancelled: MOCK_ORDERS.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(counts).map(([key, value]) => (
        <div key={key} className="text-center">
          <p className="text-base font-semibold tracking-tight text-stone-900 sm:text-xl md:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-rose-500/80 sm:text-[11px]">
            {key}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-400">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V3H4v10a2 2 0 002 2h12a2 2 0 002-2zm0 0v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8m4 3v3m8-3v3"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-stone-900">No orders yet</h3>
      <p className="max-w-xs text-center text-sm text-stone-500">
        Start shopping to see your orders here and track your journey from
        crafting to delivery.
      </p>
      <button
        type="button"
        onClick={() => {}}
        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
      >
        Browse products
      </button>
    </div>
  );
}

function OrderSummary() {
  const total = MOCK_ORDERS.reduce((sum, o) => sum + o.total, 0);
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm sm:rounded-3xl sm:p-6">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-rose-500">
        Order Summary
      </div>
      <div className="text-2xl font-bold text-stone-900">
        Total Amount:
        <span className="text-rose-600"> {total.toLocaleString()} INR</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Across {MOCK_ORDERS.length} orders
      </p>
    </div>
  );
}

const visible = MOCK_ORDERS.length > 0;

export default function OrdersPage() {
  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex flex-col overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        {/* Header */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionEyebrow>Customer orders</SectionEyebrow>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  Your Orders
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Track your handmade journey — from order to delivery, all in
                  one place. Every piece is crafted with care just for you.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
              >
                Browse products
              </button>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            <div className="space-y-8">
              {visible ? (
                <>
                  <OrderStats />
                  <OrderSummary />

                  <div>
                    <div className="mb-6 max-w-2xl">
                      <SectionEyebrow>Recent activity</SectionEyebrow>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                        Latest orders
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600">
                        Your most recent handmade purchases and their current
                        status.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {MOCK_ORDERS.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
