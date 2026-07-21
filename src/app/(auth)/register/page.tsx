import { redirect } from "next/navigation";

// Public self-registration is disabled: only an administrator can create
// accounts (Admin → Users). Anyone reaching /register is sent to the sign-in
// page.
export default function RegisterPage() {
  redirect("/login");
}
