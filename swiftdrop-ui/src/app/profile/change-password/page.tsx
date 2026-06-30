import { redirect } from "next/navigation";

export default function AdminProfileChangePasswordPage() {
  redirect("/change-password?returnTo=/profile");
}
