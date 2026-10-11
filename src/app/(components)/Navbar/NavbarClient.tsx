"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import type { SessionUserClient } from "../../../types/User/JWT.types";
import { getSectionsForRole, type NavLink } from "./navLinks";
import CraftiNagmaPNG from "../../../assets/images/logo_png_v1.png";

/* ============================================================================
 * NAVBAR — the only navigation surface
 * ============================================================================
 * Desktop + Mobile:
 *   [Logo]   [Search .......]   Browse  Notif  Profile▾  Cart
 *
 * Profile dropdown holds every section the user can access, pulled from
 * getSectionsForRole() — the same source the (now-deleted) sidebar used.
 * ========================================================================== */

type Props = { user: SessionUserClient | null };

function isActiveLink(pathname: string, link: NavLink): boolean {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(link.href + "/");
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

  const sections = user ? getSectionsForRole(user.role) : [];

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
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          {/* LEFT — Logo */}
          <Link href="/" aria-label="Home" className="shrink-0">
            <Image
              src={CraftiNagmaPNG}
              alt="Crafti Nagma"
              width={140}
              height={36}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* MIDDLE — Desktop search */}
          <form
            onSubmit={submitSearch}
            className="hidden flex-1 items-center justify-center md:flex"
          >
            <div className="relative w-full max-w-xl">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search handmade treasures..."
                className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm text-neutral-900 transition outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
              />
            </div>
          </form>

          {/* RIGHT — Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="md:hidden"
            >
              <Search size={18} />
            </IconButton>

            <RightLink
              href="/products"
              label="Browse"
              active={pathname.startsWith("/products")}
              className="hidden sm:flex"
            >
              <ShoppingBag size={16} />
              <span>Browse</span>
            </RightLink>

            <RightLink
              href="/notifications"
              label="Notifications"
              active={pathname.startsWith("/notifications")}
              className="hidden sm:flex"
            >
              <Bell size={16} />
            </RightLink>

            {/* Profile / Sign-in */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-neutral-100"
                >
                  <Avatar name={user.name} image={user.image} size={30} />
                  <ChevronDown
                    size={13}
                    className={`hidden text-neutral-400 transition-transform sm:block ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-black/5">
                    {/* User header */}
                    <div className="border-b border-neutral-100 px-4 py-3">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {user.email}
                      </p>
                    </div>

                    {/* Role-based sections */}
                    <div className="py-1.5">
                      {sections.map((section, idx) => (
                        <div key={idx}>
                          {section.label && (
                            <p className="mt-2 mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              {section.label}
                            </p>
                          )}
                          {section.links.map((link) => (
                            <MenuItem
                              key={link.href}
                              href={link.href}
                              icon={link.icon}
                              active={isActiveLink(pathname, link)}
                            >
                              {link.label}
                            </MenuItem>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Sign out */}
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full cursor-pointer items-center gap-2 border-t border-neutral-100 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
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
                className="ml-1 flex cursor-pointer items-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                Sign in
              </button>
            )}

            <RightLink
              href="/cart"
              label="Cart"
              active={pathname.startsWith("/cart")}
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
            </RightLink>

            <IconButton
              label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </IconButton>
          </div>
        </div>

        {/* Mobile search bar */}
        <form
          onSubmit={submitSearch}
          className={`overflow-hidden border-t border-neutral-200 transition-all duration-200 md:hidden ${
            searchOpen ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              />
              <input
                autoFocus={searchOpen}
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
              />
            </div>
          </div>
        </form>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-white transition-all duration-200 sm:hidden ${
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-5 p-4 pb-24">
          {!user && (
            <div className="space-y-0.5">
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
            </div>
          )}

          {user &&
            sections.map((section, idx) => (
              <div key={idx}>
                {section.label && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.links.map((link) => (
                    <MobileLink
                      key={link.href}
                      href={link.href}
                      onClose={() => setMobileOpen(false)}
                      icon={link.icon}
                    >
                      {link.label}
                    </MobileLink>
                  ))}
                </div>
              </div>
            ))}

          {user && (
            <div className="space-y-0.5">
              <MobileLink
                href="/notifications"
                onClose={() => setMobileOpen(false)}
                icon={Bell}
              >
                Notifications
              </MobileLink>
            </div>
          )}

          <div className="mt-2">
            {user ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleSignIn();
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}

/* ============================================================================
 * Small components
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
        className="flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-xs font-medium text-neutral-700"
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
      className="shrink-0 rounded-full border border-neutral-200 object-cover"
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
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 ${className}`}
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
      className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

function MenuItem({
  href,
  icon: Icon,
  active = false,
  children,
}: {
  href: string;
  icon?: React.ElementType;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {Icon && <Icon size={15} className="shrink-0 text-neutral-500" />}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function MobileLink({
  href,
  onClose,
  icon: Icon,
  children,
}: {
  href: string;
  onClose: () => void;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span>{children}</span>
    </Link>
  );
}
