import { OG_SIZE, OG_CONTENT_TYPE, renderOG } from "../../(components)/utils/ogImage";

export const alt = "Product — Crafti Nagma";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OGImage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;
const name = slug
.split("-")
.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
.join(" ");

return renderOG({
eyebrow: "Crafti Nagma",
title: name,
subtitle: "Handmade with love.",
});
}
