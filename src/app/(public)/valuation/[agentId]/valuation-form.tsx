"use client";

import { useState } from "react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

interface ValuationFormProps {
  agentId: string;
  agentName: string;
  businessType: string;
  serviceArea: string;
  avatarUrl: string | null;
}

export function ValuationForm({
  agentId,
  agentName,
  businessType,
  serviceArea,
  avatarUrl,
}: ValuationFormProps) {
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/valuation?agent=${encodeURIComponent(agentId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[#f5f0e8] placeholder-white/30 outline-none transition focus:border-[#cf9b46] focus:ring-1 focus:ring-[#cf9b46]";
  const labelClasses = "block text-sm font-medium text-[#f5f0e8]/70 mb-1.5";

  const firstName = agentName.split(" ")[0];

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#cf9b46]/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#cf9b46]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#f5f0e8]">
            Your Valuation Request Has Been Received
          </h1>
          <p className="text-[#f5f0e8]/60 text-lg leading-relaxed">
            Thank you, {form.name.split(" ")[0]}! {firstName} will review your
            property details and reach out within 24 hours with a personalized home
            valuation.
          </p>
          <div className="pt-4">
            <span className="inline-block rounded-full bg-[#cf9b46]/10 px-5 py-2 text-sm text-[#cf9b46]">
              Check your inbox for a confirmation email
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#cf9b46]/5 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Agent badge */}
            <div className="flex items-center justify-center gap-3 mb-2">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={agentName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#cf9b46]/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#cf9b46]/20 flex items-center justify-center text-[#cf9b46] font-bold text-sm">
                  {agentName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-[#f5f0e8] font-medium text-sm">{agentName}</p>
                <p className="text-[#f5f0e8]/40 text-xs">
                  {businessType}{serviceArea ? ` \u00B7 ${serviceArea}` : ""}
                </p>
              </div>
            </div>

            <p className="text-[#cf9b46] font-semibold tracking-wide uppercase text-sm">
              Free Home Valuation
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#f5f0e8] leading-tight">
              Find Out What Your Home Is{" "}
              <span className="text-[#cf9b46]">Really Worth</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#f5f0e8]/60 leading-relaxed max-w-2xl mx-auto">
              Get a complimentary, no-obligation market analysis from {firstName}.
              {serviceArea
                ? ` Serving ${serviceArea} and surrounding areas.`
                : " Accurate valuations powered by current market data and neighborhood trends."}
            </p>
          </div>
        </div>
      </section>

      {/* Value Props + Form */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          {/* Left: value props */}
          <div className="lg:col-span-2 space-y-8 lg:pt-4">
            <div className="space-y-6">
              {[
                {
                  title: "Accurate Market Data",
                  desc: "Your valuation is based on recent comparable sales, current listings, and real-time market conditions in your neighborhood.",
                },
                {
                  title: "Expert Local Knowledge",
                  desc: `${firstName} knows your community and will factor in upgrades, lot characteristics, and micro-market trends that algorithms miss.`,
                },
                {
                  title: "No Obligation",
                  desc: "This is a free service with zero pressure. Whether you are thinking of selling now or just curious, we are happy to help.",
                },
                {
                  title: "Fast Turnaround",
                  desc: "Receive your personalized valuation report within 24 hours, complete with comparable sales and market insights.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-[#cf9b46]/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#cf9b46]" />
                  </div>
                  <div>
                    <h3 className="text-[#f5f0e8] font-semibold mb-1">{item.title}</h3>
                    <p className="text-[#f5f0e8]/50 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-5"
            >
              <div>
                <h2 className="text-2xl font-bold text-[#f5f0e8]">
                  Request Your Free Valuation
                </h2>
                <p className="text-[#f5f0e8]/50 text-sm mt-1">
                  Fill out the form below and {firstName} will be in touch.
                </p>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className={labelClasses}>
                  Street Address
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  placeholder="123 Main Street"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className={inputClasses}
                />
              </div>

              {/* City / State / Zip */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label htmlFor="city" className={labelClasses}>
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClasses}>
                    State
                  </label>
                  <select
                    id="state"
                    required
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className={`${inputClasses} ${!form.state ? "text-white/30" : ""}`}
                  >
                    <option value="" disabled>
                      State
                    </option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="zip" className={labelClasses}>
                    Zip Code
                  </label>
                  <input
                    id="zip"
                    type="text"
                    required
                    placeholder="00000"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    value={form.zip}
                    onChange={(e) => update("zip", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Name */}
              <div>
                <label htmlFor="name" className={labelClasses}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClasses}
                />
              </div>

              {/* Email / Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#cf9b46] px-6 py-3.5 text-base font-semibold text-[#0d0d0d] transition hover:bg-[#b8893e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Get My Free Valuation"}
              </button>

              <p className="text-[#f5f0e8]/30 text-xs text-center">
                Your information is kept confidential and will never be shared with third
                parties.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
