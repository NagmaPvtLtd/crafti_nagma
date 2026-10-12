// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getPool } from "../../../../lib/Database/main.db";
import { requireAdmin } from "../../../../utils/Auth/Auth.requireRole.util";

type DbPool = Awaited<ReturnType<typeof getPool>>;

export type RangeType = "30d" | "90d" | "365d" | "lifetime";
type BucketType = "day" | "week" | "month";

export interface TrendDatum {
  label: string;
  count: number;
}

const ALLOWED_RANGES = ["30d", "90d", "365d", "lifetime"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseRange(v: string | null): RangeType {
  return v && (ALLOWED_RANGES as readonly string[]).includes(v)
    ? (v as RangeType)
    : "90d";
}

function rangeWindow(range: RangeType): {
  start: Date | null;
  end: Date;
  bucket: BucketType;
} {
  const end = new Date();
  const start = new Date(end);
  switch (range) {
    case "30d":
      start.setDate(start.getDate() - 30);
      return { start, end, bucket: "day" };
    case "90d":
      start.setDate(start.getDate() - 90);
      return { start, end, bucket: "week" };
    case "365d":
      start.setDate(start.getDate() - 365);
      return { start, end, bucket: "month" };
    case "lifetime":
      return { start: null, end, bucket: "month" };
  }
}

function bucketSql(column: string, bucket: BucketType): string {
  switch (bucket) {
    case "day":
      return `DATE_FORMAT(${column}, '%Y-%m-%d')`;
    case "week":
      // Snap to Monday (ISO week start)
      return `DATE_FORMAT(DATE_SUB(${column}, INTERVAL WEEKDAY(${column}) DAY), '%Y-%m-%d')`;
    case "month":
      return `DATE_FORMAT(${column}, '%Y-%m')`;
  }
}

function makeDateKey(d: Date, bucket: BucketType): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return bucket === "month" ? `${y}-${m}` : `${y}-${m}-${day}`;
}

function makeDateLabel(d: Date, bucket: BucketType): string {
  return bucket === "month"
    ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function buildBuckets(
  start: Date,
  end: Date,
  bucket: BucketType,
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const c = new Date(start);
  c.setHours(0, 0, 0, 0);
  if (bucket === "week") c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  if (bucket === "month") c.setDate(1);

  while (c <= end) {
    out.push({ key: makeDateKey(c, bucket), label: makeDateLabel(c, bucket) });
    if (bucket === "day") c.setDate(c.getDate() + 1);
    else if (bucket === "week") c.setDate(c.getDate() + 7);
    else c.setMonth(c.getMonth() + 1);
  }
  return out;
}

/**
 * Generic zero-filled time-series fetcher.
 * Returns `{ label, count }[]` ready for `MetricChartCard`.
 */
async function fetchTrend(
  p: DbPool,
  opts: {
    from: string; // e.g. "orders o"
    dateColumn: string; // e.g. "o.created_at"
    valueExpr: string; // e.g. "COALESCE(SUM(o.total), 0)"
    where?: string[];
    range: RangeType;
  },
): Promise<TrendDatum[]> {
  const { start, end, bucket } = rangeWindow(opts.range);
  let effectiveStart: Date;

  if (start) {
    effectiveStart = start;
  } else {
    // lifetime — anchor to earliest record (or 12 months ago)
    const [rows] = await p.query<any[]>(
      `SELECT MIN(${opts.dateColumn}) AS earliest FROM ${opts.from}` +
        (opts.where?.length ? ` WHERE ${opts.where.join(" AND ")}` : ""),
    );
    const earliest = rows[0]?.earliest;
    effectiveStart = earliest
      ? new Date(earliest)
      : new Date(Date.now() - 365 * 86_400_000);
  }

  const conditions = [...(opts.where ?? [])];
  conditions.push(`${opts.dateColumn} >= ?`);

  const expr = bucketSql(opts.dateColumn, bucket);
  const [rows] = await p.query<any[]>(
    `SELECT ${expr} AS bucket, ${opts.valueExpr} AS value
       FROM ${opts.from}
      WHERE ${conditions.join(" AND ")}
      GROUP BY bucket
      ORDER BY bucket ASC`,
    [effectiveStart],
  );

  const buckets = buildBuckets(effectiveStart, end, bucket);
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r.bucket), Number(r.value));
  return buckets.map((b) => ({ label: b.label, count: map.get(b.key) ?? 0 }));
}

/* ------------------------------------------------------------------ */
/*  Shared fetchers (both admin + super_admin)                         */
/* ------------------------------------------------------------------ */

