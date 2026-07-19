"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "omega_cookie_consent";
const COOKIE_CONSENT_VERSION = "1"; // Bump to re-ask consent after policy changes

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true, // Always true — required for site to work
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: "",
  });

  useEffect(() => {
    // Check if consent already given for current version
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        const parsed: ConsentState = JSON.parse(stored);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          // Consent already given for this version — apply it silently
          applyConsent(parsed);
          return;
        }
      }
    } catch {
      // Invalid stored consent, show banner
    }

    // Show banner after a short delay for better UX
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const applyConsent = (state: ConsentState) => {
    // Log consent to server for compliance records
    fetch("/api/analytics/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        essential: state.essential,
        analytics: state.analytics,
        marketing: state.marketing,
        version: state.version,
      }),
    }).catch(() => {
      // Non-blocking — don't fail if logging fails
    });
  };

  const saveConsent = (state: ConsentState) => {
    const finalState = { ...state, timestamp: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(finalState));
    applyConsent(finalState);
    setVisible(false);
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: "",
    });
  };

  const acceptEssentialOnly = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      version: COOKIE_CONSENT_VERSION,
      timestamp: "",
    });
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-border dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="text-sky" size={22} />
            <h3 className="font-bold text-navy dark:text-white text-sm">Cookie Settings</h3>
          </div>
          <button
            onClick={acceptEssentialOnly}
            className="text-navy/40 dark:text-gray-400 hover:text-navy dark:hover:text-white transition p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-navy/60 dark:text-gray-400 leading-relaxed mb-4">
          We use cookies to improve your experience, analyze site usage, and assist in our
          marketing efforts. Essential cookies are required for the site to function. You can
          manage your preferences below. See our{" "}
          <Link href="/privacy" className="text-sky underline">
            Privacy Policy
          </Link>{" "}
          for full details.
        </p>

        {/* Cookie Details Toggle */}
        {showDetails && (
          <div className="space-y-3 mb-4 border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
            {/* Essential */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-navy dark:text-white">Essential Cookies</p>
                <p className="text-[10px] text-navy/50 dark:text-gray-400">
                  Required for cart, authentication, and security. Cannot be disabled.
                </p>
              </div>
              <div className="w-10 h-5 bg-sky rounded-full flex items-center justify-end px-0.5">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-navy dark:text-white">Analytics Cookies</p>
                <p className="text-[10px] text-navy/50 dark:text-gray-400">
                  Help us understand how visitors use the site (page views, bounce rate).
                </p>
              </div>
              <button
                onClick={() => setConsent((c) => ({ ...c, analytics: !c.analytics }))}
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition ${
                  consent.analytics ? "bg-sky justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full" />
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-navy dark:text-white">Marketing Cookies</p>
                <p className="text-[10px] text-navy/50 dark:text-gray-400">
                  Used to deliver relevant advertisements and track campaign effectiveness.
                </p>
              </div>
              <button
                onClick={() => setConsent((c) => ({ ...c, marketing: !c.marketing }))}
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition ${
                  consent.marketing ? "bg-sky justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-sky text-white text-xs font-medium rounded-lg hover:bg-sky/90 transition"
          >
            Accept All
          </button>
          <button
            onClick={acceptEssentialOnly}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-navy dark:text-white text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Essential Only
          </button>
          {showDetails ? (
            <button
              onClick={saveCustom}
              className="px-4 py-2 border border-sky text-sky text-xs font-medium rounded-lg hover:bg-sky/5 transition"
            >
              Save Preferences
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="px-4 py-2 text-navy/50 dark:text-gray-400 text-xs font-medium hover:text-navy dark:hover:text-white transition"
            >
              Customize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
