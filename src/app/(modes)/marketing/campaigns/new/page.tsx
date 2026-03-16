// ============================================
// COLONY - New Campaign
// Redirects to chat for AI-assisted campaign creation
// ============================================

import { redirect } from "next/navigation";

export default function NewCampaignPage() {
  redirect("/chat?prompt=Create+a+new+ad+campaign");
}
