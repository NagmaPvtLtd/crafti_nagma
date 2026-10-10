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
  Users,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { UserRole } from "../../../types/User/UserRow.types";

export interface NavLink {
  href: string;
  label: string;
  icon: ElementType;
  exact?: boolean;
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

export const CUSTOMER_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/products", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "My Orders", icon: Package },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export const MANAGER_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: Package },
];

export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export const SUPER_ADMIN_LINKS: NavLink[] = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
];

/**
 * Returns the nav sections visible to a given role.
 * Pure customers get a single unlabeled section; staff get tiered sections.
 */
export function getSectionsForRole(role: UserRole): NavSection[] {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isManager = role === "manager" || isAdmin;

  if (!isManager) {
    return [{ label: "", links: CUSTOMER_LINKS }];
  }

  const sections: NavSection[] = [];
  if (isSuperAdmin)
    sections.push({ label: "Super Admin", links: SUPER_ADMIN_LINKS });
  if (isAdmin) sections.push({ label: "Admin", links: ADMIN_LINKS });
  sections.push({ label: "Store Manager", links: MANAGER_LINKS });
  sections.push({ label: "Shop", links: CUSTOMER_LINKS });
  return sections;
}

export function isStaffRole(role: string): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}
