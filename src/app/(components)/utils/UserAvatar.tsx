"use client";

import Image from "next/image";
import { useState } from "react";

type UserAvatarProps = {
  name: string;
  image: string | null | undefined;
  size?: number;
  className?: string;
};

export default function UserAvatar({
  name,
  image,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const initial = (name || "?").charAt(0).toUpperCase();
  const textSize = size >= 52 ? "text-lg" : size >= 36 ? "text-sm" : "text-xs";

  if (!image || failedImage === image) {
    return (
      <span
        style={{ width: size, height: size }}
        className={`flex shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 font-semibold text-rose-600 uppercase ${textSize} ${className}`}
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={image}
      alt={name || "User"}
      width={size}
      height={size}
      sizes={`${size}px`}
      loading="eager"
      onError={() => setFailedImage(image)}
      className={`shrink-0 rounded-full border border-rose-200/70 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
