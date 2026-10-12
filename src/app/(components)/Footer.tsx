import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, MessageCircle } from "lucide-react";
import CraftiNagmaLogo from "../../assets/images/logo_v1.png";
import { supportMail } from "../../utils/main.util";
import { InstagramIcon } from "./utilts/SocialIcons";

/* ============================================================================
 * FOOTER CONTENT — edit here only
 * ========================================================================== */

const FOOTER_CONTENT = {
  tagline: "Handmade with love, stitched with care.",
  columns: [
    {
      title: "Shop",
      links: [
        { label: "All products", href: "/products" },
        { label: "Gift hampers", href: "/products?category=gifts" },
        { label: "Custom orders", href: "/custom" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Our story", href: "/about" },
        { label: "How it's made", href: "/about#process" },
        { label: "Care guide", href: "/care" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Track order", href: "/account/orders" },
        { label: "Shipping & returns", href: "/shipping" },
        { label: "Contact us", href: `mailto:${supportMail}` },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", href: "/policy/privacy" },
        { label: "Terms of service", href: "/policy/terms-of-service" },
        {
          label: "Cancellation and Refunds",
          href: "/policy/cancellation-refund",
        },
      ],
    },
  ] as const,
  socials: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/crafti_nagma",
      icon: "instagram" as const,
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/919999999999",
      icon: "whatsapp" as const,
    },
    {
      label: "Email us",
      href: `mailto:${supportMail}`,
      icon: "mail" as const,
    },
  ],
  madeWith: {
    before: "Made with",
    after: "in India",
  },
} as const;

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  whatsapp: MessageCircle,
  mail: Mail,
} as const;

/* ============================================================================
 * Footer
 * ========================================================================== */

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-stone-200/60 bg-white/60 backdrop-blur-sm">
      {/* Soft rose glow — ties into landing's decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 h-16 w-64 rounded-full bg-rose-100/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* ---- Top: brand + columns --------------------------------- */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          {/* Brand block — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <Link href="/" aria-label="Home" className="inline-block">
              <Image
                src={CraftiNagmaLogo}
                alt="Crafti Nagma"
                width={140}
                height={36}
                className="h-7 w-auto object-contain sm:h-8"
              />
            </Link>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-600">
              {FOOTER_CONTENT.tagline}
            </p>

            {/* Direct contact line — supportMail front & centre */}
            <a
              href={`mailto:${supportMail}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              <Mail className="h-3.5 w-3.5" />
              {supportMail}
            </a>

            {/* Socials */}
            <div className="mt-5 flex items-center gap-2">
              {FOOTER_CONTENT.socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.icon];
                const external = s.href.startsWith("http");
                return (
                  <Link
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-stone-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_CONTENT.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-600 transition-colors hover:text-rose-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---- Bottom bar ------------------------------------------ */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-stone-200/60 pt-6 text-center sm:mt-12 sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-stone-500">
            © {year}{" "}
            <Link
              href="/"
              className="font-medium text-stone-600 transition-colors hover:text-rose-600"
            >
              Crafti Nagma
            </Link>
            . All rights reserved.
          </p>

          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            {FOOTER_CONTENT.madeWith.before}
            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            {FOOTER_CONTENT.madeWith.after}
          </p>
        </div>
      </div>
    </footer>
  );
}
