import type { ElementType } from "react";
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  Package,
  User as UserIcon,
  LayoutDashboard,
  Boxes,
  Tags,
  ScrollText,
  ShieldCheck,
  ReceiptIndianRupee,
  MessageSquare,
  TicketPercent,
  TrendingUp,
  UserCog,
  Heart,
} from "lucide-react";
import { UserRole } from "../../../types/User/UserRow.types";

export interface NavLink {
  href: string;
  label: string;
  icon: ElementType;
  /** Only match exact pathname — use for terminal/root routes only */
  exact?: boolean;
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

/* ------------------------------------------------------------------ */
/*  CUSTOMER — A-Z                                                     */
/* ------------------------------------------------------------------ */
export const CUSTOMER_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/cart", label: "My Cart", icon: ShoppingCart },
  { href: "/dashboard/orders", label: "My Orders", icon: Package },
  { href: "/dashboard/profile", label: "My Profile", icon: UserIcon },
  { href: "/dashboard/wishlist", label: "My Wishlist", icon: Heart },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
];

/* ------------------------------------------------------------------ */
/*  MANAGER — A-Z                                                      */
/* ------------------------------------------------------------------ */
export const MANAGER_LINKS: NavLink[] = [
  { href: "/admin/orders", label: "Enquiries / Orders", icon: Package },
  { href: "/admin/categories", label: "Manage Categories", icon: Tags },
  { href: "/manager/product-studio", label: "Manage Products", icon: Boxes },
  { href: "/admin/store", label: "Store Dashboard", icon: LayoutDashboard },
  { href: "/admin/wishlist-trend", label: "Wishlist Trend", icon: TrendingUp },
];

/* ------------------------------------------------------------------ */
/*  ADMIN — A-Z                                                        */
/* ------------------------------------------------------------------ */
export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/discounts", label: "Manage Discounts", icon: TicketPercent },
  { href: "/admin/reviews", label: "Review Manager", icon: MessageSquare },
  { href: "/admin/payments", label: "Transactions", icon: ReceiptIndianRupee },
  { href: "/admin/user-manager", label: "User Manager", icon: UserCog },
];

/* ------------------------------------------------------------------ */
/*  SUPER ADMIN — A-Z                                                  */
/* ------------------------------------------------------------------ */
export const SUPER_ADMIN_LINKS: NavLink[] = [
  { href: "/admin/settings", label: "Access Control", icon: ShieldCheck },
  {
    href: "/admin/dashboard",
    label: "Admin Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
];

export function getSectionsForRole(role: UserRole): NavSection[] {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isManager = role === "manager" || isAdmin;

  if (!isManager) {
    return [{ label: "", links: CUSTOMER_LINKS }];
  }

  const sections: NavSection[] = [];
  sections.push({ label: "Shop", links: CUSTOMER_LINKS });
  sections.push({ label: "Store Manager", links: MANAGER_LINKS });
  if (isAdmin) sections.push({ label: "Admin", links: ADMIN_LINKS });
  if (isSuperAdmin)
    sections.push({ label: "Super Admin", links: SUPER_ADMIN_LINKS });

  return sections;
}

export function isStaffRole(role: string): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}
