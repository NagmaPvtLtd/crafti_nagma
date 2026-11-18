import VariantDetailClient from "../../../../../../(components)/Pages/Manager/VariantDetailClient";

export default async function VariantOverviewPage({
  params,
}: {
  params: Promise<{ product_id: string; variant_id: string }>;
}) {
  const { product_id, variant_id } = await params;

  return <VariantDetailClient productId={product_id} variantId={variant_id} />;
}
