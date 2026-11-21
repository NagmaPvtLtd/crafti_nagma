import CollectionProduct from "../../../../(components)/Pages/CollectionProduct";

type PageProps = {
  params: Promise<{
    category: string;
    subcategory: string;
    product: string;
  }>;
};

export default async function CollectionProductPage({ params }: PageProps) {
  const { product } = await params;

  return <CollectionProduct code={decodeURIComponent(product)} />;
}
