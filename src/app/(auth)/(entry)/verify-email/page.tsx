import { VerifyForm } from "@/components/auth/RecoveryForms";

export const metadata = { title: "Confirm your email", robots: { index: false } };

export default function Page() {
  return <VerifyForm />;
}
