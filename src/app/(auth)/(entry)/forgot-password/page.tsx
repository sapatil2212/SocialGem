import { ForgotForm } from "@/components/auth/RecoveryForms";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return <ForgotForm />;
}
