"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Car, Users, ClipboardList, LayoutDashboard } from "lucide-react";

const valetNavItems = [
  {
    href: "/admin/valet",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/valet/employees",
    label: "الموظفين",
    icon: Users,
  },
  {
    href: "/admin/valet/records",
    label: "السجلات",
    icon: ClipboardList,
  },
];

export default function AdminValetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة خدمة الفاليه</h1>
          <p className="text-muted-foreground">تحكم كامل في خدمة صف السيارات</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-1 border-b">
        {valetNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
