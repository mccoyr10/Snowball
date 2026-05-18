import Link from "next/link";

export const metadata = { title: "Terms of Service — Exhale Debt" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Snowball</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: May 17, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Snowball (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Description of Service</h2>
            <p>
              Snowball is a personal finance tool that helps users track and plan debt payoff using snowball and avalanche
              methods. The Service is provided for informational and planning purposes only and does not constitute
              financial advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. Subscription and Billing</h2>
            <p>
              Access to Snowball requires a paid subscription at $4.99/month after a 14-day free trial. Your credit card
              is required at signup. You will be charged automatically at the end of your trial period unless you cancel
              beforehand.
            </p>
            <p className="mt-2">
              You may cancel your subscription at any time from the Account section of the app. Upon cancellation, you
              retain access through the end of your current billing period. Refunds are not issued for partial months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity
              that occurs under your account. Notify us immediately at support@snowballapp.com if you suspect unauthorized
              access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. User Data</h2>
            <p>
              You own all financial data you enter into Snowball. We store it securely using Firebase / Google Cloud
              infrastructure. See our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for
              details on how we handle your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Share your account credentials with others (household sharing is available in-app)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind. Snowball does not guarantee the accuracy
              of projections or payoff calculations. All financial decisions are your own responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Snowball shall not be liable for any indirect, incidental, special,
              or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes
              acceptance of the new Terms. We will notify users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">10. Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
              <a href="mailto:support@snowballapp.com" className="text-blue-600 hover:underline">support@snowballapp.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
