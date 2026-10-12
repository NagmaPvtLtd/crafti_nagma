"use client";

import { ImageKitProvider } from "@imagekit/next";
import type { ReactNode } from "react";

type IKProviderProps = {
  children: ReactNode;
};

/**
 * Provides the public ImageKit URL endpoint to descendant components.
 */
export default function IKProvider({ children }: IKProviderProps) {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!urlEndpoint) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Public ImageKit URL endpoint is missing from environment variables.",
      );
    }

    return <>{children}</>;
  }

  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>{children}</ImageKitProvider>
  );
}
