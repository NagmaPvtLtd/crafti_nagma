"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  ChevronRight,
  FolderTree,
  Layers,
  ListChecks,
  Package,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react";
import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import ErrorState from "../../utils/ErrorState";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const BASE = "/api/manager/product-studio/overview";

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
    options?: { total: number };
    pendingPersonalizations?: number;
  };
  quickStats?: {
    ordersThisMonth?: number;
    topProduct?: { id: string; name: string; units: number } | null;
  };
  recentlyUpdated: {
    id: string;
    code: string;
    name: string;
    slug: string;
    status: "active" | "inactive";
    updatedAt: string;
    /** Product-level cover first, else the first variant photo. */
    imageUrl: string | null;
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
    href: "/manager/product-studio/products/new",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    title: "All products",
    description:
      "Browse, search, and edit every product. Filter by status or category.",
    href: "/manager/product-studio/products",
    icon: <Package className="h-5 w-5" />,
    badge: (d) =>
      `${d.counts.products.total} product${d.counts.products.total === 1 ? "" : "s"}`,
  },
];

const GLOBAL_ITEMS: MenuItem[] = [
  {
    title: "Global Categories",
    description:
      "Create categories & sub categories to assign to your products.",
    href: "/manager/product-studio/categories",
    icon: <FolderTree className="h-5 w-5" />,
    // Always the parent (main) categories — sub categories are counted inside them.
    badge: (d) =>
      `${d.counts.categories.root} categor${d.counts.categories.root === 1 ? "y" : "ies"}`,
  },
  {
    title: "Global Options",
    description:
      "Create all the pool of options you want to give your product to have.",
    href: "/manager/product-studio/options",
    icon: <ListChecks className="h-5 w-5" />,
    badge: (d) =>
      d.counts.options
        ? `${d.counts.options.total} option${d.counts.options.total === 1 ? "" : "s"}`
        : null,
  },
  {
    title: "Global Tags",
    description:
      "One reusable tag master for search — rename or clean up tags in one place.",
    href: "/manager/product-studio/tags",
    icon: <Tag className="h-5 w-5" />,
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
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow href="/manager/dashboard">
              Store Dashboard
            </SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              Product Studio
            </h1>
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

        <SectionDivider className="my-6" size={11} />

        {loading && !data && <HubSkeleton />}

        {error && !loading && (
          <ErrorState
            title="Couldn't load the product overview"
            message={error}
            onRetry={() => void load()}
          />
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
              subtitle="The shared pools every product draws from — categories and options."
              items={GLOBAL_ITEMS}
              data={data}
            />

            <RecentlyUpdated items={data.recentlyUpdated} />
          </div>
        )}
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

      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-white/70 px-4 py-6 text-xs text-stone-500 sm:rounded-3xl">
          <AlertCircle className="h-3.5 w-3.5 text-stone-900" />
          No products yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/manager/product-studio/products/${p.code || p.id}`}
                aria-label={`Open ${p.name}`}
                className="group flex items-start gap-3 rounded-2xl border border-white/60 bg-white/85 p-3 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:items-center sm:gap-4 sm:rounded-3xl sm:p-4"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:h-11 sm:w-11">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium wrap-break-word text-stone-900">
                    {p.name}
                  </p>
                  <p className="text-[10px] break-all text-stone-400">
                    Code: <span className="font-mono">{p.code}</span>
                  </p>

                  {/* Mobile: status sits under the name instead of squeezing
                      it, so a long name wraps and is never cut. */}
                  <div className="mt-2 sm:hidden">
                    <StatusPill status={p.status} />
                  </div>
                </div>

                <div className="hidden shrink-0 sm:block">
                  <StatusPill status={p.status} />
                </div>

                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500 sm:mt-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        status === "active"
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
          : "border-stone-200/70 bg-stone-50 text-stone-600"
      }`}
    >
      {status}
    </span>
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
