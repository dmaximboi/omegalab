import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

// Dynamic import with SSR disabled to prevent hydration mismatch
const CookieConsent = dynamic(
  () => import("@/components/CookieConsent").then((mod) => mod.CookieConsent),
  { ssr: false }
);

// Optimize font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "De-Omega Labaffairs Nig. Ltd. | Laboratory & Medical Equipment Nigeria",
    template: "%s | De-Omega Labaffairs - Lab Equipment Nigeria",
  },
  description: "Nigeria's leading supplier of laboratory equipment, medical instruments, scientific apparatus, and factory machinery. Professional procurement, installation, maintenance & training services. Serving universities, hospitals & industries across Nigeria.",
  keywords: [
    "laboratory equipment Nigeria",
    "medical equipment supplier Nigeria",
    "scientific instruments Nigeria",
    "chemical lab equipment",
    "lab equipment Ilorin",
    "lab equipment Kwara State",
    "laboratory construction Nigeria",
    "equipment installation Nigeria",
    "lab maintenance services",
    "De-Omega Labaffairs",
    "factory equipment Nigeria",
    "lab supplies",
    "medical instruments",
    "research equipment Nigeria",
    "pharmaceutical equipment",
    "quality control instruments",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "De-Omega",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "De-Omega Labaffairs",
    title: "De-Omega Labaffairs Nig. Ltd. | Lab & Medical Equipment Nigeria",
    description: "Nigeria's leading supplier of laboratory, medical, and scientific equipment. Procurement, installation, maintenance & training for universities, hospitals, and industries.",
    images: ["/logo.png"],
    url: "https://omegalabaffairs.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "De-Omega Labaffairs | Lab Equipment Nigeria",
    description: "Nigeria's leading supplier of laboratory, medical, and scientific equipment. Serving universities, hospitals & industries.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://omegalabaffairs.com",
  },
  verification: {
    // Add your Google Search Console verification code here after registering
    // Example: google: "abc123xyz",
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1F5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-white dark:bg-gray-900 antialiased font-sans`}>
        <ThemeProvider>
          <Providers>
            {children}
            <CookieConsent />
          </Providers>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('[SW] Registered:', reg.scope))
                    .catch((err) => console.log('[SW] Registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
