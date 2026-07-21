import { redirect } from "next/navigation";

// Settings are now part of the combined Account page.
export default function SettingsRedirect() {
  redirect("/account");
}
