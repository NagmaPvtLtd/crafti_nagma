import "server-only";
import { toFile } from "@imagekit/nodejs";

import { getProduction } from "../utils/ValueFetcher/getProduction.util";
import { getDBName } from "../utils/ValueFetcher/getDBName.util";
import { imagekitClient } from "../lib/ImageKit/imagekit.config";
import {
  UploadServerOptions,
  uploadServerOptionsSchema,
} from "../utils/zod-schema/imagekit.schemas.zod";
import {
  base64ByteLength,
  formatFileSize,
  IMAGEKIT_DEFAULT_OUTPUT_FORMAT,
  IMAGEKIT_MAX_FILE_BYTES,
  IMAGEKIT_MAX_FILE_LABEL,
  planImageConversion,
} from "../utils/Imagekit/imagekit.util";

/* -------------------------------------------------------------------------- */
/*  Errors                                                                    */
/* -------------------------------------------------------------------------- */

export type ImageKitUploadErrorCode = "empty_file" | "file_too_large";

/**
 * @brief Rejection from the upload guard, before anything reaches ImageKit.
 *
 * @description
 * Carries an HTTP status so a route handler can answer directly:
 *   413 → too large, 400 → empty/unusable payload.
 */
export class ImageKitUploadError extends Error {
  readonly code: ImageKitUploadErrorCode;
  readonly status: number;

  constructor(code: ImageKitUploadErrorCode, message: string, status: number) {
    super(message);
    this.name = "ImageKitUploadError";
    this.code = code;
    this.status = status;
  }
}

/**
 * @brief Centralized ImageKit operations.
 *
 * @description
 * All server-side ImageKit access goes through this class so the client,
 * auth, environment namespacing, and signing rules stay in one place.
 *
 * Every upload is guarded here: at most 15 MB per file, and raster images are
 * re-encoded to WebP/AVIF on the way in via an ImageKit pre-transformation, so
 * the file that gets stored — and billed — is the small one.
 */
function isAlreadyDeleted(err: unknown): boolean {
  if (typeof err === "string") {
    return /404|not found|does not exist/i.test(err);
  }
  if (typeof err !== "object" || err === null) return false;

  const candidate = err as {
    status?: number;
    statusCode?: number;
    $metadata?: { httpStatusCode?: number };
    response?: { status?: number };
    message?: string;
  };

  const status =
    candidate.status ??
    candidate.statusCode ??
    candidate.$metadata?.httpStatusCode ??
    candidate.response?.status;

  return (
    status === 404 ||
    /404|not found|does not exist/i.test(candidate.message ?? "")
  );
}

export class ImageKitService {
  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  /**
   * Root folder for the current environment.
   *
   *   production     → "<db-name>"         e.g. "crafti-nagma"
   *   anything else  → "<db-name>-false"   e.g. "crafti-nagma-false"
   *
   * Callers never build this themselves — use `envFolder()` so the suffix can
   * never be forgotten.
   */
  static environmentFolder(): string {
    const dbName = getDBName();
    return getProduction() ? dbName : `${dbName}-false`;
  }

  /**
   * Build an ImageKit folder under this environment's root.
   *
   *   ImageKitService.envFolder("products", productId)
   *     → "/crafti-nagma-false/products/<id>"   (non-production)
   */
  static envFolder(...segments: (string | null | undefined)[]): string {
    const tail = segments
      .flatMap((segment) => String(segment ?? "").split("/"))
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("/");

    return tail ? `/${ImageKitService.environmentFolder()}/${tail}` : `/${ImageKitService.environmentFolder()}`;
  }

  /**
   * Normalise a folder passed to `upload()`.
   *
   * Accepts a bare folder ("/products/abc"), one that already starts with the
   * environment root, or a legacy one starting with the raw DB name — the
   * result always sits under the correct environment folder.
   */
  private static resolveFolder(folder: string): string {
    const root = ImageKitService.environmentFolder();
    const dbName = getDBName();
    const clean = folder.replace(/^\/+|\/+$/g, "");

    if (clean === root || clean.startsWith(`${root}/`)) return `/${clean}`;
    if (clean === dbName) return ImageKitService.envFolder();
    if (clean.startsWith(`${dbName}/`)) {
      return ImageKitService.envFolder(clean.slice(dbName.length + 1));
    }

    return ImageKitService.envFolder(clean);
  }

