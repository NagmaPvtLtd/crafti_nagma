"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

export const goBackPropsSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1).optional(),
});

export type GoBackButtonProps = z.infer<typeof goBackPropsSchema>;

export default function GoBack({ href, label = "Go Back" }: GoBackButtonProps) {
  const router = useRouter();

  const handleGoBack = () => {
    const isAdminRoute = href.includes("/admin");

    if (isAdminRoute && typeof window !== "undefined") {
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }

    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={handleGoBack}
      aria-label={label}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-lg text-xs text-stone-700 transition-colors duration-200"
    >
      <ArrowLeft
        size={14}
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
