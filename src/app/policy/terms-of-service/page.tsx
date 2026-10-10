import type { Metadata } from "next";
import PolicyLayout from "../../(components)/Policy/PolicyLayout";
import { supportMail } from "../../../utils/main.util";

export const metadata: Metadata = {
  title: "Terms of Service — Crafti Nagma",
  description:
    "The terms and conditions that govern your use of the Crafti Nagma website and services.",
};

const h2 = "mt-9 mb-3 text-lg font-semibold text-[#1f1f1f]";
const p = "text-[15px] leading-7 text-[#3d3d3d]";
const ul =
  "mt-3 list-disc pl-5 space-y-1.5 text-[15px] leading-7 text-[#3d3d3d]";
const strong = "font-semibold text-[#1f1f1f]";
const link = "text-[#8b5e3c] underline";

export default function TermsOfServicePage() {
  return (
    <PolicyLayout title="Terms of Service" lastUpdated="10 October 2026">
      <p className={p}>
        Welcome to <span className={strong}>Crafti Nagma</span>. These Terms of
        Service (&ldquo;Terms&rdquo;) govern your access to and use of our
        website, products and services. By accessing our website or placing an
        order, you agree to be bound by these Terms. If you do not agree, please
        do not use the website.
      </p>

      <section>
        <h2 className={h2}>1. About Us</h2>
        <p className={p}>
          Crafti Nagma sells handmade crochet and craft items. Every product is
          made by hand, so slight variations in colour, size, texture and finish
          are natural and are not considered defects.
        </p>
      </section>

      <section>
        <h2 className={h2}>2. Eligibility</h2>
        <p className={p}>
          You must be at least 18 years old, or use this website under the
          supervision of a parent or legal guardian, to place an order. By using
          the website, you confirm that the information you provide is accurate
          and complete.
        </p>
      </section>

      <section>
        <h2 className={h2}>3. Your Account</h2>
        <ul className={ul}>
          <li>
            You are responsible for maintaining the confidentiality of your
            account credentials.
          </li>
          <li>You agree to provide accurate and up-to-date information.</li>
          <li>
            You are responsible for all activity that occurs under your account.
          </li>
          <li>
            Notify us immediately if you suspect any unauthorised use of your
            account.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>4. Products and Pricing</h2>
        <ul className={ul}>
          <li>
            We make every effort to display product colours, sizes and
            descriptions accurately, but actual items may vary slightly.
          </li>
          <li>
            Prices are listed in Indian Rupees (INR) and are subject to change
            without prior notice.
          </li>
          <li>
            We reserve the right to correct pricing errors and to cancel any
            order affected by such errors, with a full refund where applicable.
          </li>
          <li>
            Product availability is not guaranteed until an order is accepted by
            us.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>5. Orders</h2>
        <p className={p}>
          When you place an order, you will receive an order confirmation. Your
          order is only accepted once we confirm it and begin processing. For
          handmade items, orders move through the following stages:
        </p>
        <ul className={ul}>
          <li>Pending</li>
          <li>Accepted</li>
          <li>Crafting in progress</li>
          <li>Slight delay (if applicable)</li>
          <li>Almost done</li>
          <li>Shipped</li>
          <li>Delivered</li>
        </ul>
        <p className={`${p} mt-3`}>
          You will be able to track the status of your order from your account.
        </p>
      </section>

      <section>
        <h2 className={h2}>6. Payments</h2>
        <p className={p}>
          All payments are processed securely via{" "}
          <span className={strong}>Razorpay</span>. We do not store your card
          details, UPI PIN or net banking credentials. By making a payment, you
          agree to Razorpay&rsquo;s terms of service in addition to ours.
        </p>
      </section>

      <section>
        <h2 className={h2}>7. Shipping and Delivery</h2>
        <ul className={ul}>
          <li>We ship to addresses within India, unless stated otherwise.</li>
          <li>
            Delivery timelines are estimates and may vary due to courier delays,
            weather or other factors beyond our control.
          </li>
          <li>
            Risk of loss or damage passes to you once the order is handed over
            to the courier.
          </li>
          <li>
            Please ensure your shipping address and phone number are accurate.
            We are not responsible for failed deliveries due to incorrect
            information.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>8. Cancellations and Refunds</h2>
        <p className={p}>
          Cancellations and refunds are governed by our{" "}
          <a className={link} href="/cancellation-refund">
            Cancellation &amp; Refund Policy
          </a>
          . Please review that page before placing an order.
        </p>
      </section>

      <section>
        <h2 className={h2}>9. Personalised Items</h2>
        <p className={p}>
          Items that include custom personalization (such as names, dates or
          messages) are made specifically for you. Please double-check all
          personalization details before confirming your order. We are not
          responsible for errors in the details you provide.
        </p>
      </section>

      <section>
        <h2 className={h2}>10. Intellectual Property</h2>
        <p className={p}>
          All content on this website — including product photos, descriptions,
          logos and designs — is owned by Crafti Nagma and may not be copied,
          reproduced or used without our prior written permission.
        </p>
      </section>

      <section>
        <h2 className={h2}>11. Acceptable Use</h2>
        <p className={p}>You agree not to:</p>
        <ul className={ul}>
          <li>Use the website for any unlawful purpose.</li>
          <li>
            Attempt to gain unauthorised access to our systems or accounts.
          </li>
          <li>Submit false, misleading or fraudulent information.</li>
          <li>Interfere with the normal operation of the website.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>12. Limitation of Liability</h2>
        <p className={p}>
          To the maximum extent permitted by law, Crafti Nagma shall not be
          liable for any indirect, incidental or consequential damages arising
          from your use of the website or our products. Our total liability for
          any claim shall not exceed the amount you paid for the relevant order.
        </p>
      </section>

      <section>
        <h2 className={h2}>13. Governing Law</h2>
        <p className={p}>
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts in [Your City,
          State].
        </p>
      </section>

      <section>
        <h2 className={h2}>14. Changes to These Terms</h2>
        <p className={p}>
          We may update these Terms from time to time. The latest version will
          always be available on this page. Continued use of the website after
          changes means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2 className={h2}>15. Contact</h2>
        <p className={p}>
          If you have any questions about these Terms, please contact us at:
        </p>
        <ul className={ul}>
          <li>
            Email:{" "}
            <a className={link} href={`mailto:${supportMail}`}>
              {supportMail}
            </a>
          </li>
        </ul>
      </section>
    </PolicyLayout>
  );
}
