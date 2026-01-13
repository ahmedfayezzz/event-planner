"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Loader2,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";

export default function ValetHomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: assignedSessions, isLoading } = api.valet.getMyAssignedSessions.useQuery(
    undefined,
    {
      enabled: mounted,
      refetchInterval: 30000,
    }
  );

  // Separate active and completed sessions
  const activeSessions = assignedSessions?.filter((s) => s.status !== "completed") ?? [];
  const completedSessions = assignedSessions?.filter((s) => s.status === "completed") ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">الأحداث المسجلة</h1>
        <p className="text-muted-foreground mt-1">اختر الحدث للبدء في العمل</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeSessions.length === 0 && completedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Car className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">لا توجد أحداث مسجلة</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            تواصل مع المدير لتسجيلك في الأحداث القادمة
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground px-1">
                الأحداث النشطة ({activeSessions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeSessions.map((session) => (
                  <Link key={session.id} href={`/valet/${session.id}`}>
                    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        {/* Color accent bar */}
                        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />

                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                {session.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>
                                  {format(new Date(session.date), "EEEE، d MMMM yyyy", { locale: ar })}
                                </span>
                              </div>
                            </div>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 pt-2 border-t">
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 rounded bg-primary/10">
                                <Car className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="text-muted-foreground">
                                سعة: {session.valetLotCapacity}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                session.status === "open"
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-blue-50 text-blue-600 border-blue-200"
                              }
                            >
                              {session.status === "open" ? "مفتوح" : session.status === "upcoming" ? "قادم" : session.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground px-1">
                أحداث مكتملة ({completedSessions.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {completedSessions.slice(0, 4).map((session) => (
                  <Link key={session.id} href={`/valet/${session.id}`}>
                    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer opacity-70 hover:opacity-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-medium truncate">{session.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.date), "d MMMM yyyy", { locale: ar })}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">مكتمل</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
