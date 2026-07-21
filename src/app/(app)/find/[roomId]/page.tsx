import { redirect } from "next/navigation";

// Single-room viewing now happens on the Map page.
export default async function RoomRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/map?room=${roomId}`);
}
