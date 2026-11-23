"use client";

import { useEffect, useRef, useState } from "react";

/** How long every search bar waits after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 1500;

/**
 * @brief Debounce any value a search bar drives.
 *
 * @description
 * Returns `value` only once it has stopped changing for `delay` milliseconds.
 * Every keystroke clears the pending timer and starts a new one, so a request
 * or a navigation happens after the shopper pauses instead of on every
 * character.
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const commit = () => setDebounced(value);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(commit, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}
