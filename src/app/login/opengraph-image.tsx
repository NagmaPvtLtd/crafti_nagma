import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOG,
} from "../(components)/utils/ogImage";

export const alt = "Cancellation & Refund Policy — Crafti Nagma";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OGImage() {
  return renderOG({
    eyebrow: "Crafti Nagma",
    title: "Login",
    subtitle: "Get started by registering yourself on Crafti Nagma.",
  });
}
