"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  FolderTree,
  PackageX,
  Plus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import ErrorState from "../../utils/ErrorState";
import CustomLoader from "../../CustomLoader";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

const OVERVIEW_URL = "/api/manager/product-studio/overview";
const PRODUCTS_URL = "/manager/product-studio/products";

type OverviewPayload = {
  ok: true;
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
  };
  quickStats?: {
    topProduct?: { id: string; name: string; units: number } | null;
  };
};

/**
 * The manager's first screen: only what needs a decision today.
 *
 * No catalogue totals here — the Product Studio hub already owns those. This
 * page answers three questions instead: what is broken (stock, hidden
 * listings), what is selling, and where to start working.
 */
export default function ManagerDashboardClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<OverviewPayload>(OVERVIEW_URL, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Could not load the dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void load();
    };
    run();
  }, [load]);

  const counts = data?.counts;
  const topProduct = data?.quickStats?.topProduct ?? null;

  /* Only the problems worth acting on; a zero is not news. */
  const attention = counts
    ? [
        {
          show: counts.variants.outOfStock > 0,
          label: "Out of stock",
          value: counts.variants.outOfStock,
          hint: "Variants a customer cannot buy",
          href: PRODUCTS_URL,
          icon: <PackageX className="h-4 w-4" />,
          tone: "rose" as const,
        },
        {
          show: counts.variants.lowStock > 0,
          label: "Low stock",
          value: counts.variants.lowStock,
          hint: "Five or fewer left",
          href: PRODUCTS_URL,
          icon: <AlertTriangle className="h-4 w-4" />,
          tone: "amber" as const,
        },
        {
          show: counts.products.inactive > 0,
          label: "Disabled products",
          value: counts.products.inactive,
          hint: "Hidden from the storefront",
          href: PRODUCTS_URL,
          icon: <Boxes className="h-4 w-4" />,
          tone: "stone" as const,
        },
      ].filter((item) => item.show)
    : [];

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow>Manager</SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              Dashboard
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

        {loading && !data && (
          <CustomLoader fullScreen={false} label="Loading the store…" />
        )}

        {error && !loading && (
          <ErrorState
            title="Couldn't load the dashboard"
            message={error}
            onRetry={() => void load()}
          />
        )}

        {data && !error && (
          <div className="space-y-8">
            {/* 1. What needs you today */}
            <section>
              <SectionEyebrow>Needs you</SectionEyebrow>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Fix these first
              </h2>

              {attention.length === 0 ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-xs font-medium text-emerald-800">
                  <Boxes className="h-3.5 w-3.5" />
                  Everything is stocked and live — nothing needs you right now.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {attention.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex items-start gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          item.tone === "rose"
                            ? "bg-rose-50 text-rose-600"
                            : item.tone === "amber"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-lg leading-none font-semibold tabular-nums text-stone-900">
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-stone-800">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-500">
                          {item.hint}
                        </p>
                      </div>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 2. What is selling */}
            <section>
              <SectionEyebrow>Selling</SectionEyebrow>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Best seller this month
              </h2>

              {topProduct ? (
                <Link
                  href={`${PRODUCTS_URL}/${topProduct.id}`}
                  className="group mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold wrap-break-word text-stone-900">
                        {topProduct.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {topProduct.units} unit
                        {topProduct.units === 1 ? "" : "s"} sold in the last 30
                        days
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                    Open
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-stone-200 bg-white/70 px-4 py-3 text-xs text-stone-500">
                  No sales in the last 30 days yet.
                </p>
              )}
            </section>

            {/* 3. Where to start */}
            <section>
              <SectionEyebrow>Start here</SectionEyebrow>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Pick up the catalogue
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ActionCard
                  href="/manager/product-studio/products/new"
                  icon={<Plus className="h-4 w-4" />}
                  title="Add a product"
                  hint="Create a base product"
                />
                <ActionCard
                  href={PRODUCTS_URL}
                  icon={<Boxes className="h-4 w-4" />}
                  title="All products"
                  hint="Edit, add variants, fix photos"
                />
                <ActionCard
                  href="/manager/product-studio/categories"
                  icon={<FolderTree className="h-4 w-4" />}
                  title="Categories"
                  hint="Shape the shelves"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function ActionCard({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-900">{title}</p>
        <p className="mt-0.5 text-[11px] text-stone-500">{hint}</p>
      </div>
      <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
    </Link>
  );
}