async function fetchSummary(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT
      (SELECT COUNT(*)               FROM orders)                                 AS total_orders,
      (SELECT COUNT(*)               FROM orders WHERE order_status = 'pending')  AS pending_orders,
      (SELECT COUNT(*)               FROM orders WHERE order_status = 'delivered')AS delivered_orders,
      (SELECT COUNT(*)               FROM orders WHERE order_status = 'cancelled')AS cancelled_orders,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status = 'paid')   AS total_revenue,
      (SELECT COALESCE(AVG(total),0) FROM orders WHERE payment_status = 'paid')   AS avg_order_value,
      (SELECT COUNT(*)               FROM users  WHERE role = 'customer')         AS total_customers,
      (SELECT COUNT(*)               FROM products WHERE status = 'active')       AS active_products,
      (SELECT COUNT(*)               FROM product_variants
         WHERE stock <= 5 AND status = 'active')                                  AS low_stock_count
  `);
  const r = rows[0] ?? {};
  return {
    totalRevenue: Number(r.total_revenue) || 0,
    totalOrders: Number(r.total_orders) || 0,
    pendingOrders: Number(r.pending_orders) || 0,
    deliveredOrders: Number(r.delivered_orders) || 0,
    cancelledOrders: Number(r.cancelled_orders) || 0,
    averageOrderValue: Math.round(Number(r.avg_order_value) || 0),
    totalCustomers: Number(r.total_customers) || 0,
    activeProducts: Number(r.active_products) || 0,
    lowStockCount: Number(r.low_stock_count) || 0,
  };
}

async function fetchRecentOrders(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT id, order_number, shipping_first_name, shipping_last_name,
           total, order_status, payment_status, created_at
      FROM orders
     ORDER BY created_at DESC
     LIMIT 8
  `);
  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    customerName:
      [r.shipping_first_name, r.shipping_last_name].filter(Boolean).join(" ") ||
      "Guest",
    total: Number(r.total),
    orderStatus: r.order_status,
    paymentStatus: r.payment_status,
    createdAt: r.created_at,
  }));
}

async function fetchLowStock(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT pv.id, pv.sku, pv.stock, p.name AS product_name, pv.name AS variant_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
     WHERE pv.stock <= 5 AND pv.status = 'active' AND p.status = 'active'
     ORDER BY pv.stock ASC, pv.updated_at DESC
     LIMIT 8
  `);
  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    stock: Number(r.stock),
    productName: r.product_name,
    variantName: r.variant_name,
  }));
}

/* ------------------------------------------------------------------ */
/*  Super-admin fetchers                                               */
/* ------------------------------------------------------------------ */

async function fetchOrderStatusMix(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT order_status AS status, COUNT(*) AS count
      FROM orders
     GROUP BY order_status
     ORDER BY count DESC
  `);
  return rows.map((r) => ({ label: r.status, count: Number(r.count) }));
}

async function fetchPaymentMethodMix(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT COALESCE(method, 'unknown') AS method,
           COUNT(*)                   AS count,
           COALESCE(SUM(amount), 0)   AS revenue
      FROM payments
     WHERE status = 'captured'
     GROUP BY method
     ORDER BY count DESC
  `);
  return rows.map((r) => ({
    label: r.method,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }));
}

async function fetchTopProducts(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT oi.sku,
           oi.product_name,
           SUM(oi.quantity) AS units,
           SUM(oi.total)    AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
     WHERE o.order_status != 'cancelled'
     GROUP BY oi.sku, oi.product_name
     ORDER BY revenue DESC
     LIMIT 10
  `);
  return rows.map((r) => ({
    sku: r.sku,
    name: r.product_name,
    units: Number(r.units),
    revenue: Number(r.revenue),
  }));
}

async function fetchTopCategories(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT c.name,
           COUNT(DISTINCT oi.order_id) AS orders,
           COALESCE(SUM(oi.total), 0)  AS revenue
      FROM order_items oi
      JOIN orders o              ON oi.order_id = o.id
      JOIN product_variants pv   ON oi.variant_id = pv.id
      JOIN product_categories pc ON pv.product_id = pc.product_id
      JOIN categories c          ON pc.category_id = c.id
     WHERE o.order_status != 'cancelled'
     GROUP BY c.id, c.name
     ORDER BY revenue DESC
     LIMIT 8
  `);
  return rows.map((r) => ({
    name: r.name,
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));
}

async function fetchCartMetrics(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT
      COUNT(*)                    AS total,
      SUM(status = 'active')      AS active,
      SUM(status = 'converted')   AS converted,
      SUM(status = 'abandoned')   AS abandoned
      FROM carts
  `);
  const r = rows[0] ?? {};
  const total = Number(r.total) || 0;
  const converted = Number(r.converted) || 0;
  const abandoned = Number(r.abandoned) || 0;
  return {
    total,
    active: Number(r.active) || 0,
    converted,
    abandoned,
    conversionRate: total > 0 ? converted / total : 0,
    abandonmentRate: total > 0 ? abandoned / total : 0,
  };
}

