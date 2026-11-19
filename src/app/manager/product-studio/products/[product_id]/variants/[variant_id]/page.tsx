"use client";

import VariantDetailClient from "../../../../../../(components)/Pages/Manager/VariantDetailClient";
import { useParams } from "next/navigation";

export default function VariantOverviewPage() {
  const { product_id, variant_id } = useParams<{ product_id: string; variant_id: string }>();

  return <VariantDetailClient productId={product_id} variantId={variant_id} />;
}
