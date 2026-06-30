import { redirect } from "next/navigation";

export default function MerchantProfileChangePasswordPage() {
  redirect("/change-password?returnTo=/merchant/profile");
}
