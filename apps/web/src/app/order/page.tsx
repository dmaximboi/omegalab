"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Loader2 } from "lucide-react";
import { cart, CartItem } from "@/lib/cart";

declare global {
  interface Window {
    FlutterwaveCheckout: (config: any) => void;
  }
}

export default function OrderPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [flwLoaded, setFlwLoaded] = useState(false);
  const isSubmitting = useRef(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Load cart and form data from localStorage on mount
  useEffect(() => {
    const savedItems = cart.getItems();
    setItems(savedItems);
    
    // Load saved form data
    const savedFormData = localStorage.getItem("checkout_form");
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setFormData(parsed);
      } catch {
        // Ignore parse errors
      }
    }
    
    setLoading(false);
  }, []);

  // Save form data to localStorage on change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("checkout_form", JSON.stringify(formData));
    }
  }, [formData, loading]);

  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      const newQuantity = Math.max(1, item.quantity + delta);
      cart.updateQuantity(id, newQuantity);
      setItems(cart.getItems());
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleRemove = (id: string) => {
    cart.removeItem(id);
    setItems(cart.getItems());
    window.dispatchEvent(new Event("storage"));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || checkingOut) return;
    isSubmitting.current = true;
    setCheckingOut(true);
    setError("");

    try {
      // Create order in backend first
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ id, quantity }) => ({ id, quantity })),
          ...formData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to create order");
      }

      const data = await res.json();

      // Launch Flutterwave Inline checkout — use SERVER amount, not client
      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout({
          public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
          tx_ref: data.txRef,
          amount: data.amount, // SERVER-COMPUTED amount — never trust client
          currency: "NGN",
          payment_options: "card,mobilemoney,ussd,banktransfer",
          customer: {
            email: formData.email,
            phone_number: formData.phone,
            name: formData.name,
          },
          customizations: {
            title: "De-Omega Labaffairs",
            description: `Order #${data.orderId.slice(-8).toUpperCase()}`,
            logo: "https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg",
          },
          callback: async (response: any) => {
            // Verify payment on server — only send transaction_id and orderId
            // tx_ref is matched from DB server-side, not from frontend
            try {
              const verifyRes = await fetch("/api/orders/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transaction_id: response.transaction_id,
                  orderId: data.orderId,
                  paymentToken: data.paymentToken,
                }),
              });

              if (verifyRes.ok) {
                cart.clear();
                window.dispatchEvent(new Event("storage"));
                router.push(`/order/success?id=${data.orderId}`);
              } else {
                setError("Payment verification failed. Please contact support.");
              }
            } catch {
              setError("Could not verify payment. Please contact support with your transaction reference.");
            }
          },
          onclose: () => {
            isSubmitting.current = false;
            setCheckingOut(false);
          },
        });
      } else {
        setError("Payment system is loading. Please try again in a moment.");
      }
    } catch (err: any) {
      setError(err.message || "Could not create order. Please try again.");
    } finally {
      isSubmitting.current = false;
      setCheckingOut(false);
    }
  };

  const total = cart.getTotal();

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-light-grey flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.flutterwave.com/v3.js"
        onLoad={() => setFlwLoaded(true)}
      />
      <Navbar />
      <main className="min-h-screen bg-light-grey">
        <div className="container py-8">
          <h1 className="page-title mb-8">Your Order</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-navy/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">Your cart is empty</h3>
              <p className="text-navy/60 mb-6">
                Add products from the catalogue to get started
              </p>
              <Link href="/catalogue" className="btn btn-primary">
                Browse Catalogue
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border p-4 flex gap-4"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-navy mb-1">{item.name}</h3>
                      <p className="text-sky font-semibold mb-2">
                        ₦{item.price.toLocaleString()}
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="p-2 hover:bg-gray-100 transition"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-3 min-w-[40px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="p-2 hover:bg-gray-100 transition"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-navy">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-navy/60">Subtotal</span>
                      <span className="font-medium">
                        ₦{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-navy/60">Delivery</span>
                      <span className="font-medium text-green-600">Calculated at checkout</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold text-sky">
                          ₦{total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input w-full"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input w-full"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input w-full"
                        placeholder="+234 XXX XXX XXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Address *
                      </label>
                      <textarea
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="input w-full resize-none"
                        placeholder="Your delivery address"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={checkingOut}
                      className="w-full flex items-center justify-center gap-2 bg-sky text-white px-6 py-3 rounded-lg hover:bg-sky/90 transition disabled:opacity-50"
                    >
                      {checkingOut ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          Proceed to Checkout
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
