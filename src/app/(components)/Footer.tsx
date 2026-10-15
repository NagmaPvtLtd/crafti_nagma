import Link from "next/link";
import Image from "next/image";
import { Heart, Mail } from "lucide-react";
import CraftiNagmaLogo from "../../assets/images/logo_v1.png";
import {
  instagramLink,
  itsmeprinceWebsiteLink,
  supportMail,
  whatsappNumberLink,
} from "../../utils/main.util";
import { InstagramIcon, WhatsAppIcon } from "./utils/SocialIcons";
import { SectionDivider } from "./utils/SectionDiv";

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
      href: instagramLink,
      icon: "instagram" as const,
    },
    {
      label: "WhatsApp",
      href: whatsappNumberLink,
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
    after: "by",
    authorHandle: "@itsmeprince",
    authorHref: itsmeprinceWebsiteLink,
  },
} as const;

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  mail: Mail,
} as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-white px-4 pb-6 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 right-10 h-16 w-64 rounded-full bg-linear-to-t from-rose-200 to-white blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl overflow-hidden px-5 py-8 backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
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

            <a
              href={`mailto:${supportMail}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
            >
              <Mail className="h-3.5 w-3.5" />
              {supportMail}
            </a>

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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50/60 text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>

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

        <SectionDivider className="mt-10 sm:mt-12" />

        <div className="mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
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
            <Heart
              aria-hidden
              className="animate-cl-heartbeat motion-reduce:animate-none h-3 w-3 fill-rose-500 text-rose-500"
            />
            {FOOTER_CONTENT.madeWith.after}
            <Link
              href={FOOTER_CONTENT.madeWith.authorHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-medium text-rose-500 underline decoration-rose-300 decoration-dashed underline-offset-4 transition-colors hover:text-rose-600"
            >
              {FOOTER_CONTENT.madeWith.authorHandle}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
