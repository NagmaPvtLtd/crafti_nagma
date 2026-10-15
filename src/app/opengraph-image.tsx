import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  renderOG,
} from "./(components)/utils/ogImage";

export const alt = "Crafti Nagma — Handmade Crochet & Embroidery";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OGImage() {
  return renderOG({
    eyebrow: "Handmade in India",
    title: "Crafti Nagma",
    subtitle: "Stitch by stitch, made just for you.",
  });
}
