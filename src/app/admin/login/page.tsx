import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/AdminLogin";
import { currentAdmin } from "@/server/admin";

export const metadata = { title: "Admin log in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (await currentAdmin()) redirect("/admin");
  return <div className="brand"><AdminLogin /></div>;
}
