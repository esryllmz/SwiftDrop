import { redirect } from "next/navigation";

export default function CourierProfileChangePasswordPage() {
  redirect("/change-password?returnTo=/courier/profile");
}
