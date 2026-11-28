import DocPage from "@/components/site/DocPage";
import { TERMS } from "@/content/pages";

export const metadata = { title: TERMS.title, description: TERMS.intro };

export default function Page() {
  return <DocPage doc={TERMS} />;
}
