"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Send, MapPin, Phone, Mail, CheckCircle, Loader2, Facebook } from "lucide-react";

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      const res = await fetch("/api/config/contact");
      if (res.ok) {
        const data = await res.json();
        setContactInfo(data);
      } else {
        // API returned non-OK — use fallback
        setContactInfo({
          address: "Ilorin, Kwara State, Nigeria",
          phone: "+2348132862637",
          email: "info@omegalabaffairs.com",
          whatsapp: "+2348132862637",
        });
      }
    } catch {
      // Use fallback values
      setContactInfo({
        address: "Ilorin, Kwara State, Nigeria",
        phone: "+2348132862637",
        email: "info@omegalabaffairs.com",
        whatsapp: "+2348132862637",
      });
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          subject: formData.get("subject"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setIsSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey dark:bg-gray-900">
        {/* Header */}
        <section className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700">
          <div className="container py-12">
            <h1 className="page-title mb-2">Contact Us</h1>
            <p className="text-navy/60 dark:text-gray-400">
              Get in touch with our team for inquiries and support
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="space-y-6">
                {loadingInfo ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-sky" size={24} />
                  </div>
                ) : (
                  <>
                    <div className="card">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-sky/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="text-sky" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Address</h3>
                          <p className="text-sm text-navy/60 dark:text-gray-400">
                            {contactInfo?.address || "Loading..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-sky/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Phone className="text-sky" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Phone</h3>
                          <p className="text-sm text-navy/60 dark:text-gray-400">
                            {contactInfo?.phone || "Loading..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-sky/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Mail className="text-sky" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Email</h3>
                          <p className="text-sm text-navy/60 dark:text-gray-400">
                            {contactInfo?.email || "Loading..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-sky/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Facebook className="text-sky" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Facebook</h3>
                          <a
                            href="https://web.facebook.com/people/De-omega-Labaffairs-Ltd/100066186596625/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-sky hover:underline"
                          >
                            De-omega Labaffairs Ltd
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="card">
                  {isSuccess ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-navy/60 dark:text-gray-400 mb-6">
                        Thank you for contacting us. We&apos;ll get back to you soon.
                      </p>
                      <button
                        onClick={() => setIsSuccess(false)}
                        className="btn btn-outline"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="name" className="label">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            className="input"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="label">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className="input"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="phone" className="label">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className="input"
                            placeholder="+234 XXX XXX XXXX"
                          />
                        </div>
                        <div>
                          <label htmlFor="subject" className="label">
                            Subject *
                          </label>
                          <input
                            type="text"
                            id="subject"
                            name="subject"
                            required
                            className="input"
                            placeholder="Product Inquiry"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="label">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          className="input resize-none"
                          placeholder="How can we help you?"
                        />
                      </div>

                      {/* Honeypot */}
                      <input
                        type="text"
                        name="website"
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full sm:w-auto"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="loading-spinner" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
