/**
 * @brief Result shape returned by higher-level image upload helpers.
 *
 * @description
 * Output type we produce ourselves — TS is enough, no runtime validation.
 */
export type UploadImageResult =
  | {
      success: true;
      fileId: string;
      url: string;
    }
  | {
      success: false;
      message: string;
    };
