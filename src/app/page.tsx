import { redirect } from "next/navigation";

export default function Home() {
  // Default to Chat Mode - the new primary interface
  redirect("/chat");
}
