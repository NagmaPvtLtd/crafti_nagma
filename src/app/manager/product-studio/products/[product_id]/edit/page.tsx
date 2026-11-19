"use client";

import { useParams } from "next/navigation";
import EditProductClient from "../../../../../(components)/Pages/Manager/EditProductClient";
export default function EditProductPage() {
  const { product_id } = useParams<{ product_id: string }>();

  return <EditProductClient productId={product_id} />;
}
