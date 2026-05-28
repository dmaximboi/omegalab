"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

interface CompanyConfig {
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    whatsapp: string;
  };
}

export function Footer() {
  const [config, setConfig] = useState<CompanyConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const fallback = {
        company: {
          name: "De-Omega Labaffairs Nig. Ltd.",
          email: "info@omegalabaffairs.com",
          phone: "+2348132862637",
          address: "Ilorin, Kwara State, Nigeria",
          whatsapp: "+2348132862637",
        },
      };
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        } else {
          setConfig(fallback);
        }
      } catch {
        setConfig(fallback);
      }
    };
    fetchConfig();
  }, []);

  const formatPhone = (phone: string) => {
    // Format: +234 813 286 2637
    return phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  };

  return (
    <footer className="bg-navy/95 text-white/70 py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
                alt="De-Omega Logo"
                width={48}
                height={48}
                className="rounded-xl"
              />
              <h3 className="text-white font-heading font-bold text-xl">
                {config?.company.name || "De-Omega Labaffairs"}
              </h3>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Nigeria&apos;s trusted partner for laboratory, medical, scientific, and factory equipment solutions. We provide procurement, installation, and maintenance services to institutions across the nation.
            </p>
            {/* WhatsApp Button */}
            {config?.company.whatsapp && (
              <a
                href={`https://wa.me/${config.company.whatsapp.replace(/\+/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/catalogue" className="hover:text-white transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              {config?.company.email && (
                <li className="flex items-start gap-2">
                  <Mail size={16} className="mt-0.5 flex-shrink-0" />
                  <a
                    href={`mailto:${config.company.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {config.company.email}
                  </a>
                </li>
              )}
              {config?.company.phone && (
                <li className="flex items-start gap-2">
                  <Phone size={16} className="mt-0.5 flex-shrink-0" />
                  <a
                    href={`tel:${config.company.phone}`}
                    className="hover:text-white transition-colors"
                  >
                    {formatPhone(config.company.phone)}
                  </a>
                </li>
              )}
              {config?.company.address && (
                <li className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{config.company.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>
            &copy; {new Date().getFullYear()} {config?.company.name || "De-Omega Labaffairs Nig. Ltd."}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
