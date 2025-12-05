"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const pathLabels: Record<string, string> = {
  admin: "لوحة التحكم",
  sessions: "الجلسات",
  users: "المستخدمين",
  checkin: "تسجيل الحضور",
  settings: "الإعدادات",
  new: "جديد",
  attendees: "المسجلين",
  companions: "المرافقين",
  edit: "تعديل",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on the main admin page
  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        // Check if this segment looks like an ID (UUID or number)
        const isId = /^[0-9a-f-]{36}$/.test(segment) || /^\d+$/.test(segment);
        const label = isId ? "تفاصيل" : (pathLabels[segment] || segment);

        return (
          <span key={href} className="flex items-center gap-1">
            {index > 0 && <ChevronLeft className="h-4 w-4" />}
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
