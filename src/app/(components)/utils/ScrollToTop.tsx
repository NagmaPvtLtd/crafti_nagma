"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      type="button"
      aria-label="Go to top"
      onClick={scrollTop}
      className={`fixed bottom-6 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white/90 text-rose-500 shadow-lg shadow-rose-200/40 backdrop-blur-sm transition-all duration-300 hover:bg-rose-50 hover:text-rose-600 sm:right-8 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
