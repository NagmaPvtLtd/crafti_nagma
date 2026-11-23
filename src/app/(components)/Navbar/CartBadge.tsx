"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import type { CartResponse } from "../../../types/Cart.types";

/**
 * The rose count bubble inside the navbar's `/cart` link.
 *
 * Fetches on mount and whenever a cart mutation dispatches `cart:updated`.
 * A 401 (guest) simply hides the badge, so the link stays plain.
 */
export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await axios.get<CartResponse>("/api/user/cart");
        if (!cancelled) setCount(res.data.summary.quantity);
      } catch {
        /* Guests get a 401 — no badge for them. */
        if (!cancelled) setCount(0);
      }
    }

    void load();
    const onUpdated = () => void load();
    window.addEventListener("cart:updated", onUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("cart:updated", onUpdated);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span
      aria-label={`${count} item${count === 1 ? "" : "s"} in your cart`}
      className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] leading-4 font-semibold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
