import { z } from "zod";

import {
  IMAGEKIT_MAX_FILE_BYTES,
  IMAGEKIT_MAX_FILE_LABEL,
  IMAGEKIT_OUTPUT_FORMATS,
} from "../Imagekit/imagekit.util";

/**
 * @brief Input schema for ImageKit server-side uploads.
 */
export const uploadServerOptionsSchema = z.object({
  folder: z.string().min(1).startsWith("/", {
    error: "folder must start with '/'",
  }),
  fileName: z.string().min(1),
  isPrivateFile: z.boolean().optional(),
  customMetadata: z.record(z.string(), z.unknown()).optional(),

  /** Target format for raster images. Defaults to webp in the service. */
  convertTo: z.enum(IMAGEKIT_OUTPUT_FORMATS).optional(),

  /** Overrides the per-format default quality (webp 82, avif 60). */
  quality: z.number().int().min(1).max(100).optional(),
});

export type UploadServerOptions = z.infer<typeof uploadServerOptionsSchema>;

/**
 * @brief Input schema for the higher-level image upload helper.
 * Enforces the 15 MB per-file limit on the client before anything is sent.
 */
export const uploadImageParamsSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= IMAGEKIT_MAX_FILE_BYTES, {
      error: `File must be ${IMAGEKIT_MAX_FILE_LABEL} or smaller`,
    }),
  folder: z.string().min(1).startsWith("/"),
  fileNamePrefix: z.string().optional(),
  isPrivateFile: z.boolean().optional(),
  documentEnabled: z.boolean().optional(),
  convertTo: z.enum(IMAGEKIT_OUTPUT_FORMATS).optional(),
  quality: z.number().int().min(1).max(100).optional(),
});

export type UploadImageParams = z.infer<typeof uploadImageParamsSchema>;
