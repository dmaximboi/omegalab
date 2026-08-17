import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey dark:bg-gray-900">
        <div className="container py-12">
          <h1 className="page-title mb-8">Terms of Service</h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 prose prose-lg dark:prose-invert max-w-4xl">
            <p className="text-sm text-navy/60 dark:text-gray-400 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the De-Omega Labaffairs Nig. Ltd. website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h2>2. Products and Services</h2>
            <p>
              We offer laboratory, medical, scientific, and factory equipment procurement, installation, maintenance, and training services. All products are subject to availability and specifications may change without notice.
            </p>

            <h2>3. Orders and Payment</h2>
            <p>
              All orders are subject to acceptance. Prices are quoted in Nigerian Naira (₦) and are exclusive of taxes unless stated otherwise. Payment is processed securely through Bachs. Orders are not considered confirmed until payment is received.
            </p>

            <h2>4. Delivery</h2>
            <p>
              Delivery times are estimates and may vary based on product availability and location. We are not liable for delays caused by circumstances beyond our control. Risk of loss transfers to the buyer upon delivery.
            </p>

            <h2>5. Returns and Refunds</h2>
            <p>
              Returns are accepted within 7 days of delivery for defective or damaged items. Custom orders and special-ordered items are non-returnable. Refunds will be processed to the original payment method within 14 business days.
            </p>

            <h2>6. Warranty</h2>
            <p>
              Manufacturer warranties apply to all products. We provide installation warranty for our services. Extended warranty options are available for certain products.
            </p>

            <h2>7. Intellectual Property</h2>
            <p>
              All content on this website, including text, images, logos, and designs, is the property of De-Omega Labaffairs Nig. Ltd. and protected by copyright laws. Unauthorized use is prohibited.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our products or services.
            </p>

            <h2>9. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use. We reserve the right to suspend or terminate accounts for violations of these terms.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Nigeria.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
            </p>

            <h2>12. Contact Information</h2>
            <p>
              For questions about these terms, please contact us:
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
