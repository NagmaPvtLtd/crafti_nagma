import { z } from "zod";

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
});

export type UploadServerOptions = z.infer<typeof uploadServerOptionsSchema>;

/**
 * @brief Input schema for the higher-level image upload helper.
 */
export const uploadImageParamsSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().min(1).startsWith("/"),
  fileNamePrefix: z.string().optional(),
  isPrivateFile: z.boolean().optional(),
  documentEnabled: z.boolean().optional(),
});

export type UploadImageParams = z.infer<typeof uploadImageParamsSchema>;
