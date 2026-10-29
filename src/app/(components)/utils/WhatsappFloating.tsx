"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { whatsappNumberLink } from "../../../utils/main.util";
import { WhatsAppIcon } from "./SocialIcons";

const STORAGE_KEY = "whatsapp_float_closed_until";
const HIDE_DURATION_MS = 2 * 60 * 60 * 1000;
const WHATSAPP_MESSAGE =
  "Hi Crafti Nagma! I'd love to know more about your handmade pieces. Can you help me?";

export default function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = () => {
      const closedUntil = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
      const now = Date.now();

      if (closedUntil && now < closedUntil) {
        const remaining = closedUntil - now;
        const timer = setTimeout(() => {
          sessionStorage.removeItem(STORAGE_KEY);
          setVisible(true);
        }, remaining);
        return () => clearTimeout(timer);
      }

      if (closedUntil) sessionStorage.removeItem(STORAGE_KEY);
      setVisible(true);
    };
    load();
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const until = Date.now() + HIDE_DURATION_MS;
    sessionStorage.setItem(STORAGE_KEY, String(until));
    setVisible(false);
  };

  const whatsappUrl = `${whatsappNumberLink}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE,
  )}`;

  return (
    <div
      className={`fixed bottom-5 left-4.5 z-20 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Close WhatsApp button"
          onClick={handleClose}
          className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-md shadow-rose-200/50 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white/90 text-rose-500 shadow-lg shadow-rose-200/40 backdrop-blur-sm transition-all duration-300 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.96]"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
