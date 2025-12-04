"use client";

import { api } from "@/trpc/react";
import { SessionCard } from "@/components/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionItem {
  id: string;
  title: string;
  sessionNumber: number;
  date: Date;
  status: string;
  maxParticipants: number;
  registrationCount: number;
  isFull: boolean;
  guestName: string | null;
  location: string | null;
}

export default function SessionsPage() {
  const { data: allSessions, isLoading: loadingAll } = api.session.list.useQuery({});
  const { data: upcomingSessions, isLoading: loadingUpcoming } = api.session.list.useQuery({
    upcoming: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-transparent to-transparent">
    <div className="container py-12 md:py-16">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary">الجلسات</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          استعرض جميع جلسات ثلوثية الأعمال وسجل في الجلسات القادمة لتكون جزءاً من مجتمعنا
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="upcoming">القادمة</TabsTrigger>
          <TabsTrigger value="all">جميع الجلسات</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loadingUpcoming ? (
            <div dir="rtl" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : upcomingSessions?.sessions && upcomingSessions.sessions.length > 0 ? (
            <div dir="rtl" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.sessions.map((session: SessionItem) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد جلسات قادمة حالياً</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loadingAll ? (
            <div dir="rtl" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : allSessions?.sessions && allSessions.sessions.length > 0 ? (
            <div dir="rtl" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allSessions.sessions.map((session: SessionItem) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد جلسات</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
