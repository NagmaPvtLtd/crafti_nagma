import ProductDetailClient from "../../../../../app/(components)/Pages/Manager/ProductDetailClient";

export default async function ProductOverviewPage({
  params,
}: {
  params: Promise<{ product_id: string }>;
}) {
  const { product_id } = await params;

  return <ProductDetailClient productId={product_id} />;
}
