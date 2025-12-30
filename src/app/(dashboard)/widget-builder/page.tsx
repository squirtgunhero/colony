import { redirect } from "next/navigation";

/**
 * Widget Builder page now redirects to dashboard
 * The AI Command Palette (⌘K) is now available globally from any page
 */
export default function WidgetBuilderPage() {
  redirect("/dashboard");
}
