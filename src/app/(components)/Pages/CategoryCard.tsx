"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flower2 } from "lucide-react";

import type { CollectionCategory } from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  One category tile — thumbnail, name and how many products it holds        */
/* -------------------------------------------------------------------------- */

export default function CategoryCard({
  category,
}: {
  category: CollectionCategory;
}) {
  return (
    <Link
      href={category.href}
      className="group flex flex-col rounded-(--card-radius) border border-white/60 bg-white/85 backdrop-blur-sm transition-all duration-300 [--card-radius:1rem] hover:scale-[1.02] hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-(--card-radius) bg-linear-to-b from-rose-100 via-rose-50 to-white">
        {category.thumbnailUrl ? (
          <Image
            src={category.thumbnailUrl}
            alt={category.name}
            fill
            loading="eager"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            className="card-photo object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Flower2 className="h-7 w-7 text-rose-300" />
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="truncate text-xs font-semibold text-stone-900 group-hover:text-rose-600">
            {category.name}
          </h3>
          <ArrowRight className="h-3 w-3 shrink-0 text-rose-500 transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-rose-600">
          {category.totalProductCount} product
          {category.totalProductCount === 1 ? "" : "s"} available!
        </p>
      </div>
    </Link>
  );
}
