"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";

export default function UserDashboardPage() {
  const { data: authSession, status } = useSession();
  const { data: dashboard, isLoading } = api.user.getDashboard.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "unauthenticated") {
    redirect("/user/login");
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مرحباً {dashboard?.user.name}</h1>
            <p className="text-muted-foreground">لوحة التحكم الخاصة بك</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/sessions">استعرض الجلسات</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>إجمالي التسجيلات</CardDescription>
              <CardTitle className="text-3xl">{dashboard?.stats.totalRegistrations ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الجلسات القادمة</CardDescription>
              <CardTitle className="text-3xl">{dashboard?.stats.upcomingEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الجلسات المحضورة</CardDescription>
              <CardTitle className="text-3xl">{dashboard?.stats.attendedEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Registrations */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">الجلسات القادمة</TabsTrigger>
            <TabsTrigger value="past">الجلسات السابقة</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {dashboard?.upcomingRegistrations && dashboard.upcomingRegistrations.length > 0 ? (
              dashboard.upcomingRegistrations.map((reg) => (
                <RegistrationCard key={reg.id} registration={reg} />
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">لا توجد تسجيلات قادمة</p>
                  <Button asChild>
                    <Link href="/sessions">استعرض الجلسات المتاحة</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {dashboard?.pastRegistrations && dashboard.pastRegistrations.length > 0 ? (
              dashboard.pastRegistrations.map((reg) => (
                <RegistrationCard key={reg.id} registration={reg} isPast />
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">لا توجد جلسات سابقة</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RegistrationCard({
  registration,
  isPast = false,
}: {
  registration: {
    id: string;
    isApproved: boolean;
    registeredAt: Date;
    session: {
      id: string;
      title: string;
      date: Date;
      location: string | null;
      sessionNumber: number;
    };
    companions: { id: string; name: string }[];
  };
  isPast?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{registration.session.title}</CardTitle>
            <CardDescription>التجمع رقم {registration.session.sessionNumber}</CardDescription>
          </div>
          <Badge variant={registration.isApproved ? "default" : "secondary"}>
            {registration.isApproved ? "مؤكد" : "في انتظار الموافقة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">التاريخ</p>
            <p className="font-medium">{formatArabicDate(new Date(registration.session.date))}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الوقت</p>
            <p className="font-medium">{formatArabicTime(new Date(registration.session.date))}</p>
          </div>
          {registration.session.location && (
            <div>
              <p className="text-sm text-muted-foreground">المكان</p>
              <p className="font-medium">{registration.session.location}</p>
            </div>
          )}
          {registration.companions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">المرافقين</p>
              <p className="font-medium">{registration.companions.map((c) => c.name).join(", ")}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/session/${registration.session.id}`}>عرض الجلسة</Link>
          </Button>
          {registration.isApproved && !isPast && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/user/qr/${registration.session.id}`}>عرض رمز QR</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container py-8">
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
