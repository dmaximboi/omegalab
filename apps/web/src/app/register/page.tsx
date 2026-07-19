"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Mail, Lock, User, Phone, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "Why create an account with De-Omega?",
    answer: "Creating an account gives you access to exclusive pricing, order tracking, faster checkout, and personalized recommendations for laboratory equipment.",
  },
  {
    question: "What are the benefits?",
    answer: "Track orders in real-time, save favorite products, receive notifications on new arrivals and promotions, and get priority customer support.",
  },
];

const TERMS = [
  "I agree to the Terms of Service and Privacy Policy",
  "I understand that my data will be processed securely",
  "I consent to receive order updates via email",
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean[]>([false, false, false]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const allTermsAccepted = acceptedTerms.every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!allTermsAccepted) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const toggleTerm = (index: number) => {
    const newTerms = [...acceptedTerms];
    newTerms[index] = !newTerms[index];
    setAcceptedTerms(newTerms);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy/95 to-navy flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy to-navy/90 p-6 text-white text-center">
            <Beaker className="mx-auto mb-3" size={40} />
            <h1 className="text-xl font-heading font-bold">Create Account</h1>
            <p className="text-white/70 text-sm">Join De-Omega Labaffairs</p>
            
            {/* Progress Steps */}
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    s <= step ? "bg-sky" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Why Create Account */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-navy dark:text-white mb-4">
                    Why Create an Account?
                  </h2>
                  
                  {FAQ_ITEMS.map((item, i) => (
                    <div key={i} className="bg-light-grey dark:bg-gray-900 rounded-xl p-4">
                      <h3 className="font-medium text-navy dark:text-white mb-2">{item.question}</h3>
                      <p className="text-sm text-navy/60 dark:text-gray-400">{item.answer}</p>
                    </div>
                  ))}

                  <button type="submit" className="btn btn-primary w-full mt-6">
                    Continue
                    <ChevronRight size={18} />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Account Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-navy dark:text-white mb-4">
                    Your Details
                  </h2>

                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
                      <input
                        type="text"
                        required
                        className="input pl-10"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
                      <input
                        type="email"
                        required
                        className="input pl-10"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Phone Number (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
                      <input
                        type="tel"
                        className="input pl-10"
                        placeholder="+234 XXX XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        className="input pl-10 pr-10"
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn btn-outline"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Continue
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Terms & Conditions */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-navy dark:text-white mb-4">
                    Terms & Conditions
                  </h2>

                  <div className="bg-light-grey dark:bg-gray-900 rounded-xl p-4 max-h-40 overflow-y-auto text-sm text-navy/70 dark:text-gray-400">
                    <p className="mb-2">
                      By creating an account, you agree to our Terms of Service and Privacy Policy. 
                      Your data will be processed securely and in accordance with applicable data protection laws.
                    </p>
                    <p>
                      We are committed to protecting your privacy and ensuring the security of your personal information.
                      You can manage your preferences at any time from your account settings.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {TERMS.map((term, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 cursor-pointer group"
                        onClick={() => toggleTerm(i)}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            acceptedTerms[i]
                              ? "bg-sky border-sky"
                              : "border-border group-hover:border-sky/50"
                          }`}
                        >
                          {acceptedTerms[i] && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-sm text-navy/70 dark:text-gray-400">{term}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="btn btn-outline"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!allTermsAccepted || isLoading}
                      className="btn btn-primary flex-1"
                    >
                      {isLoading ? (
                        <>
                          <span className="loading-spinner" />
                          Creating...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-sm text-navy/60 dark:text-gray-400 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="link font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>

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
