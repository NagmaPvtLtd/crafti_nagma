import type { Metadata } from "next";
import PolicyLayout from "../../(components)/Policy/PolicyLayout";
import { SectionDivider } from "../../(components)/utils/SectionDiv";
import { supportMail } from "../../../utils/main.util";

export const metadata: Metadata = {
  title: "Privacy Policy — Crafti Nagma",
  description:
    "How Crafti Nagma collects, uses, stores and protects your personal information.",
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

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="10 October 2026">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 h-24 w-64 rounded-full bg-rose-200/30 blur-3xl"
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-5 py-7 backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-9">
          <p className={p}>
            This Privacy Policy explains how{" "}
            <span className={strong}>Crafti Nagma</span> (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores and
            protects your personal information when you visit or shop on our
            website. By using our website, you agree to the practices described
            here.
          </p>

          <div className="mt-8 space-y-8">
            <Section index={1} title="Information We Collect">
              <p className={p}>
                We collect the following information when you use our website:
              </p>
              <ul className={ul}>
                <li>
                  <span className={strong}>Account details:</span> first name,
                  last name, full name, email address and phone number.
                </li>
                <li>
                  <span className={strong}>Authentication data:</span> a
                  securely hashed password, or your Google account identifier if
                  you sign in with Google.
                </li>
                <li>
                  <span className={strong}>Shipping address:</span> address
                  lines, landmark, city, state, postal code and country.
                </li>
                <li>
                  <span className={strong}>Optional business details:</span>{" "}
                  company name and GSTIN, if you provide them.
                </li>
                <li>
                  <span className={strong}>Order information:</span> items
                  purchased, quantities, prices, personalization details (such
                  as names or messages you ask us to add to a handmade item),
                  and order status.
                </li>
                <li>
                  <span className={strong}>Payment information:</span> payment
                  reference IDs, amount, currency, payment method type and
                  payment status. We do not receive or store your full card
                  number, CVV, UPI PIN or net banking credentials.
                </li>
                <li>
                  <span className={strong}>Files you upload or we store:</span>{" "}
                  images and media associated with your account or our product
                  catalogue.
                </li>
                <li>
                  <span className={strong}>Usage data:</span> pages visited,
                  device and browser type, IP address, and basic session
                  information.
                </li>
              </ul>
            </Section>

            <SectionDivider />

            <Section index={2} title="How We Use Your Information">
              <ul className={ul}>
                <li>
                  To create and manage your account and verify your email or
                  phone number.
                </li>
                <li>To process, pack, craft and deliver your orders.</li>
                <li>To collect payment for your orders.</li>
                <li>
                  To send order updates — for example when your order is
                  accepted, being crafted, or shipped.
                </li>
                <li>
                  To respond to your questions, requests and support enquiries.
                </li>
                <li>To improve our website, product listings and services.</li>
                <li>To comply with applicable legal and tax requirements.</li>
              </ul>
            </Section>

            <SectionDivider />

            <Section index={3} title="Payments">
              <p className={p}>
                All payments are processed through{" "}
                <span className={strong}>Razorpay</span>, a third-party payment
                gateway. When you pay, your payment details are entered directly
                on Razorpay&rsquo;s secure interface. We only receive a
                confirmation containing the payment ID, amount, method type and
                status. Razorpay&rsquo;s own privacy policy governs how they
                handle your payment data.
              </p>
            </Section>

            <SectionDivider />

            <Section index={4} title="Image Storage">
              <p className={p}>
                Product images, profile pictures and other media are stored and
                delivered using <span className={strong}>ImageKit</span>, a
                third-party image hosting and optimization service. Files stored
                there may be accessible via public URLs.
              </p>
            </Section>

            <SectionDivider />

            <Section index={5} title="Cookies and Sessions">
              <p className={p}>
                We use cookies and session identifiers to keep you signed in and
                to maintain your shopping cart. If you add items to your cart
                before signing in, we temporarily store a session identifier so
                your cart is preserved when you log in. You can disable cookies
                in your browser, but parts of the website may stop working.
              </p>
            </Section>

            <SectionDivider />

            <Section index={6} title="Sharing Your Information">
              <p className={p}>
                We do not sell your personal information. We share it only with:
              </p>
              <ul className={ul}>
                <li>
                  <span className={strong}>Payment processors</span> (Razorpay)
                  to complete your transaction.
                </li>
                <li>
                  <span className={strong}>
                    Image and file hosting providers
                  </span>{" "}
                  (ImageKit) for media delivery.
                </li>
                <li>
                  <span className={strong}>Delivery partners</span>, limited to
                  the name, address and phone number needed to deliver your
                  order.
                </li>
                <li>
                  <span className={strong}>Legal authorities</span>, where
                  required by law.
                </li>
              </ul>
            </Section>

            <SectionDivider />

            <Section index={7} title="Data Retention">
              <p className={p}>
                We retain your account information for as long as your account
                is active. Order and payment records are retained for as long as
                required for accounting, tax and legal purposes, even if your
                account is closed. You may request deletion of your account at
                any time, subject to these retention requirements.
              </p>
            </Section>

            <SectionDivider />

            <Section index={8} title="Your Rights">
              <p className={p}>You may contact us at any time to:</p>
              <ul className={ul}>
                <li>Access the personal information we hold about you.</li>
                <li>Correct or update inaccurate information.</li>
                <li>Request deletion of your account and personal data.</li>
                <li>Withdraw consent for non-essential communication.</li>
              </ul>
            </Section>

            <SectionDivider />

            <Section index={9} title="Security">
              <p className={p}>
                We take reasonable technical and organisational measures to
                protect your information, including hashed passwords and
                encrypted connections. However, no method of transmission over
                the internet is completely secure, and we cannot guarantee
                absolute security.
              </p>
            </Section>

            <SectionDivider />

            <Section index={10} title="Children">
              <p className={p}>
                Our website is not intended for children under 18. We do not
                knowingly collect personal information from children. If you
                believe a child has provided us with personal data, please
                contact us so we can remove it.
              </p>
            </Section>

            <SectionDivider />

            <Section index={11} title="Changes to This Policy">
              <p className={p}>
                We may update this Privacy Policy from time to time. The revised
                version will be posted on this page with an updated date.
                Continued use of the website after changes means you accept the
                updated policy.
              </p>
            </Section>

            <SectionDivider />

            <Section index={12} title="Contact Us">
              <p className={p}>
                For any privacy-related questions or requests, please contact us
                at:
              </p>
              <ul className={ul}>
                <li>
                  Email:{" "}
                  <a className={link} href={`mailto:${supportMail}`}>
                    {supportMail}
                  </a>
                </li>
              </ul>
            </Section>
          </div>

          <SectionDivider className="mt-10" />
        </div>
      </div>
    </PolicyLayout>
  );
}