  // ---------------------------------------------------------------------------
  // Signing / reading
  // ---------------------------------------------------------------------------

  /**
   * Generate a short-lived signed URL for a private ImageKit file.
   *
   * @param path - File path inside ImageKit
   * @param expireSeconds - URL validity in seconds (default: 5 minutes)
   */
  static getSignedUrl(path: string, expireSeconds = 300): string {
    const imagekit = imagekitClient();

    return imagekit.helper.buildSrc({
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      src: path.startsWith("/") ? path : `/${path}`,
      signed: true,
      expiresIn: expireSeconds,
    });
  }

  /**
   * Fetch an ImageKit file and return it as a Buffer.
   *
   * @param filePath - ImageKit file path or full URL
   * @returns File contents as Buffer
   */
  static async getFileAsBuffer(filePath: string): Promise<Buffer> {
    try {
      const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;

      let path = filePath;

      // Convert a full ImageKit URL into a relative file path.
      if (/^https?:\/\//i.test(filePath)) {
        const fileUrl = new URL(filePath);
        const endpointUrl = new URL(urlEndpoint);

        if (fileUrl.origin !== endpointUrl.origin) {
          throw new Error("File URL does not belong to your ImageKit endpoint");
        }

        const endpointPath = endpointUrl.pathname.replace(/\/+$/, "");
        const pathname = fileUrl.pathname;

        if (
          endpointPath &&
          endpointPath !== "/" &&
          pathname !== endpointPath &&
          !pathname.startsWith(`${endpointPath}/`)
        ) {
          throw new Error("File URL does not belong to your ImageKit endpoint");
        }

        path =
          endpointPath && endpointPath !== "/"
            ? pathname.slice(endpointPath.length)
            : pathname;
      }

      const signedUrl = ImageKitService.getSignedUrl(path, 900);
      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error: unknown) {
      console.error(
        "[IMAGEKIT - FETCH] ✕ Failed to fetch file as buffer :",
        error,
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  /**
   * Uploads a Buffer or Base64 string to ImageKit from the server.
   *
   * The folder is always nested under the environment root
   * (`<dbName>` in production, `<dbName>-false` otherwise) — see
   * `environmentFolder()`. Pass a bare folder such as "/products/<id>".
   *
   * Before uploading:
   *  - rejects an empty payload (400) or anything over 15 MB (413);
   *  - plans the storage format — raster images become `.webp` (default) or
   *    `.avif`, everything else (SVG, GIF, PDF, video…) is stored untouched;
   *  - applies the conversion as an ImageKit pre-transformation, so ImageKit
   *    stores the converted file instead of the original and the storage saving
   *    is real, not just at delivery time.
   *
   * @param file - File contents as a Buffer or Base64 string.
   * @param options - Upload configuration (validated at runtime by Zod).
   * @returns The ImageKit upload response.
   * @throws {ImageKitUploadError} when the payload is empty or over the limit.
   */
  static async upload(file: Buffer | string, options: UploadServerOptions) {
    const opts = uploadServerOptionsSchema.parse(options);
    const imagekit = imagekitClient();

    /* ---- 1. validate the payload before anything leaves the server ---- */
    const bytes =
      typeof file === "string" ? base64ByteLength(file) : file.byteLength;

    if (bytes <= 0) {
      throw new ImageKitUploadError(
        "empty_file",
        `"${opts.fileName}" is empty — nothing to upload.`,
        400,
      );
    }

    if (bytes > IMAGEKIT_MAX_FILE_BYTES) {
      throw new ImageKitUploadError(
        "file_too_large",
        `"${opts.fileName}" is ${formatFileSize(bytes)} — a single file can be at most ${IMAGEKIT_MAX_FILE_LABEL}.`,
        413,
      );
    }

    /* ---- 2. decide the stored format ---- */
    const plan = planImageConversion(
      opts.fileName,
      opts.convertTo ?? IMAGEKIT_DEFAULT_OUTPUT_FORMAT,
      opts.quality,
    );

    const finalFolder = ImageKitService.resolveFolder(opts.folder);

    console.log(
      `[IMAGEKIT - UPLOAD] >_ ${opts.fileName} → ${finalFolder} (private: ${
        opts.isPrivateFile ?? false
      }, size: ${formatFileSize(bytes)}, ${
        plan.converted
          ? `${plan.fromExtension || "image"} → ${plan.format} [${plan.pre}]`
          : "stored as-is"
      })`,
    );

    /* ---- 3. upload (converted, when there is a plan) ---- */
    const uploadFile =
      typeof file === "string" ? file : await toFile(file, plan.fileName);

    return imagekit.files.upload({
      file: uploadFile,
      fileName: plan.fileName,
      folder: finalFolder,
      isPrivateFile: opts.isPrivateFile ?? false,
      useUniqueFileName: true,
      ...(plan.pre ? { transformation: { pre: plan.pre } } : {}),
    });
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /**
   * Delete a single ImageKit file by its fileId.
   *
   * @description
   * Log-and-swallow: deletion failures shouldn't break the caller's flow
   * (e.g. cleaning up an orphaned upload). Errors are logged for auditing.
   */
  static async deleteFile(fileId: string): Promise<void> {
    if (!fileId) return;

    try {
      console.log(`[IMAGEKIT - DELETE] >_ File ${fileId}`);
      const imagekit = imagekitClient();
      await imagekit.files.delete(fileId);
    } catch (err: unknown) {
      console.error(
        `[IMAGEKIT - DELETE] ✕ Failed to delete file ${fileId} :`,
        err,
      );
    }
  }

  /**
   * Delete a file and report whether it is gone.
   *
   * @description
   * Unlike `deleteFile`, this never hides a real failure: callers that must
   * not leave an orphan ImageKit object (variant / product media deletion)
   * use the boolean to abort before changing the database. A 404 means the
   * file is already gone and counts as success.
   */
  static async deleteFileStrict(fileId: string): Promise<boolean> {
    if (!fileId) return true;

    try {
      console.log(`[IMAGEKIT - DELETE STRICT] >_ File ${fileId}`);
      const imagekit = imagekitClient();
      await imagekit.files.delete(fileId);
      return true;
    } catch (err: unknown) {
      if (isAlreadyDeleted(err)) {
        console.log(
          `[IMAGEKIT - DELETE STRICT] ➤ File ${fileId} was already deleted`,
        );
        return true;
      }
      console.error(
        `[IMAGEKIT - DELETE STRICT] ✕ Failed to delete file ${fileId} :`,
        err,
      );
      return false;
    }
  }

  /**
   * Delete an ImageKit folder given any file URL inside it.
   *
   * @description
   * Strips the endpoint base path and the filename, then deletes the
   * resulting parent folder. Log-and-swallow — see `deleteFile`.
   */
  static async deleteFolder(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      const urlObj = new URL(fileUrl);
      const segments = urlObj.pathname.split("/").filter(Boolean);

      // Remove the ImageKit endpoint's base path, if present.
      const endpointPath = new URL(
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      ).pathname
        .split("/")
        .filter(Boolean);

      if (
        endpointPath.length &&
        endpointPath.every((segment, index) => segments[index] === segment)
      ) {
        segments.splice(0, endpointPath.length);
      }

      // Remove the filename to obtain its parent folder.
      segments.pop();

      if (segments.length === 0) return;

      const folderPath = `/${segments.join("/")}`;

      console.log(`[IMAGEKIT - DELETE] >_ Folder ${folderPath}`);

      const imagekit = imagekitClient();
      await imagekit.folders.delete({ folderPath });
    } catch (err: unknown) {
      console.error("[IMAGEKIT - DELETE] ✕ Failed to delete folder :", err);
    }
  }
}
