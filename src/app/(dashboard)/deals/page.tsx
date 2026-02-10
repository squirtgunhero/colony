// HIDDEN: Phase 2 - Route removed from nav; redirects to Browse. Full page still at /browse/deals.
import { redirect } from "next/navigation";

export default function DealsRedirect() {
  redirect("/browse/deals");
}
