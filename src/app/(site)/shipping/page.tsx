import DocPage from "@/components/site/DocPage";
import { SHIPPING } from "@/content/pages";

export const metadata = { title: SHIPPING.title, description: SHIPPING.intro };

export default function Page() {
  return <DocPage doc={SHIPPING} />;
}
