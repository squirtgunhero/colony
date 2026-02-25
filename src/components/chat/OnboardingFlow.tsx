"use client";

import { useState, useRef, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { createContact } from "@/app/(dashboard)/contacts/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, SkipForward } from "lucide-react";

type Step = "greeting" | "business_type" | "phone_setup" | "phone_verify" | "first_contact" | "complete";

interface OnboardingFlowProps {
  firstName: string | null;
  onComplete: () => void;
}

interface Message {
  id: string;
  role: "colony" | "user";
  text: string;
}

export function OnboardingFlow({ firstName, onComplete }: OnboardingFlowProps) {
  const { theme } = useColonyTheme();
  const [step, setStep] = useState<Step>("greeting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const addColonyMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `colony-${Date.now()}`, role: "colony", text },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text },
    ]);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const name = firstName || "there";
    addColonyMessage(
      `Hey ${name}. I'm Colony — I run your business while you do the actual work. Let's get set up.\n\nWhat kind of business do you run?`
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBusinessType = async () => {
    if (!input.trim()) return;
    const biz = input.trim();
    setBusinessType(biz);
    addUserMessage(biz);
    setInput("");

    try {
      await fetch("/api/onboarding/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: biz }),
      });
    } catch { /* non-critical */ }

    setTimeout(() => {
      addColonyMessage(
        `Got it — ${biz}. I'll customize things for you.\n\nFirst, let's add your phone number so I can text you updates. What's your number?`
      );
      setStep("phone_setup");
    }, 600);
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) return;
    setIsLoading(true);
    setPhoneError("");

    addUserMessage(phoneNumber.trim());

    try {
      const res = await fetch("/api/onboarding/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPhoneError(data.error || "Failed to send code");
        setIsLoading(false);
        return;
      }

      addColonyMessage("I just sent you a 6-digit code. Enter it below to verify.");
      setStep("phone_verify");
    } catch {
      setPhoneError("Failed to send code. Try again.");
    }
    setIsLoading(false);
  };

  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) return;
    setIsLoading(true);
    setPhoneError("");

    try {
      const res = await fetch("/api/onboarding/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          code: verifyCode.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPhoneError(data.error || "Invalid code");
        setIsLoading(false);
        return;
      }

      addColonyMessage(
        "Phone verified! Now, want to add your first contact? Just type their name."
      );
      setStep("first_contact");
    } catch {
      setPhoneError("Verification failed. Try again.");
    }
    setIsLoading(false);
  };

  const handleSkipPhone = () => {
    addColonyMessage(
      "No problem — you can add your phone number in Settings anytime.\n\nWant to add your first contact? Just type their name."
    );
    setStep("first_contact");
  };

  const handleAddContact = async () => {
    if (!input.trim()) return;
    const name = input.trim();
    addUserMessage(name);
    setInput("");
    setIsLoading(true);

    try {
      await createContact({ name, type: "lead" });
      addColonyMessage(
        `${name} is in. I'll keep track of them for you.`
      );
    } catch {
      addColonyMessage("I had trouble adding that contact, but don't worry — you can add them later.");
    }

    setIsLoading(false);
    finishOnboarding();
  };

  const handleSkipContact = () => {
    finishOnboarding();
  };

  const colonyNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "(808) 353-5706";

  const finishOnboarding = () => {
    setTimeout(() => {
      addColonyMessage(
        `All set. I'll check in with you every evening at 6pm with a summary of your day. You can text me anytime at ${colonyNumber}.\n\nGo do your thing — I've got this.`
      );
      setStep("complete");

      fetch("/api/onboarding/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      }).catch(() => {});

      setTimeout(onComplete, 3000);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step === "greeting") handleBusinessType();
      else if (step === "first_contact") handleAddContact();
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4">
      {/* Messages */}
      <div className="flex-1 flex flex-col justify-end space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              msg.role === "colony" ? "self-start" : "self-end"
            }`}
          >
            {msg.role === "colony" ? (
              <p
                className="text-[15px] leading-relaxed whitespace-pre-line"
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  color: theme.text,
                }}
              >
                {msg.text}
              </p>
            ) : (
              <div
                className="px-4 py-2.5 rounded-2xl rounded-br-md text-[15px]"
                style={{
                  backgroundColor: theme.userBubble || withAlpha(theme.accent, 0.15),
                  color: theme.text,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="pb-6 space-y-2">
        {step === "greeting" && (
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Real estate, Barbershop, Contracting..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1"
            />
            <Button
              onClick={handleBusinessType}
              disabled={!input.trim()}
              size="icon"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "phone_setup" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCode();
                }}
                type="tel"
                name="phone"
                autoComplete="tel"
                autoFocus
                className="flex-1"
              />
              <Button
                onClick={handleSendCode}
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? "Sending..." : "Send Code"}
              </Button>
            </div>
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            <button
              onClick={handleSkipPhone}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: theme.textMuted }}
            >
              <SkipForward className="h-3 w-3" />
              I'll do this later
            </button>
          </div>
        )}

        {step === "phone_verify" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyCode();
                }}
                maxLength={6}
                name="otp"
                autoComplete="one-time-code"
                autoFocus
                className="flex-1"
              />
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || verifyCode.length < 6}
              >
                {isLoading ? "Verifying..." : <Check className="h-4 w-4" />}
              </Button>
            </div>
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            <button
              onClick={handleSkipPhone}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: theme.textMuted }}
            >
              <SkipForward className="h-3 w-3" />
              Skip for now
            </button>
          </div>
        )}

        {step === "first_contact" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Contact name..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1"
              />
              <Button
                onClick={handleAddContact}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <button
              onClick={handleSkipContact}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: theme.textMuted }}
            >
              <SkipForward className="h-3 w-3" />
              Skip for now
            </button>
          </div>
        )}

        {step === "complete" && (
          <div
            className="text-center text-sm py-2"
            style={{ color: theme.textMuted }}
          >
            Loading your workspace...
          </div>
        )}
      </div>
    </div>
  );
}
