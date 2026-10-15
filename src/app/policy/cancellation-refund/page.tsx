import type { Metadata } from "next";
import PolicyLayout from "../../(components)/Policy/PolicyLayout";
import { SectionDivider } from "../../(components)/utils/SectionDiv";
import { supportMail } from "../../../utils/main.util";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — Crafti Nagma",
  description:
    "How cancellations and refunds work at Crafti Nagma for handmade orders.",
};

const h2 = "text-base font-semibold text-stone-900 sm:text-lg";
const p = "text-[15px] leading-7 text-stone-600";
const ul =
  "mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-stone-600 marker:text-rose-300";
const strong = "font-medium text-stone-900";
const link =
  "font-medium text-rose-500 underline decoration-rose-300 decoration-dashed underline-offset-4 transition-colors hover:text-rose-600";

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-500">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className={h2}>{title}</h2>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}

export default function CancellationRefundPage() {
  return (
    <PolicyLayout
      title="Cancellation & Refund Policy"
      lastUpdated="15 October 2026"
    >
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 h-24 w-64 rounded-full bg-rose-200/30 blur-3xl"
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-5 py-7 backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-9">
          <p className={p}>
            At <span className={strong}>Crafti Nagma</span>, every item is
            handmade and crafted with care. Please read this policy carefully
            before placing your order.
          </p>

          <div className="mt-8 space-y-8">
            <Section index={1} title="Cancellations">
              <p className={p}>
                You can cancel your order only within{" "}
                <span className={strong}>24 hours of payment</span>, or before
                the payment is processed. Once this window has passed, the order
                moves into our crafting queue and can no longer be cancelled
                directly from your account.
              </p>
            </Section>

            <SectionDivider />

            <Section index={2} title="Orders Already in Progress">
              <p className={p}>
                If your ordered item is already{" "}
                <span className={strong}>
                  being crafted or has been shipped
                </span>
                , you may still reach out to us through the contact mediums
                listed on the website. We will review your request on a
                case-by-case basis, but cancellation at this stage is not
                guaranteed.
              </p>
            </Section>

            <SectionDivider />

            <Section index={3} title="Refunds">
              <p className={p}>
                All approved refunds are processed within{" "}
                <span className={strong}>5 working days</span> to the UPI ID you
                have entered in your profile.
              </p>
              <ul className={ul}>
                <li>
                  Please make sure the UPI ID you enter is correct — refunds are
                  sent to the exact UPI ID you provide.
                </li>
                <li>
                  If you entered an incorrect UPI ID, please contact our support
                  team right away so we can help resolve the issue.
                </li>
              </ul>
            </Section>

            <SectionDivider />

            <Section index={4} title="Contact Us">
              <p className={p}>
                If you have any questions about this policy, or need help with a
                cancellation or refund, please reach us at{" "}
                <a className={link} href={`mailto:${supportMail}`}>
                  {supportMail}
                </a>
                .
              </p>
            </Section>
          </div>

          <SectionDivider className="mt-10" />
        </div>
      </div>
    </PolicyLayout>
  );
}
