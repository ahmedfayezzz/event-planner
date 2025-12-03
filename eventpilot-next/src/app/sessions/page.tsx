"use client";

import { api } from "@/trpc/react";
import { SessionCard } from "@/components/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SessionsPage() {
  const { data: allSessions, isLoading: loadingAll } = api.session.list.useQuery({});
  const { data: upcomingSessions, isLoading: loadingUpcoming } = api.session.list.useQuery({
    upcoming: true,
  });

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">الجلسات</h1>
        <p className="text-muted-foreground">
          استعرض جميع جلسات ثلوثية الأعمال وسجل في الجلسات القادمة
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="upcoming">القادمة</TabsTrigger>
          <TabsTrigger value="all">جميع الجلسات</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loadingUpcoming ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : upcomingSessions?.sessions && upcomingSessions.sessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.sessions.map((session) => (
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : allSessions?.sessions && allSessions.sessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allSessions.sessions.map((session) => (
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
  );
}
