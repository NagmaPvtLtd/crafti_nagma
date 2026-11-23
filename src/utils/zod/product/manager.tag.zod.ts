import { z } from "zod";

import { MAX_TAGS } from "../../Tags/tag.util";

const id = z.string().trim().min(10).max(40);

/** Tag names are trimmed, inner whitespace collapsed, 1–100 characters. */
export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "A tag cannot be empty")
  .max(100, "A tag can be at most 100 characters")
  .transform((value) => value.replace(/\s+/g, " ").trim());

export const tagCreateSchema = z.object({
  name: tagNameSchema,
});

export const tagUpdateSchema = z.object({
  name: tagNameSchema,
});

/** Full replacement of the tag set on a product or variant (0–15 tags). */
export const tagAssignSchema = z.object({
  tagIds: z
    .array(id)
    .max(MAX_TAGS, `A product can carry at most ${MAX_TAGS} tags`)
    .default([]),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
export type TagAssignInput = z.infer<typeof tagAssignSchema>;

export type TagUsage = {
  productCount: number;
  variantCount: number;
  totalUsage: number;
};

export type TagListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  usage: TagUsage;
};

export type TagListResponse = {
  ok: true;
  tags: TagListItem[];
  total: number;
};

export type TagMutationResponse = {
  ok: true;
  message: string;
  tag: { id: string; name: string; slug: string };
};
