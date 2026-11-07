"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  FileImage,
  FolderTree,
  Layers,
  ListChecks,
  Package,
  RefreshCw,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const BASE = "/api/manager/products/overview";

type OverviewPayload = {
  ok: true;
  scope: "manager";
  counts: {
    products: {
      total: number;
      active: number;
      inactive: number;
      featured: number;
    };
    variants: { total: number; lowStock: number; outOfStock: number };
    categories: { total: number; root: number };
    pendingPersonalizations?: number;
  };
  quickStats?: {
    ordersThisMonth?: number;
    topProduct?: { id: string; name: string; units: number } | null;
  };
  recentlyUpdated: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "inactive";
    updatedAt: string;
  }[];
};

/* ------------------------------------------------------------------ */
/*  Menu definition                                                    */
/* ------------------------------------------------------------------ */

type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: (d: OverviewPayload) => string | null;
};

const MANAGE_ITEMS: MenuItem[] = [
  {
    title: "Add a product",
    description:
      "Create a new product with its base info, categories, and showcase settings.",
    href: "/manager/products/new",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    title: "All products",
    description:
      "Browse, search, and edit every product. Filter by status or category.",
    href: "/manager/products/all",
    icon: <Package className="h-5 w-5" />,
    badge: (d) =>
      `${d.counts.products.total} product${d.counts.products.total === 1 ? "" : "s"}`,
  },
  {
    title: "Variants & inventory",
    description:
      "Manage stock, pricing, SKUs, and per-variant options. Spot low-stock fast.",
    href: "/manager/products/variants",
    icon: <Layers className="h-5 w-5" />,
    badge: (d) =>
      d.counts.variants.lowStock > 0
        ? `${d.counts.variants.lowStock} low stock`
        : `${d.counts.variants.total} variants`,
  },
  {
    title: "Options & values",
    description:
      "Colours, sizes, materials — define the choices customers pick from.",
    href: "/manager/products/options",
    icon: <ListChecks className="h-5 w-5" />,
  },
  {
    title: "Personalization fields",
    description:
      "Add custom inputs — names, dates, notes — that shoppers fill at checkout.",
    href: "/manager/products/personalizations",
    icon: <Wand2 className="h-5 w-5" />,
  },
];

const ORGANISE_ITEMS: MenuItem[] = [
  {
    title: "Categories",
    description:
      "Create, reorder, and nest categories. Root and child categories supported.",
    href: "/manager/products/categories",
    icon: <FolderTree className="h-5 w-5" />,
    badge: (d) =>
      `${d.counts.categories.total} categor${d.counts.categories.total === 1 ? "y" : "ies"}`,
  },
  {
    title: "Features & care",
    description:
      "Bullet features, care instructions, and gift inclusions per product.",
    href: "/manager/products/details",
    icon: <BadgeCheck className="h-5 w-5" />,
  },
  {
    title: "Featured & showcase",
    description:
      "Curate what appears first — featured products and main showcase picks.",
    href: "/manager/products/curation",
    icon: <Tag className="h-5 w-5" />,
    badge: (d) =>
      d.counts.products.featured > 0
        ? `${d.counts.products.featured} featured`
        : null,
  },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function ProductManagerHubClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<OverviewPayload>(BASE, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load product overview"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ahem = () => {
      load();
    };
    ahem();
  }, [load]);

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
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  Product Studio
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Everything you need to build, arrange, and maintain the
                  catalogue — products, variants, media, and curation.
                </p>
              </div>

              <button
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && <HubSkeleton />}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {data && !error && (
              <div className="space-y-8">
                <SnapshotStrip data={data} />

                <MenuSection
                  eyebrow="Build & maintain"
                  title="Manage products"
                  subtitle="The day-to-day work of keeping the catalogue healthy."
                  items={MANAGE_ITEMS}
                  data={data}
                />

                <MenuSection
                  eyebrow="Shape the catalogue"
                  title="Organise & curate"
                  subtitle="Categories, highlights, and the finer details."
                  items={ORGANISE_ITEMS}
                  data={data}
                />

                <RecentlyUpdated items={data.recentlyUpdated} />
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Snapshot strip                                                     */
/* ================================================================== */

function SnapshotStrip({ data }: { data: OverviewPayload }) {
  const { counts } = data;

  const items = [
    {
      label: "Products",
      value: counts.products.total.toLocaleString("en-IN"),
      hint: `${counts.products.active} active · ${counts.products.inactive} inactive`,
      icon: <Boxes className="h-3.5 w-3.5" />,
    },
    {
      label: "Variants",
      value: counts.variants.total.toLocaleString("en-IN"),
      hint:
        counts.variants.lowStock > 0
          ? `${counts.variants.lowStock} low · ${counts.variants.outOfStock} out`
          : "All well-stocked",
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      label: "Categories",
      value: counts.categories.total.toLocaleString("en-IN"),
      hint: `${counts.categories.root} root categor${counts.categories.root === 1 ? "y" : "ies"}`,
      icon: <FolderTree className="h-3.5 w-3.5" />,
    },
    {
      label: "Featured",
      value: counts.products.featured.toLocaleString("en-IN"),
      hint: "Showcased on landing",
      icon: <Tag className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-stone-900">{it.icon}</span>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-rose-500/80">
              {it.label}
            </p>
          </div>
          <p className="mt-1.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
            {it.value}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-stone-400">
            {it.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Menu section                                                       */
/* ================================================================== */

function MenuSection({
  eyebrow,
  title,
  subtitle,
  items,
  data,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: MenuItem[];
  data: OverviewPayload;
}) {
  return (
    <div>
      <div className="mb-4 max-w-2xl">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const badge = it.badge?.(data);
          return (
            <Link
              key={it.title}
              href={it.href}
              className="group flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900 sm:h-11 sm:w-11">
                  {it.icon}
                </div>
                {badge && (
                  <span className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                    {badge}
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-base font-semibold text-stone-900">
                {it.title}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-stone-600">
                {it.description}
              </p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 transition-colors group-hover:text-rose-600">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Recently updated                                                   */
/* ================================================================== */

function RecentlyUpdated({
  items,
}: {
  items: OverviewPayload["recentlyUpdated"];
}) {
  return (
    <div>
      <div className="mb-4 max-w-2xl">
        <SectionEyebrow>Last touched</SectionEyebrow>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          Recently updated
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-6 text-xs text-stone-500">
            <AlertCircle className="h-3.5 w-3.5 text-stone-900" />
            No products yet.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {p.name}
                  </p>
                  <p className="truncate font-mono text-[10px] text-stone-400">
                    {p.slug}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                    p.status === "active"
                      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                      : "border-stone-200/70 bg-stone-50 text-stone-600"
                  }`}
                >
                  {p.status}
                </span>
                <Link
                  href={`/manager/products/${p.id}`}
                  className="shrink-0 rounded-full border border-rose-200/70 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Skeleton / error                                                   */
/* ================================================================== */

function HubSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
          />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s}>
          <div className="mb-4 h-6 w-48 animate-pulse rounded-full bg-stone-200/70" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-800">
          Couldn&apos;t load the product overview
        </p>
        <p className="mt-0.5 text-xs text-rose-700">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}
