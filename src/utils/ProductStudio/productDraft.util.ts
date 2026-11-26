import type { TagRef } from "../Tags/tag.util";
import type { GlobalCategory } from "../zod/product/manager.category.zod";
import type { GlobalOption } from "../zod/product/manager.option.zod";

/**
 * The Add-a-product form, exactly as the manager left it.
 *
 * Written to `localStorage` on every edit so closing the tab, pressing back or
 * losing the page never loses the typing. It is cleared the moment the base
 * product is created, so the next "Add a product" starts blank.
 */
export type AddProductDraft = {
  form: {
    name: string;
    briefDescription: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    deliveryCharges: string;
    isFeatured: boolean;
    mainShowcase: boolean;
    status: "active" | "inactive";
  };
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: "cm" | "in";
  };
  /** Full category ids, parents included. */
  categoryIds: string[];
  tags: TagRef[];
  /** optionId → selected value ids. */
  values: Record<string, string[]>;
};

/** Only this page reads or writes it, so the key lives here. */
const DRAFT_KEY = "crafti:add-product:draft";

/* ------------------------------------------------------------------ */
/*  Reading the stored shape safely                                    */
/* ------------------------------------------------------------------ */

const text = (value: unknown) => (typeof value === "string" ? value : "");

const ids = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

function tagRefs(value: unknown): TagRef[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: TagRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { id, name, slug } = item as Partial<TagRef>;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    tags.push({ id, name: text(name), slug: text(slug) });
  }
  return tags;
}

function valueMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};

  const next: Record<string, string[]> = {};
  for (const [optionId, selected] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const kept = ids(selected);
    if (optionId.length > 0 && kept.length > 0) next[optionId] = kept;
  }
  return next;
}

/**
 * @brief The saved draft, or `null` when there is none or it is unreadable.
 *
 * @description Every field is type-checked on the way in: storage can be edited
 *              by hand or written by an older version of the page, and a broken
 *              draft must leave the form blank rather than crash it.
 */
export function readAddProductDraft(): AddProductDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as Partial<AddProductDraft> | null;
    if (!saved || typeof saved !== "object") return null;

    const form = (saved.form ?? {}) as Partial<AddProductDraft["form"]>;
    const dimensions = (saved.dimensions ?? {}) as Partial<
      AddProductDraft["dimensions"]
    >;

    return {
      form: {
        name: text(form.name),
        briefDescription: text(form.briefDescription),
        description: text(form.description),
        metaTitle: text(form.metaTitle),
        metaDescription: text(form.metaDescription),
        deliveryCharges: text(form.deliveryCharges),
        isFeatured: form.isFeatured === true,
        mainShowcase: form.mainShowcase === true,
        status: form.status === "inactive" ? "inactive" : "active",
      },
      dimensions: {
        length: text(dimensions.length),
        width: text(dimensions.width),
        height: text(dimensions.height),
        unit: dimensions.unit === "in" ? "in" : "cm",
      },
      categoryIds: ids(saved.categoryIds),
      tags: tagRefs(saved.tags),
      values: valueMap(saved.values),
    };
  } catch {
    /* storage blocked (private mode) or unparsable — start blank */
    return null;
  }
}

/** Saves the draft; a failed write (quota, private mode) must never break typing. */
export function writeAddProductDraft(draft: AddProductDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — the form keeps working without it */
  }
}

/**
 * @brief `true` when the form holds nothing worth remembering.
 *
 * @description A blank form is not stored at all: the key is removed instead, so
 *              Reset form (or opening and leaving the page untouched) never
 *              leaves an empty draft behind to be "restored" later.
 */
export function isAddProductDraftEmpty(draft: AddProductDraft): boolean {
  const form = draft.form;
  const delivery = form.deliveryCharges.trim();

  return (
    form.name.trim() === "" &&
    form.briefDescription.trim() === "" &&
    form.description.trim() === "" &&
    form.metaTitle.trim() === "" &&
    form.metaDescription.trim() === "" &&
    (delivery === "" || delivery === "0") &&
    !form.isFeatured &&
    !form.mainShowcase &&
    form.status === "active" &&
    draft.dimensions.length === "" &&
    draft.dimensions.width === "" &&
    draft.dimensions.height === "" &&
    draft.categoryIds.length === 0 &&
    draft.tags.length === 0 &&
    Object.keys(draft.values).length === 0
  );
}

/** Drops the draft — called once the base product exists. */
export function clearAddProductDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clean when storage is blocked */
  }
}

/* ------------------------------------------------------------------ */
/*  Matching saved ids against the pools that still exist              */
/* ------------------------------------------------------------------ */

/**
 * @brief Keeps only category ids that still exist, and re-adds their parents.
 *
 * @description The form's rule is that picking a sub category also picks its
 *              parent, so a restored child must never arrive without one. Ids of
 *              deleted categories are dropped instead of checked in the UI.
 */
export function pruneCategoryIds(
  ids: string[],
  categories: GlobalCategory[],
): string[] {
  const parentById = new Map(categories.map((c) => [c.id, c.parentId]));

  const next = new Set<string>();
  for (const id of ids) {
    if (!parentById.has(id)) continue;
    next.add(id);
    const parentId = parentById.get(id);
    if (parentId) next.add(parentId);
  }
  return [...next];
}

/**
 * @brief Keeps only the selected values that still exist under their option.
 *
 * @description An option whose every saved value is gone is dropped too, so the
 *              submit payload never carries an empty `valueIds` list.
 */
export function pruneSelectedValues(
  values: Record<string, string[]>,
  options: GlobalOption[],
): Record<string, string[]> {
  const valuesByOption = new Map(
    options.map((option) => [
      option.id,
      new Set(option.values.map((value) => value.id)),
    ]),
  );

  const next: Record<string, string[]> = {};
  for (const [optionId, valueIds] of Object.entries(values)) {
    const known = valuesByOption.get(optionId);
    if (!known) continue;

    const kept = valueIds.filter((id) => known.has(id));
    if (kept.length > 0) next[optionId] = kept;
  }
  return next;
}
