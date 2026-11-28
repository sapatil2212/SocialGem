import DocPage from "@/components/site/DocPage";
import { PRIVACY } from "@/content/pages";

export const metadata = { title: PRIVACY.title, description: PRIVACY.intro };

export default function Page() {
  return <DocPage doc={PRIVACY} />;
}
