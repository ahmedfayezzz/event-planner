"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { api } from "@/trpc/react";

const pathLabels: Record<string, string> = {
  admin: "لوحة التحكم",
  sessions: "الأحداث",
  users: "المستخدمين",
  sponsors: "الرعاة",
  guests: "الضيوف",
  checkin: "تسجيل الحضور",
  settings: "الإعدادات",
  analytics: "الإحصائيات",
  new: "جديد",
  attendees: "المسجلين",
  companions: "المرافقين",
  edit: "تعديل",
  invitations: "الدعوات",
  catering: "الضيافة",
  sponsorship: "الرعاية",
  "email-campaigns": "حملات البريد",
  templates: "القوالب",
  admins: "المديرين",
  suggestions: "الاقتراحات",
  "manual-registration": "تسجيل يدوي",
  valet: "خدمة الفاليه",
  employees: "الموظفين",
  records: "السجلات",
  gallery: "معرض الصور",
  faces: "الوجوه",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Extract session ID if we're on a session-related page
  const sessionIndex = segments.indexOf("sessions");
  const sessionId =
    sessionIndex !== -1 && segments[sessionIndex + 1]
      ? segments[sessionIndex + 1]
      : null;
  const isValidSessionId =
    sessionId && /^[0-9a-f-]{36}$|^c[a-z0-9]{24,}$/.test(sessionId);

  // Extract guest ID if we're on a guest-related page
  const guestIndex = segments.indexOf("guests");
  const guestId =
    guestIndex !== -1 && segments[guestIndex + 1]
      ? segments[guestIndex + 1]
      : null;
  const isValidGuestId =
    guestId && /^[0-9a-f-]{36}$|^c[a-z0-9]{24,}$/.test(guestId);

  // Fetch session data if we have a valid session ID
  const { data: session } = api.session.getAdminDetails.useQuery(
    { id: sessionId! },
    { enabled: !!isValidSessionId }
  );

  // Fetch guest data if we have a valid guest ID
  const { data: guest } = api.guest.getById.useQuery(
    { id: guestId! },
    { enabled: !!isValidGuestId }
  );

  // Don't show breadcrumbs on the main admin page
  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        // Check if this segment looks like an ID (UUID or CUID)
        const isId = /^[0-9a-f-]{36}$|^c[a-z0-9]{24,}$/.test(segment);

        let label: string;
        if (isId && segment === sessionId && session) {
          // Show session title for session IDs
          label = session.title;
        } else if (isId && segment === guestId && guest) {
          // Show guest name for guest IDs
          label = guest.name;
        } else if (isId) {
          label = "تفاصيل";
        } else {
          label = pathLabels[segment] || segment;
        }

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
