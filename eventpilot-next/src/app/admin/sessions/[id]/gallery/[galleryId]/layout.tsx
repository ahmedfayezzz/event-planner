import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تفاصيل المعرض - EventPilot",
  description: "رفع ومعالجة صور المعرض",
};

export default function GalleryDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
