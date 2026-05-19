import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey">
        <div className="container py-12">
          <h1 className="page-title mb-8">Privacy Policy</h1>
          
          <div className="bg-white rounded-xl border p-8 prose prose-lg max-w-4xl">
            <p className="text-sm text-navy/60 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Information We Collect</h2>
            <p>
              De-Omega Labaffairs Nig. Ltd. collects information you provide directly to us, including when you create an account, place an order, or contact us. This may include:
            </p>
            <ul>
              <li>Name and contact information (email, phone number, address)</li>
              <li>Account credentials</li>
              <li>Payment information (processed securely through Flutterwave)</li>
              <li>Order history and preferences</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Provide customer support</li>
              <li>Send you order confirmations and updates</li>
              <li>Improve our products and services</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul>
              <li>Service providers who assist in operating our business (e.g., payment processors)</li>
              <li>Law enforcement when required by law</li>
              <li>Business partners with your consent</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. This includes encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure.
            </p>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2>6. Cookies &amp; Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to improve your experience, analyze usage, and assist in marketing efforts. When you first visit our site, a cookie consent banner allows you to choose which categories of cookies you accept.
            </p>

            <h3>Types of Cookies We Use:</h3>
            <ul>
              <li><strong>Essential Cookies</strong> — Required for the website to function. These include authentication tokens, cart session data, CSRF protection, and cookie consent preferences. Cannot be disabled.</li>
              <li><strong>Analytics Cookies</strong> — Help us understand how visitors interact with our site (pages visited, time spent, bounce rate). This data is anonymized and used solely to improve our services. You can opt out via the cookie banner.</li>
              <li><strong>Marketing Cookies</strong> — Used to deliver relevant advertisements and measure campaign effectiveness. These may be set by third-party advertising partners. You can opt out via the cookie banner.</li>
            </ul>

            <h3>How We Log Cookie Consent:</h3>
            <p>
              When you accept or customize cookie preferences, your choice is recorded with your IP address and timestamp for compliance with Nigeria Data Protection Regulation (NDPR). This consent log is stored securely and is not shared with third parties.
            </p>

            <h3>Managing Cookies:</h3>
            <p>
              You can change your cookie preferences at any time by clearing your browser cookies and revisiting the site. You can also control cookies through your browser settings. Note that disabling essential cookies may affect site functionality.
            </p>

            <h2>7. Contact Us</h2>
            <p>
              For questions about this privacy policy or your personal information, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> info@omegalabaffairs.com<br />
              <strong>Phone:</strong> +2348132862637<br />
              <strong>Address:</strong> Ilorin, Kwara State, Nigeria
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
