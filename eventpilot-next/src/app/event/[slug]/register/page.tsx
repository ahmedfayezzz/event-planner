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
    where: { slug: decodedSlug },
    select: { id: true },
  });

  if (!session) {
    redirect("/not-found");
  }

  // Accept legacy ?token= param for backward compatibility with old invite links
  const inviteParam = (token || invite || "").trim();
  const queryString = inviteParam ? `?invite=${encodeURIComponent(inviteParam)}` : "";

  redirect(`/session/${session.id}/guest-register${queryString}`);
}
