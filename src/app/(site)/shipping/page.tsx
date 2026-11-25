import DocPage from "@/components/site/DocPage";
import { SHIPPING } from "@/content/pages";

export const metadata = { title: SHIPPING.title, description: SHIPPING.intro, robots: { index: false } };

export default function Page() {
  return <DocPage doc={SHIPPING} />;
}
