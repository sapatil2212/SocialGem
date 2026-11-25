import DocPage from "@/components/site/DocPage";
import { DELETION } from "@/content/pages";

export const metadata = { title: DELETION.title, description: DELETION.intro, robots: { index: false } };

export default function Page() {
  return <DocPage doc={DELETION} />;
}
