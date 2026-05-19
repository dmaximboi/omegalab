"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";

// Generate secure random values using Web Crypto API
const secureRandom = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0xFFFFFFFF;
};

export default function LoginPage() {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect if already signed in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("google", {
        callbackUrl: "/",
        redirect: false,
      });

      if (result?.error) {
        setError("Could not sign in. Please try again.");
        setIsLoading(false);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy/95 to-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky animate-spin" />
      </div>
    );
  }

  // Don't render if already authenticated
  if (session) {
    return null;
  }

  // Generate particle positions once using crypto
  const particles = useMemo(() => {
    return [...Array(15)].map(() => ({
      left: secureRandom() * 100,
      top: secureRandom() * 100,
      duration: 4 + secureRandom() * 2,
      delay: secureRandom() * 2,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy/95 to-navy flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background - Science particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-sky/20 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Book Container */}
        <div
          className="relative"
          onClick={() => !isBookOpen && setIsBookOpen(true)}
        >
          {/* Book Cover (Closed State) */}
          <AnimatePresence>
            {!isBookOpen && (
              <motion.div
                initial={{ rotateY: 0 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-gradient-to-br from-sky to-sky/80 rounded-2xl p-8 shadow-2xl cursor-pointer hover:shadow-sky/20 transition-shadow"
                style={{ transformOrigin: "left center" }}
              >
                <div className="text-center text-white">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="inline-block mb-6"
                  >
                    <Image
                      src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
                      alt="De-Omega Logo"
                      width={80}
                      height={80}
                      className="rounded-2xl shadow-lg"
                    />
                  </motion.div>
                  <h1 className="text-2xl font-heading font-bold mb-2">
                    De-Omega Labaffairs
                  </h1>
                  <p className="text-white/80 text-sm mb-8">
                    Click to open and sign in
                  </p>
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="mx-auto" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Book Pages (Open State) */}
          <AnimatePresence>
            {isBookOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-navy to-navy/90 p-8 text-white text-center relative">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-4 right-4 w-16 h-16 border border-white/10 rounded-full"
                  />
                  <Image
                    src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
                    alt="De-Omega Logo"
                    width={64}
                    height={64}
                    className="rounded-xl mx-auto mb-4"
                  />
                  <h1 className="text-2xl font-heading font-bold">Welcome</h1>
                  <p className="text-white/70 text-sm mt-1">Sign in to continue</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <p className="text-navy/60 text-sm">
                      Sign in with your Google account to access the catalogue, place orders, and track your purchases.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center">
                      {error}
                    </div>
                  )}

                  {/* Google Sign In Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-border rounded-xl font-medium text-navy hover:bg-light-grey hover:border-navy/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
                  </button>

                  <p className="text-center text-xs text-navy/50">
                    By signing in, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-navy">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-navy">
                      Privacy Policy
                    </Link>
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBookOpen(false);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
