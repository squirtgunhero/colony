// HIDDEN: Phase 2 - Route removed from nav; redirects to Browse. Full page still at /browse/properties.
import { redirect } from "next/navigation";

export default function PropertiesRedirect() {
  redirect("/browse/properties");
}
