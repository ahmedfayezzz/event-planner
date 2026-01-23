import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إدارة الوجوه - EventPilot",
  description: "تعيين الوجوه للأشخاص ومشاركة الصور",
};

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
