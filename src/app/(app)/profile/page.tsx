import { redirect } from "next/navigation";

// Profile is now part of the combined Account page.
export default function ProfileRedirect() {
  redirect("/account");
}
