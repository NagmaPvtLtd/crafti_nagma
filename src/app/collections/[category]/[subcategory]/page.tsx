import CollectionBrowse from "../../../(components)/Pages/CollectionBrowse";

type PageProps = {
  params: Promise<{ category: string; subcategory: string }>;
};

export default async function CollectionSubcategoryPage({
  params,
}: PageProps) {
  const { category, subcategory } = await params;

  return (
    <CollectionBrowse
      category={decodeURIComponent(category)}
      subcategory={decodeURIComponent(subcategory)}
    />
  );
}
