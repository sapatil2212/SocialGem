import { ResetForm } from "@/components/auth/RecoveryForms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default function Page() {
  return <ResetForm />;
}
