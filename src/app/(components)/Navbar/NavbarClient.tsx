"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import type { SessionUserClient } from "../../../types/User/JWT.types";

type Props = { user: SessionUserClient | null };

function isStaffRole(role: string): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}

export default function NavbarClient({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      setSearchOpen(false);
      setMobileOpen(false);
      setUserMenuOpen(false);
    };
    load();
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isStaff = user ? isStaffRole(user.role) : false;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchValue("");
  }

  function handleSignIn() {
    signIn("google", { callbackUrl: pathname });
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          {/* ── LEFT — Logo ─────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-rose-400 to-amber-300 text-[10px] font-bold text-neutral-900">
              CN
            </span>
            <span className="hidden sm:inline">Crafti Nagma</span>
          </Link>

          {/* ── MIDDLE — Search (desktop) ───────────────────────────── */}
          <form
            onSubmit={submitSearch}
            className="hidden flex-1 items-center md:flex"
          >
            <div className="relative w-full">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search handmade treasures..."
                className="w-full rounded-full border border-neutral-800 bg-neutral-950/60 py-1.5 pr-4 pl-9 text-sm text-neutral-100 transition outline-none placeholder:text-neutral-600 focus:border-neutral-700 focus:bg-neutral-950"
              />
            </div>
          </form>

          {/* Spacer for mobile so right-side items stay right-aligned */}
          <div className="flex-1 md:hidden" />

          {/* ── RIGHT — Actions ─────────────────────────────────────── */}
          <div className="flex items-center gap-1">
            {/* Search toggle (mobile) */}
            <IconButton
              label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="md:hidden"
            >
              <Search size={16} />
            </IconButton>

            {/* Browse */}
            <RightLink
              href="/products"
              label="Browse"
              active={pathname.startsWith("/products")}
              className="hidden sm:flex"
            >
              <ShoppingBag size={16} />
              <span>Browse</span>
            </RightLink>

            {/* Notifications */}
            <RightLink
              href="/notifications"
              label="Notifications"
              active={pathname.startsWith("/notifications")}
              className="hidden sm:flex"
            >
              <Bell size={16} />
              <span>Notifications</span>
            </RightLink>

            {/* Profile / Sign in */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-neutral-800/60"
                >
                  <Avatar name={user.name} image={user.image} size={28} />
                  <ChevronDown
                    size={12}
                    className={`hidden text-neutral-500 transition-transform sm:block ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/50">
                    <div className="border-b border-neutral-800 px-4 py-3">
                      <p className="truncate text-sm font-medium text-neutral-100">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {user.email}
                      </p>
                    </div>

                    <MenuItem href="/dashboard">
                      <LayoutDashboard size={16} />
                      Dashboard
                    </MenuItem>

                    {isStaff && (
                      <MenuItem href="/admin">
                        <ShieldCheck size={16} />
                        Admin Panel
                      </MenuItem>
                    )}

                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition hover:bg-neutral-800"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="flex cursor-pointer items-center rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-white active:scale-[0.98]"
              >
                Sign in
              </button>
            )}

            {/* Cart */}
            <RightLink
              href="/cart"
              label="Cart"
              active={pathname.startsWith("/cart")}
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
            </RightLink>

            {/* Mobile menu toggle */}
            <IconButton
              label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </IconButton>
          </div>
        </div>

        {/* Mobile search bar (expands under the bar) */}
        <form
          onSubmit={submitSearch}
          className={`overflow-hidden border-t border-neutral-800 transition-all duration-200 md:hidden ${
            searchOpen ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
              />
              <input
                autoFocus={searchOpen}
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-neutral-800 bg-neutral-950/60 py-1.5 pr-4 pl-9 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
              />
            </div>
          </div>
        </form>
      </header>

      {/* ── Mobile drawer (slides from top) ─────────────────────────── */}
      <div
        className={`fixed inset-x-0 top-14 bottom-0 z-30 bg-neutral-900/95 backdrop-blur-md transition-all duration-200 sm:hidden ${
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <nav className="flex flex-col gap-1 p-4">
          <MobileLink href="/" onClose={() => setMobileOpen(false)}>
            Home
          </MobileLink>
          <MobileLink href="/products" onClose={() => setMobileOpen(false)}>
            Browse
          </MobileLink>
          <MobileLink
            href="/notifications"
            onClose={() => setMobileOpen(false)}
          >
            Notifications
          </MobileLink>
          <MobileLink href="/cart" onClose={() => setMobileOpen(false)}>
            Cart
          </MobileLink>

          {user ? (
            <>
              <div className="my-3 h-px bg-neutral-800" />
              <MobileLink
                href="/dashboard"
                onClose={() => setMobileOpen(false)}
              >
                Dashboard
              </MobileLink>

              {isStaff && (
                <MobileLink href="/admin" onClose={() => setMobileOpen(false)}>
                  Admin Panel
                </MobileLink>
              )}

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-neutral-800"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="my-3 h-px bg-neutral-800" />
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleSignIn();
                }}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-white"
              >
                Sign in with Google
              </button>
            </>
          )}
        </nav>
      </div>
    </>
  );
}

/* ============================================================================
 * Small internal components
 * ========================================================================== */

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
        className="flex shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950 text-[10px] font-medium text-neutral-300"
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
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

function IconButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 ${className}`}
    >
      {children}
    </button>
  );
}

function RightLink({
  href,
  label,
  active,
  className = "",
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-neutral-800 text-neutral-100"
          : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

function MenuItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClose,
  children,
}: {
  href: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
    >
      {children}
    </Link>
  );
}