async function fetchCustomerMetrics(p: DbPool, range: RangeType) {
  const { start } = rangeWindow(range);
  const since = start ?? new Date(0);
  const [rows] = await p.query<any[]>(
    `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'customer')                          AS total,
      (SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= ?)      AS new_in_range,
      (SELECT COUNT(DISTINCT user_id) FROM orders WHERE user_id IS NOT NULL)        AS buyers,
      (SELECT COUNT(*) FROM (
         SELECT user_id FROM orders
          WHERE user_id IS NOT NULL
          GROUP BY user_id HAVING COUNT(*) >= 2
      ) t)                                                                          AS repeat_buyers
    `,
    [since],
  );
  const r = rows[0] ?? {};
  const buyers = Number(r.buyers) || 0;
  const repeat = Number(r.repeat_buyers) || 0;
  return {
    total: Number(r.total) || 0,
    newInRange: Number(r.new_in_range) || 0,
    buyers,
    repeatBuyers: repeat,
    repeatRate: buyers > 0 ? repeat / buyers : 0,
  };
}

async function fetchSettingsOverview(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT
      COUNT(*)                    AS total,
      SUM(active = 1)             AS active,
      SUM(save_in_redis = 1)      AS cached
      FROM setting_toggle
  `);
  const r = rows[0] ?? {};
  return {
    total: Number(r.total) || 0,
    active: Number(r.active) || 0,
    cached: Number(r.cached) || 0,
  };
}

async function fetchAuditSummary(p: DbPool) {
  const [rows] = await p.query<any[]>(`
    SELECT action, COUNT(*) AS count
      FROM audit_logs
     GROUP BY action
     ORDER BY count DESC
  `);
  return rows.map((r) => ({ action: r.action, count: Number(r.count) }));
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/dashboard?range=30d|90d|365d|lifetime               */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const guard = await requireAdmin({ label: "GET /api/admin/dashboard" });
  if (!guard.ok) return guard.response;

  const role = guard.session.user.role as string;
  const isSuperAdmin = role === "super_admin";

  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"));

  try {
    const p = await getPool();

    const [summary, recentOrders, lowStock] = await Promise.all([
      fetchSummary(p),
      fetchRecentOrders(p),
      fetchLowStock(p),
    ]);

    /* ---------- admin scope (lean) ---------- */
    if (!isSuperAdmin) {
      return NextResponse.json({
        scope: "admin" as const,
        generatedAt: new Date().toISOString(),
        range,
        summary,
        recentOrders,
        lowStock,
      });
    }

    /* ---------- super_admin scope (full analytics) ---------- */
    const [
      revenueTrend,
      ordersTrend,
      customersTrend,
      orderStatusMix,
      paymentMethodMix,
      topProducts,
      topCategories,
      cartMetrics,
      customerMetrics,
      settingsOverview,
      auditSummary,
    ] = await Promise.all([
      fetchTrend(p, {
        from: "orders o",
        dateColumn: "o.created_at",
        valueExpr: "COALESCE(SUM(o.total), 0)",
        where: ["o.payment_status = 'paid'"],
        range,
      }),
      fetchTrend(p, {
        from: "orders o",
        dateColumn: "o.created_at",
        valueExpr: "COUNT(*)",
        range,
      }),
      fetchTrend(p, {
        from: "users u",
        dateColumn: "u.created_at",
        valueExpr: "COUNT(*)",
        where: ["u.role = 'customer'"],
        range,
      }),
      fetchOrderStatusMix(p),
      fetchPaymentMethodMix(p),
      fetchTopProducts(p),
      fetchTopCategories(p),
      fetchCartMetrics(p),
      fetchCustomerMetrics(p, range),
      fetchSettingsOverview(p),
      fetchAuditSummary(p),
    ]);

    return NextResponse.json({
      scope: "super_admin" as const,
      generatedAt: new Date().toISOString(),
      range,
      summary,
      recentOrders,
      lowStock,
      analytics: {
        // Trends → drop straight into <MetricChartCard data={...} />
        revenueTrend,
        ordersTrend,
        customersTrend,
        // Categorical breakdowns → bar lists / donut feeds
        orderStatusMix,
        paymentMethodMix,
        topProducts,
        topCategories,
        // Scalar KPI blocks
        cartMetrics,
        customerMetrics,
        settingsOverview,
        auditSummary,
      },
    });
  } catch (err) {
    console.error("[dashboard] GET failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
