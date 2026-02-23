"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { LogOut, Settings } from "lucide-react";

interface UserMenuProps {
  size?: "sm" | "md";
}

export function UserMenu({ size = "md" }: UserMenuProps) {
  const { theme } = useColonyTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) setOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  if (loading) {
    return (
      <div
        className={`rounded-full animate-pulse ${size === "sm" ? "h-7 w-7" : "h-8 w-8"}`}
        style={{ backgroundColor: withAlpha(theme.text, 0.15) }}
      />
    );
  }

  if (!user) return null;

  const initials =
    user.email
      ?.split("@")[0]
      .slice(0, 2)
      .toUpperCase() || "U";

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;

  return (
    <div className="relative" data-user-menu>
      <button
        className="outline-none rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
        onClick={() => setOpen(!open)}
      >
        <div
          className={`flex items-center justify-center rounded-full font-medium text-xs ${
            size === "sm" ? "h-7 w-7" : "h-8 w-8"
          }`}
          style={{
            background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.25)}, ${withAlpha(theme.accent, 0.1)})`,
            color: theme.accent,
            border: `1.5px solid ${withAlpha(theme.accent, 0.3)}`,
          }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl py-1 z-50"
          style={{
            backgroundColor: theme.bgGlow,
            boxShadow: neumorphicRaised,
            border: `1px solid ${withAlpha(theme.text, 0.06)}`,
          }}
        >
          {/* Account label */}
          <div className="px-3 py-2">
            <p className="text-sm font-medium" style={{ color: theme.text }}>
              Account
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: theme.textMuted }}>
              {user.email}
            </p>
          </div>

          <div style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }} className="my-1" />

          {/* Settings */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: theme.textSoft }}
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = withAlpha(theme.accent, 0.1);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Settings className="h-4 w-4" style={{ color: theme.accent }} />
            Settings
          </button>

          <div style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }} className="my-1" />

          {/* Sign out */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: "#C87A5A" }}
            onClick={() => {
              setOpen(false);
              handleSignOut();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(200,122,90,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
