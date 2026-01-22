import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "معرض الصور - EventPilot",
  description: "إدارة معارض الصور والتعرف على الوجوه",
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
