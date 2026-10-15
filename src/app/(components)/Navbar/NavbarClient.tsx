"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { SectionDivider } from "../utils/SectionDiv";

type Props = { user: SessionUserClient | null };

const MOBILE_BREAKPOINT = 640;

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
  const [isMobile, setIsMobile] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const load = () => {
      setSearchOpen(false);
      setMobileOpen(false);
      setUserMenuOpen(false);
    };
    load();
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
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
  }, [userMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sections = user ? getSectionsForRole(user.role) : [];

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (!q) return;
      router.push(`/products?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchValue("");
    },
    [router, searchValue],
  );

  function handleSignIn() {
    signIn("google", { callbackUrl: pathname });
  }

  function handleProfileClick() {
    if (isMobile) {
      setUserMenuOpen(false);
      setMobileOpen((v) => !v);
    } else {
      setUserMenuOpen((v) => !v);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
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

          <form
            onSubmit={submitSearch}
            className="hidden flex-1 items-center justify-center md:flex"
          >
            <div className="relative w-full max-w-xl">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search handmade treasures..."
                className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pr-4 pl-10 text-sm text-stone-900 transition outline-none placeholder:text-stone-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </form>

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

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={handleProfileClick}
                  aria-haspopup={isMobile ? "dialog" : "menu"}
                  aria-expanded={isMobile ? mobileOpen : userMenuOpen}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-rose-50/60"
                >
                  <Avatar name={user.name} image={user.image} size={30} />
                  <ChevronDown
                    size={13}
                    className={`hidden text-stone-400 transition-transform sm:block ${
                      !isMobile && userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {!isMobile && userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute top-full right-0 mt-2 max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-white/60 bg-white/95 shadow-xl shadow-rose-100/40 backdrop-blur-md"
                  >
                    <div className="border-b border-stone-100 px-4 py-3">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1.5">
                      {sections.map((section, idx) => (
                        <div key={idx}>
                          {section.label && (
                            <p className="mt-2 mb-1 px-4 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
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

                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full cursor-pointer items-center gap-2 border-t border-stone-100 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
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
                className="ml-1 flex cursor-pointer items-center rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
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

        <form
          onSubmit={submitSearch}
          className={`overflow-hidden border-t border-white/60 transition-all duration-200 md:hidden ${
            searchOpen ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
              />
              <input
                autoFocus={searchOpen}
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pr-4 pl-10 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>
        </form>
      </header>

      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-white transition-all duration-200 sm:hidden ${
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-rose-100/60 blur-3xl"
        />

        <nav className="relative mx-auto flex max-w-7xl flex-col gap-5 p-4 pb-24">
          {user && (
            <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-rose-200/50 blur-2xl"
              />
              <Avatar name={user.name} image={user.image} size={40} />
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-stone-500">{user.email}</p>
              </div>
            </div>
          )}

          {user && <SectionDivider size={11} />}

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
                  <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
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
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-3 text-sm text-rose-600 transition hover:bg-rose-100"
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
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-500 px-3 py-3 text-sm font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
              >
                Sign in with Google
              </button>
            )}
          </div>

          <SectionDivider className="mt-2" size={11} />
        </nav>
      </div>
    </>
  );
}

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
        className="flex shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-xs font-medium text-rose-500"
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
      className="shrink-0 rounded-full border border-rose-200 object-cover"
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
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-stone-600 transition hover:bg-rose-50/60 hover:text-rose-600 ${className}`}
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
          ? "bg-rose-50/70 text-rose-600"
          : "text-stone-600 hover:bg-rose-50/60 hover:text-rose-600"
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
          ? "bg-rose-50/70 text-rose-600"
          : "text-stone-700 hover:bg-rose-50/60 hover:text-rose-600"
      }`}
    >
      {Icon && <Icon size={15} className="shrink-0 text-stone-400" />}
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
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-rose-50/60 hover:text-rose-600"
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span>{children}</span>
    </Link>
  );
}
