import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  renderOG,
} from "../../(components)/utils/ogImage";

export const alt = "Privacy Policy — Crafti Nagma";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OGImage() {
  return renderOG({
    eyebrow: "Crafti Nagma",
    title: "Privacy Policy",
    subtitle: "How we collect, use, and protect your information.",
  });
}
