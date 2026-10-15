import "server-only";
import { toFile } from "@imagekit/nodejs";

import { getProduction } from "../utils/ValueFetcher/getProduction.util";
import { getDBName } from "../utils/ValueFetcher/getDBName.util";
import { imagekitClient } from "../lib/ImageKit/imagekit.config";
import {
  UploadServerOptions,
  uploadServerOptionsSchema,
} from "../utils/zod-schema/imagekit.schemas.zod";

/**
 * @brief Centralized ImageKit operations.
 *
 * @description
 * All server-side ImageKit access goes through this class so the client,
 * auth, environment namespacing, and signing rules stay in one place.
 */
export class ImageKitService {
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
   * In non-production environments, redirects files from
   * "/<dbName>/" to "/<dbName>-false/".
   *
   * @param file - File contents as a Buffer or Base64 string.
   * @param options - Upload configuration (validated at runtime by Zod).
   * @returns The ImageKit upload response.
   */
  static async upload(file: Buffer | string, options: UploadServerOptions) {
    const opts = uploadServerOptionsSchema.parse(options);
    const imagekit = imagekitClient();
    const isProduction = getProduction();

    let finalFolder = opts.folder;

    if (!isProduction) {
      finalFolder = finalFolder.replace(
        `/${getDBName()}/`,
        `/${getDBName()}-false/`,
      );
    }

    console.log(
      `[IMAGEKIT - UPLOAD] >_ ${opts.fileName} → ${finalFolder} (private: ${opts.isPrivateFile ?? false})`,
    );

    const uploadFile =
      typeof file === "string" ? file : await toFile(file, opts.fileName);

    return imagekit.files.upload({
      file: uploadFile,
      fileName: opts.fileName,
      folder: finalFolder,
      isPrivateFile: opts.isPrivateFile ?? false,
      useUniqueFileName: true,
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
