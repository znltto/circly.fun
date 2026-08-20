import { notFound } from "next/navigation";
import { getFriendByUsername, listThread } from "@/lib/dms/queries";
import { markThreadRead } from "@/lib/dms/actions";
import { DmThread } from "./thread";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function DmPage({ params }: PageProps) {
  const { username } = await params;
  const friend = await getFriendByUsername(username);
  if (!friend) notFound();

  const initialMessages = await listThread(friend.id);

  // Marca como lido em background — não bloqueia render
  void markThreadRead(friend.id);

  return (
    <DmThread friend={friend} initialMessages={initialMessages} />
  );
}
