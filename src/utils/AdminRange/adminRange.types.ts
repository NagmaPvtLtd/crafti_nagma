/**
 * Admin time-range vocabulary.
 *
 * Shared by:
 *   - GET /api/admin/dashboard
 *   - GET /api/admin/audit-logs
 *   - AdminDashboardClient
 *   - AdminAuditLogsClient
 *   - MetricChartCard
 */
export type RangeType = "30d" | "90d" | "365d" | "lifetime";
