"use client";

import ProductDetailClient from "../../../../../app/(components)/Pages/Manager/ProductDetailClient";
import { useParams } from "next/navigation";

export default function ProductOverviewPage() {
  const { product_id } = useParams<{ product_id: string }>();

  return <ProductDetailClient productId={product_id} />;
}
