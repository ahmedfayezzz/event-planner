import type { Metadata } from "next";
import { db } from "@/server/db";
import { SessionDetailClient } from "./session-detail-client";
import { toSaudiTime } from "@/lib/timezone";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await db.session.findUnique({
    where: { id },
    select: { title: true, description: true, date: true, location: true },
  });

  if (!session) {
    return {
      title: "الحدث غير موجود | ثلوثية الأعمال",
    };
  }

  const saudiDate = toSaudiTime(new Date(session.date));
  const dateStr = saudiDate?.toLocaleDateString("ar-SA") ?? "";
  const metaDescription = session.description
    ? session.description.length > 150
      ? `${session.description.substring(0, 150)}...`
      : session.description
    : `${session.title} - ${dateStr}${session.location ? ` - ${session.location}` : ""}`;

  return {
    title: `${session.title} | ثلوثية الأعمال`,
    description: metaDescription,
    openGraph: {
      title: session.title,
      description: metaDescription,
      type: "website",
      locale: "ar_SA",
      images: ["/logo.png"],
    },
    twitter: {
      card: "summary",
      title: session.title,
      description: metaDescription,
      images: ["/logo.png"],
    },
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionDetailClient id={id} />;
}
