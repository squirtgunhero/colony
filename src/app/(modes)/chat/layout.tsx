// ============================================
// COLONY - Chat Mode Layout
// Minimal chrome, conversation-focused
// ============================================

import { ChatLayout } from "@/components/layout/ChatLayout";

export default function ChatModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatLayout>{children}</ChatLayout>;
}
