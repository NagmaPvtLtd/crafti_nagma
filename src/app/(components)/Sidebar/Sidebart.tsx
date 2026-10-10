"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { SessionUserClient } from "../../../types/User/JWT.types";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Nav configurations (one per tier)                                         */
/* -------------------------------------------------------------------------- */

const CUSTOMER_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/products", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "My Orders", icon: Package },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const MANAGER_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: Package },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

const SUPER_ADMIN_LINKS: NavLink[] = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
];

/* -------------------------------------------------------------------------- */
/*  Small sub-components                                                      */
/* -------------------------------------------------------------------------- */

function Avatar({
  name,
  image,
  size,
}: {
  name: string;
  image: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").charAt(0).toUpperCase();

  if (!image || failed) {
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950 text-xs font-medium text-neutral-300"
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      loading="eager"
      src={image}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full border border-neutral-800 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function NavItem({
  link,
  expanded,
  active,
}: {
  link: NavLink;
  expanded: boolean;
  active: boolean;
}) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      title={!expanded ? link.label : undefined}
      aria-label={link.label}
      className={`flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm transition cursor-pointer ${
        active
          ? "bg-neutral-800 text-neutral-100"
          : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span
        className={`truncate whitespace-nowrap transition-opacity duration-200 ${
          expanded ? "opacity-100" : "opacity-0"
        }`}
      >
        {link.label}
      </span>
    </Link>
  );
}

function SectionLabel({
  label,
  expanded,
}: {
  label: string;
  expanded: boolean;
}) {
  return (
    <div className="relative flex h-6 items-center overflow-hidden px-2.5">
      <span
        className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-neutral-600 transition-opacity duration-200 ${
          expanded ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-x-2.5 top-1/2 h-px -translate-y-1/2 bg-neutral-800 transition-opacity duration-200 ${
          expanded ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

export default function Sidebar({
  user,
  expanded,
  onToggle,
}: {
  user: SessionUserClient;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  function isActive(link: NavLink): boolean {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(link.href + "/");
  }

  /* ---- Role tiers --------------------------------------------------- */
  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin" || isSuperAdmin;
  const isManager = user.role === "manager" || isAdmin;

  /**
   * Whether the sidebar should render the admin area at all.
   * A pure customer sees only CUSTOMER_LINKS with no section labels.
   */
  const hasAdminArea = isManager;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-neutral-800 bg-neutral-900 transition-[width] duration-300 ease-out ${
        expanded ? "w-70" : "w-14"
      }`}
    >
      {/* -------- Header -------- */}
      <div className="flex h-14 shrink-0 items-center border-b border-neutral-800 px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200 cursor-pointer"
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        <Link
          href="/"
          className={`ml-2.5 flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-200 transition-opacity duration-200 ${
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Sparkles size={14} className="shrink-0 text-neutral-400" />
          <span className="truncate">Crafti Nagma</span>
        </Link>
      </div>

      {/* -------- Nav -------- */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2">
        {hasAdminArea ? (
          <>
            {/* Super Admin */}
            {isSuperAdmin && (
              <>
                <SectionLabel label="Super Admin" expanded={expanded} />
                {SUPER_ADMIN_LINKS.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    expanded={expanded}
                    active={isActive(link)}
                  />
                ))}
              </>
            )}

            {/* Admin */}
            {isAdmin && (
              <>
                <SectionLabel label="Admin" expanded={expanded} />
                {ADMIN_LINKS.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    expanded={expanded}
                    active={isActive(link)}
                  />
                ))}
              </>
            )}

            {/* Store Manager */}
            <SectionLabel label="Store Manager" expanded={expanded} />
            {MANAGER_LINKS.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                expanded={expanded}
                active={isActive(link)}
              />
            ))}

            {/* Customer */}
            <SectionLabel label="Shop" expanded={expanded} />
            {CUSTOMER_LINKS.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                expanded={expanded}
                active={isActive(link)}
              />
            ))}
          </>
        ) : (
          // Pure customer — flat list, no section headings
          CUSTOMER_LINKS.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              expanded={expanded}
              active={isActive(link)}
            />
          ))
        )}
      </nav>

      {/* -------- Footer (user card) -------- */}
      <div className="shrink-0 border-t border-neutral-800 p-2">
        {expanded ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 overflow-hidden px-2 py-1.5">
              <Avatar name={user.name} image={user.image} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-100">
                  {user.name}
                </p>
                <p className="truncate text-[11px] leading-tight text-neutral-500">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-red-400 cursor-pointer"
            >
              <LogOut size={16} className="shrink-0" />
              <span
                className={`truncate whitespace-nowrap transition-opacity duration-200 ${
                  expanded ? "opacity-100" : "opacity-0"
                }`}
              >
                Sign out
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            title="Expand"
            aria-label="Expand sidebar"
            className="mx-auto flex items-center justify-center rounded-full p-0.5 transition hover:bg-neutral-800 cursor-pointer"
          >
            <Avatar name={user.name} image={user.image} size={32} />
          </button>
        )}
      </div>
    </aside>
  );
}
