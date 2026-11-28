import DocPage from "@/components/site/DocPage";
import { COOKIES } from "@/content/pages";

export const metadata = { title: COOKIES.title, description: COOKIES.intro };

export default function Page() {
  return <DocPage doc={COOKIES} />;
}
