"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Check, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

import getAxiosErrorMessage from "../../../utils/Auth/Auth.axiosErrorHelper.util";
import type {
  TagListItem,
  TagListResponse,
} from "../../../utils/zod/product/manager.tag.zod";
import type { TagRef } from "../../../utils/Tags/tag.util";

const TAGS_URL = "/api/manager/product-studio/tags";
const MAX_TAGS = 15;
const MAX_TAG_LENGTH = 100;

/** Splits a pasted list on commas and line breaks, then normalizes each name. */
function parsePastedTags(text: string): string[] {
  return text
    .split(/[,\n\r]+/)
    .map((part) => part.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean);
}

/**
 * YouTube-style tag input.
 *
 * - Type a tag and press Enter (or comma) to add it.
 * - Suggestions come from the shared `global_tags` master.
 * - A tag that does not exist yet is created and reused globally.
 * - Selected tags render as removable chips (flex-wrap, small X on the right).
 *
 * The same component powers the base product form, the variant form and the
 * tag picker, so a tag is always resolved through one code path.
 */
export default function TagInput({
  value,
  onChange,
  max = MAX_TAGS,
  placeholder = "Type a tag and press Enter…",
  disabled = false,
  excludedTagIds = [],
}: {
  value: TagRef[];
  onChange: (tags: TagRef[]) => void;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  excludedTagIds?: string[];
}) {
  const [input, setInput] = useState("");
  const [pool, setPool] = useState<TagListItem[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRefocusRef = useRef(false);

  const selectedIds = useMemo(
    () => new Set(value.map((tag) => tag.id)),
    [value],
  );
  const excludedIds = useMemo(
    () => new Set(excludedTagIds),
    [excludedTagIds],
  );
  const atLimit = value.length >= max;
  const busy = creating || pasting;

  const loadPool = useCallback(async () => {
    setLoadingPool(true);
    try {
      const res = await axios.get<TagListResponse>(TAGS_URL, {
        withCredentials: true,
      });
      setPool(res.data.tags);
    } catch {
      /* The picker still works: a typed tag can be created on Enter. */
    } finally {
      setLoadingPool(false);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void loadPool();
    };
    run();
  }, [loadPool]);

  /*
   * Creating a tag disables the input for the request, which drops focus.
   * Put the caret back in the same field so typing can continue.
   */
  useEffect(() => {
    if (busy || !shouldRefocusRef.current) return;
    shouldRefocusRef.current = false;
    if (disabled || atLimit) return;
    inputRef.current?.focus();
  }, [busy, disabled, atLimit]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const term = input.trim().toLowerCase();

  const suggestions = useMemo(() => {
    const list = pool.filter(
      (tag) => !selectedIds.has(tag.id) && !excludedIds.has(tag.id),
    );
    if (!term) return list.slice(0, 8);
    return list
      .filter((tag) => tag.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(term) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(term) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [pool, selectedIds, excludedIds, term]);

  const exactMatch = useMemo(
    () => pool.find((tag) => tag.name.toLowerCase() === term) ?? null,
    [pool, term],
  );

  function addTag(tag: TagRef) {
    if (excludedIds.has(tag.id)) {
      setInput("");
      toast(`"${tag.name}" is already in the parent product's tags.`);
      return;
    }
    if (selectedIds.has(tag.id)) return;
    if (atLimit) {
      toast.error(`A product can carry at most ${max} tags`);
      return;
    }
    onChange([...value, tag]);
    setInput("");
    setHighlight(0);
  }

  function removeTag(id: string) {
    onChange(value.filter((tag) => tag.id !== id));
  }

  async function commitInput(preferFirstSuggestion = false) {
    if (disabled || busy) return;

    const name = input.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    if (!name) return;

    if (preferFirstSuggestion && suggestions[highlight]) {
      addTag({
        id: suggestions[highlight].id,
        name: suggestions[highlight].name,
        slug: suggestions[highlight].slug,
      });
      return;
    }

    if (exactMatch) {
      addTag({
        id: exactMatch.id,
        name: exactMatch.name,
        slug: exactMatch.slug,
      });
      return;
    }

    shouldRefocusRef.current = inputRef.current === document.activeElement;
    setCreating(true);
    try {
      const res = await axios.post<{
        ok: true;
        message: string;
        tag: TagRef;
      }>(TAGS_URL, { name }, { withCredentials: true });
      const created = res.data.tag;
      setPool((prev) =>
        prev.some((tag) => tag.id === created.id)
          ? prev
          : [
              ...prev,
              {
                ...created,
                createdAt: new Date().toISOString(),
                usage: { productCount: 0, variantCount: 0, totalUsage: 0 },
              },
            ],
      );
      addTag(created);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not create that tag"));
    } finally {
      setCreating(false);
    }
  }

  /**
   * Adds a pasted comma/newline separated list in one go.
   * Known names are reused from the pool; missing ones go through the same
   * create endpoint as the single-tag path, so ids stay canonical.
   */
  async function addPastedTags(names: string[]) {
    if (disabled || busy) return;

    const seenNames = new Set<string>();
    const wanted: string[] = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      wanted.push(name);
    }
    if (wanted.length === 0) return;

    const poolByName = new Map(
      pool.map((tag) => [tag.name.toLowerCase(), tag] as const),
    );
    const chosenIds = new Set([
      ...value.map((tag) => tag.id),
      ...excludedIds,
    ]);
    const inheritedNames = new Set<string>();
    const eligible = wanted.filter((name) => {
      const known = poolByName.get(name.toLowerCase());
      if (known && excludedIds.has(known.id)) {
        inheritedNames.add(known.name);
        return false;
      }
      return !known || !chosenIds.has(known.id);
    });
    if (eligible.length === 0) {
      if (inheritedNames.size === 1) {
        const [name] = inheritedNames;
        toast(`"${name}" is already in the parent product's tags.`);
      } else if (inheritedNames.size > 1) {
        toast(
          `${inheritedNames.size} tags are already in the parent product's tags.`,
        );
      }
      return;
    }

    const room = max - value.length;
    if (room <= 0) {
      toast.error(`A product can carry at most ${max} tags`);
      return;
    }
    if (eligible.length > room) {
      toast.error(`A product can carry at most ${max} tags`);
    }

    shouldRefocusRef.current = inputRef.current === document.activeElement;
    setPasting(true);

    const added: TagRef[] = [];
    const poolAdditions: TagListItem[] = [];
    let failures = 0;

    try {
      for (const name of eligible) {
        if (added.length >= room) break;
        const known = poolByName.get(name.toLowerCase());
        if (known) {
          if (!chosenIds.has(known.id)) {
            chosenIds.add(known.id);
            added.push({ id: known.id, name: known.name, slug: known.slug });
          }
          continue;
        }

        try {
          const res = await axios.post<{
            ok: true;
            message: string;
            tag: TagRef;
          }>(TAGS_URL, { name }, { withCredentials: true });
          const created = res.data.tag;
          if (excludedIds.has(created.id)) {
            inheritedNames.add(created.name);
          } else if (!chosenIds.has(created.id)) {
            chosenIds.add(created.id);
            added.push(created);
          }
          const item: TagListItem = {
            ...created,
            createdAt: new Date().toISOString(),
            usage: { productCount: 0, variantCount: 0, totalUsage: 0 },
          };
          poolByName.set(created.name.toLowerCase(), item);
          poolAdditions.push(item);
        } catch {
          failures += 1;
        }
      }

      if (poolAdditions.length > 0) {
        setPool((prev) => [
          ...prev,
          ...poolAdditions.filter(
            (tag) => !prev.some((existing) => existing.id === tag.id),
          ),
        ]);
      }
      if (added.length > 0) onChange([...value, ...added]);
      if (inheritedNames.size === 1) {
        const [name] = inheritedNames;
        toast(`"${name}" is already in the parent product's tags.`);
      } else if (inheritedNames.size > 1) {
        toast(
          `${inheritedNames.size} tags are already in the parent product's tags.`,
        );
      }
      if (failures > 0) {
        toast.error(
          failures === 1
            ? "Could not create one of the pasted tags"
            : `Could not create ${failures} of the pasted tags`,
        );
      }
    } finally {
      setPasting(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 transition-colors ${
          open ? "border-rose-300 ring-2 ring-rose-100" : "border-stone-200"
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/70 py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-rose-700"
          >
            <span className="truncate">{tag.name}</span>
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              disabled={disabled}
              aria-label={`Remove ${tag.name}`}
              className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-rose-400 transition-colors hover:bg-rose-200/70 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {atLimit ? (
          <span className="text-[11px] text-stone-400">
            Limit reached — {max} tags
          </span>
        ) : (
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value.slice(0, MAX_TAG_LENGTH));
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!text || !/[,\n\r]/.test(text)) return;
              const names = parsePastedTags(text);
              if (names.length === 0) return;
              event.preventDefault();
              void addPastedTags(names);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                void commitInput(false);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlight((index) =>
                  suggestions.length === 0
                    ? 0
                    : (index + 1) % suggestions.length,
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlight((index) =>
                  suggestions.length === 0
                    ? 0
                    : (index - 1 + suggestions.length) % suggestions.length,
                );
              } else if (event.key === "Escape") {
                setOpen(false);
              } else if (
                event.key === "Backspace" &&
                input === "" &&
                value.length > 0
              ) {
                removeTag(value[value.length - 1].id);
              }
            }}
            placeholder={value.length === 0 ? placeholder : "Add another tag…"}
            disabled={disabled || busy}
            aria-label="Add a tag"
            className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-xs text-stone-900 outline-none placeholder:text-stone-400"
          />
        )}

        {busy && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-rose-400" />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-stone-400">
        <span>
          Press Enter or comma to add · paste a list separated by commas
        </span>
        <span className={atLimit ? "font-semibold text-rose-500" : ""}>
          {value.length} / {max}
        </span>
      </div>

      {open && !disabled && (suggestions.length > 0 || term) && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl shadow-stone-900/10">
          {loadingPool && pool.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-stone-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading tags…
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {suggestions.map((tag, index) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      addTag({ id: tag.id, name: tag.name, slug: tag.slug })
                    }
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      index === highlight
                        ? "bg-rose-50 text-rose-700"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="truncate">{tag.name}</span>
                    <span className="shrink-0 text-[10px] text-stone-400">
                      {tag.usage.totalUsage} use
                      {tag.usage.totalUsage === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}

              {term && !exactMatch && !atLimit && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void commitInput(false)}
                    disabled={busy}
                    className="flex w-full cursor-pointer items-center gap-1.5 border-t border-stone-100 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Create tag “{input.trim()}”
                  </button>
                </li>
              )}

              {suggestions.length === 0 && exactMatch === null && !term && (
                <li className="px-3 py-2.5 text-[11px] text-stone-500">
                  No tags yet — type a name to create the first one.
                </li>
              )}
            </ul>
          )}

          {exactMatch && (
            <div className="flex items-center gap-1.5 border-t border-stone-100 px-3 py-1.5 text-[10px] text-emerald-600">
              <Check className="h-3 w-3" />“{exactMatch.name}”{" "}
              {excludedIds.has(exactMatch.id)
                ? "is already in the parent product's tags"
                : "already exists — Enter selects it"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
