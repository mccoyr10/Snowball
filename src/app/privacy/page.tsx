import Link from "next/link";

export const metadata = { title: "Privacy Policy — Exhale Debt" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Snowball</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: May 17, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Information We Collect</h2>
            <p>When you use Snowball, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account information:</strong> email address, display name, and password (hashed by Firebase Auth)</li>
              <li><strong>Financial data:</strong> debt names, balances, interest rates, minimum payments, and payment history that you enter</li>
              <li><strong>Billing information:</strong> your Stripe customer ID and subscription status (we never store full card numbers)</li>
              <li><strong>Usage data:</strong> basic analytics such as feature usage and error logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide and operate the Snowball service</li>
              <li>Process subscription payments through Stripe</li>
              <li>Send transactional emails (trial reminders, payment receipts)</li>
              <li>Improve the service and diagnose technical issues</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-2">We do not sell your data to third parties or use it for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. Data Storage and Security</h2>
            <p>
              Your data is stored in Google Firebase / Firestore, hosted on Google Cloud infrastructure with
              encryption at rest and in transit. Access is controlled by Firebase Security Rules and requires
              authentication.
            </p>
            <p className="mt-2">
              Payment processing is handled entirely by Stripe. We never store your full credit card number on
              our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Third-Party Services</h2>
            <p>Snowball uses the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Firebase (Google):</strong> authentication and database</li>
              <li><strong>Stripe:</strong> payment processing</li>
              <li><strong>Anthropic:</strong> AI Advisor feature (your chat messages are sent to Anthropic&apos;s API)</li>
              <li><strong>Netlify:</strong> web hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Household Sharing</h2>
            <p>
              If you use the household sharing feature, your financial data (debts, payments, plan) is shared with
              any member you invite. You control who receives an invite code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. AI Advisor</h2>
            <p>
              When you use the AI Advisor, a summary of your debt information and your chat messages are sent to
              Anthropic&apos;s API to generate responses. Please review{" "}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic&apos;s Privacy Policy</a>{" "}
              for their data practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data (contact us to request)</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email us at{" "}
              <a href="mailto:support@snowballapp.com" className="text-blue-600 hover:underline">support@snowballapp.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">8. Cookies</h2>
            <p>
              Snowball uses only functional cookies and local storage necessary for authentication and session
              management. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">9. Children&apos;s Privacy</h2>
            <p>
              Snowball is not directed at children under 13. We do not knowingly collect personal information
              from children. If you believe a child has provided us information, please contact us to have it removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes by email
              or by posting a notice in the app. Continued use of Snowball after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">11. Contact</h2>
            <p>
              Questions about this Privacy Policy? Email us at{" "}
              <a href="mailto:support@snowballapp.com" className="text-blue-600 hover:underline">support@snowballapp.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <Link href="/terms" className="text-sm text-blue-600 hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
