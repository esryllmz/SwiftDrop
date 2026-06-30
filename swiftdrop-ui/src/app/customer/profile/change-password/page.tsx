import { redirect } from "next/navigation";

export default function CustomerProfileChangePasswordPage() {
  redirect("/change-password?returnTo=/customer/profile");
}
