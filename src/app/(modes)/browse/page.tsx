// ============================================
// COLONY - Browse Mode Index
// Redirects to contacts by default
// ============================================

import { redirect } from "next/navigation";

export default function BrowsePage() {
  redirect("/browse/contacts");
}
