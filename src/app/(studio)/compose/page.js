import ComposePage from "@/components/composer/ComposePage";

export const metadata = { title: "Create post" };

export default async function Page({ searchParams }) {
  const { ai, date } = await searchParams;
  // Only a real date is passed on; anything else starts with the usual default time.
  const start = typeof date === "string" && !Number.isNaN(Date.parse(date)) ? date : null;
  return <ComposePage withAi={ai === "1" || ai === "true"} date={start} />;
}
