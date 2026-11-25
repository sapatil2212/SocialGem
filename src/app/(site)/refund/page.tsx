import DocPage from "@/components/site/DocPage";
import { REFUND } from "@/content/pages";

export const metadata = { title: REFUND.title, description: REFUND.intro, robots: { index: false } };

export default function Page() {
  return <DocPage doc={REFUND} />;
}
