import DocPage from "@/components/site/DocPage";
import { PRIVACY } from "@/content/pages";

export const metadata = { title: PRIVACY.title, description: PRIVACY.intro, robots: { index: false } };

export default function Page() {
  return <DocPage doc={PRIVACY} />;
}
