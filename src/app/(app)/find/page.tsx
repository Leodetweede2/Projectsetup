import { redirect } from "next/navigation";

// The "Find PC" search now lives on the Map page.
export default async function FindRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/map?q=${encodeURIComponent(q)}` : "/map");
}
