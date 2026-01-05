import { redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function EventRegisterRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; invite?: string }>;
}) {
  const { slug } = await params;
  const { token, invite } = await searchParams;

  const decodedSlug = decodeURIComponent(slug);

  const session = await db.session.findFirst({
    where: {
      OR: [{ slug: decodedSlug }, { id: decodedSlug }],
    },
    select: { id: true },
  });

  if (!session) {
    redirect("/sessions");
  }

  const inviteParam = token ?? invite;
  const queryString = inviteParam ? `?invite=${encodeURIComponent(inviteParam)}` : "";

  redirect(`/session/${session.id}/guest-register${queryString}`);
}
