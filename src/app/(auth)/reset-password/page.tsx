"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check if we have a valid session (from the reset link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session means the reset link wasn't used properly
        setError("Invalid or expired reset link. Please request a new one.");
      }
      setChecking(false);
    };
    checkSession();
  }, [supabase.auth]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-[#1a1614] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#f5ebe0] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1614]">
      {/* Animated Mosaic Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1614 0%, #2d2420 50%, #1a1614 100%)",
          }}
        />
        
        {/* Floating orbs */}
        <div 
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(194,110,75,0.5) 0%, rgba(194,110,75,0.2) 40%, transparent 70%)",
            top: "-15%",
            left: "-5%",
            animation: "float1 18s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(120,150,130,0.5) 0%, rgba(120,150,130,0.2) 40%, transparent 70%)",
            top: "50%",
            right: "-10%",
            animation: "float2 22s ease-in-out infinite",
            filter: "blur(50px)",
          }}
        />
        <div 
          className="absolute w-[550px] h-[550px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(210,175,140,0.6) 0%, rgba(210,175,140,0.2) 40%, transparent 70%)",
            bottom: "-5%",
            left: "15%",
            animation: "float3 15s ease-in-out infinite",
            filter: "blur(45px)",
          }}
        />

        {/* Subtle mesh overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Subtle vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 0%, rgba(26,22,20,0.2) 80%, rgba(26,22,20,0.5) 100%)",
          }}
        />
      </div>

      {/* Centered Glass Panel */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-[380px]"
          style={{
            opacity: 0,
            animation: "fadeInUp 0.7s ease-out 0.1s forwards",
          }}
        >
          {/* Liquid Glass Card */}
          <div
            className="
              relative rounded-2xl p-8
              backdrop-blur-2xl
              border border-[rgba(210,180,150,0.2)]
              shadow-[inset_0_1px_1px_rgba(240,220,200,0.1),0_24px_80px_rgba(0,0,0,0.4)]
            "
            style={{
              background: "linear-gradient(145deg, rgba(255,250,245,0.12) 0%, rgba(230,210,190,0.06) 100%)",
            }}
          >
            {/* Inner edge highlight */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "linear-gradient(145deg, rgba(255,250,245,0.2) 0%, transparent 40%)",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "xor",
                WebkitMaskComposite: "xor",
                padding: "1px",
              }}
            />

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative h-12 w-12 mb-4">
                <Image
                  src="/colony-icon.svg"
                  alt="Colony"
                  fill
                  className="object-contain brightness-0 invert opacity-90"
                  priority
                />
              </div>
              <h1 
                className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[rgba(240,225,210,0.6)]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Colony
              </h1>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h2 
                className="text-[24px] leading-[32px] font-semibold tracking-[-0.015em] text-[#faf5ef]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Set new password
              </h2>
              <p className="mt-2 text-[14px] text-[rgba(240,225,210,0.6)]">
                Choose a strong password for your account
              </p>
            </div>

            {success ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-300 text-[14px]">
                    Password updated successfully! Redirecting to dashboard...
                  </p>
                </div>
              </div>
            ) : error && !password ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-300 text-[14px]">{error}</p>
                </div>
                <a 
                  href="/forgot-password"
                  className="inline-block text-[14px] text-[rgba(240,225,210,0.7)] hover:text-[#faf5ef] transition-colors"
                >
                  Request new reset link →
                </a>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px]">
                    {error}
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-2">
                  <label 
                    htmlFor="password" 
                    className="block text-[12px] font-medium text-[rgba(240,225,210,0.6)] tracking-wide"
                  >
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      w-full h-12 px-4 rounded-xl
                      bg-[rgba(255,250,245,0.06)] border border-[rgba(210,180,150,0.12)]
                      text-white text-[14px] placeholder:text-[rgba(255,245,235,0.35)]
                      outline-none
                      transition-all duration-200 ease-out
                      focus:bg-[rgba(255,250,245,0.1)] focus:border-[rgba(220,190,160,0.25)]
                      focus:shadow-[0_0_0_3px_rgba(210,180,150,0.08)]
                    "
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label 
                    htmlFor="confirmPassword" 
                    className="block text-[12px] font-medium text-[rgba(240,225,210,0.6)] tracking-wide"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="
                      w-full h-12 px-4 rounded-xl
                      bg-[rgba(255,250,245,0.06)] border border-[rgba(210,180,150,0.12)]
                      text-white text-[14px] placeholder:text-[rgba(255,245,235,0.35)]
                      outline-none
                      transition-all duration-200 ease-out
                      focus:bg-[rgba(255,250,245,0.1)] focus:border-[rgba(220,190,160,0.25)]
                      focus:shadow-[0_0_0_3px_rgba(210,180,150,0.08)]
                    "
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full h-12 mt-2
                    bg-[#f5ebe0] text-[#3d3025]
                    font-semibold text-[14px] tracking-[-0.01em]
                    rounded-xl
                    transition-all duration-200 ease-out
                    hover:bg-[#efe4d8] hover:shadow-[0_8px_24px_rgba(220,195,170,0.2)]
                    active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                  "
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle 
                          className="opacity-25" 
                          cx="12" cy="12" r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                          fill="none"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

