import type { Metadata } from "next";
import PolicyLayout from "../../(components)/Policy/PolicyLayout";
import { supportMail } from "../../../utils/main.util";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — Crafti Nagma",
  description:
    "Crafti Nagma does not accept cancellations or offer refunds on items after they have been shipped.",
};

const h2 = "mt-9 mb-3 text-lg font-semibold text-[#1f1f1f]";
const p = "text-[15px] leading-7 text-[#3d3d3d]";
const strong = "font-semibold text-[#1f1f1f]";
const link = "text-[#8b5e3c] underline";

export default function CancellationRefundPage() {
  return (
    <PolicyLayout
      title="Cancellation & Refund Policy"
      lastUpdated="10 October 2026"
    >
      <p className={p}>
        At <span className={strong}>Crafti Nagma</span>, every item is handmade
        and crafted with care. Please read this policy carefully before placing
        your order.
      </p>

      <section>
        <h2 className={h2}>Cancellations</h2>
        <p className={p}>
          Orders cannot be cancelled once they have been shipped.
        </p>
      </section>

      <section>
        <h2 className={h2}>Refunds</h2>
        <p className={p}>
          We do not offer refunds on any item once it has been shipped.
        </p>
      </section>

      <section>
        <h2 className={h2}>Contact Us</h2>
        <p className={p}>
          If you have any questions about this policy, please reach us at{" "}
          <a className={link} href={`mailto:${supportMail}`}>
            {supportMail}
          </a>
          .
        </p>
      </section>
    </PolicyLayout>
  );
}
