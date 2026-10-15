import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  renderOG,
} from "../../(components)/utils/ogImage";

export const alt = "Terms of Service — Crafti Nagma";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OGImage() {
  return renderOG({
    eyebrow: "Crafti Nagma",
    title: "Terms of Service",
    subtitle: "The terms that govern your use of our website.",
  });
}
