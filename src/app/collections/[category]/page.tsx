import CollectionBrowse from "../../(components)/Pages/CollectionBrowse";

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function CollectionCategoryPage({ params }: PageProps) {
  const { category } = await params;

  return <CollectionBrowse category={decodeURIComponent(category)} />;
}
