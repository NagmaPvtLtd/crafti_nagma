"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Phone, X } from "lucide-react";

import { WhatsAppIcon } from "./SocialIcons";

export type ContactLinks = {
  display: string;
  call: string;
  whatsapp: string;
};

export function getContactLinks(
  phone: string,
  countryCode = "91",
): ContactLinks | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const prefix = countryCode.replace(/\D/g, "");
  const normalized =
    prefix && !digits.startsWith(prefix) ? `${prefix}${digits}` : digits;
  const display =
    normalized.length === 12 && normalized.startsWith("91")
      ? `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`
      : `+${normalized}`;

  return {
    display,
    call: `tel:+${normalized}`,
    whatsapp: `https://wa.me/${normalized}`,
  };
}

type ContactModalProps = {
  phone: string | null;
  contactName?: string;
  countryCode?: string;
  onClose: () => void;
};

export default function ContactModal({
  phone,
  contactName,
  countryCode = "91",
  onClose,
}: ContactModalProps) {
  useEffect(() => {
    if (!phone) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phone, onClose]);

  if (!phone || typeof document === "undefined") return null;

  const links = getContactLinks(phone, countryCode);
  if (!links) return null;

  const title = contactName ? `Contact ${contactName}` : "Contact options";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-80 flex items-center justify-center bg-stone-900/25 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-200 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Want to call or chat on WhatsApp?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact options"
            className="shrink-0 cursor-pointer rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
            Phone number
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-800">
            {links.display}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={links.call}
            onClick={onClose}
            aria-label={`Call ${links.display}`}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100"
          >
            <Phone className="h-5 w-5" />
            Call
          </a>
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            aria-label={`Chat on WhatsApp with ${links.display}`}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
