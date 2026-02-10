// HIDDEN: Phase 2 - Route removed from nav; redirects to Browse. Full page still at /browse/contacts.
import { redirect } from "next/navigation";

export default function ContactsRedirect() {
  redirect("/browse/contacts");
}
