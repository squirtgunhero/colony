// ============================================
// COLONY - Chat Mode
// Clean, conversation-first interface
// ============================================

import { Suspense } from "react";
import { ChatCanvas } from "@/components/chat/ChatCanvas";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatCanvas />
    </Suspense>
  );
}
