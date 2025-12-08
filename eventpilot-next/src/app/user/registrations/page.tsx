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
import { Mail, Phone, Building2, Briefcase, Instagram, Twitter, Edit, Calendar, Clock, MapPin, Users, CalendarCheck } from "lucide-react";

interface RegistrationItem {
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
}

export default function UserRegistrationsPage() {
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
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header Section */}
      <div className="bg-primary text-white pt-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-bold text-secondary shadow-xl">
                {dashboard?.user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold">مرحباً، {dashboard?.user.name}</h1>
                <p className="text-white/80 mt-1">تسجيلاتي في الأحداث</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="shadow-lg hover:shadow-xl transition-all" asChild>
                <Link href="/sessions">تصفح الأحداث</Link>
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm" asChild>
                <Link href="/user/profile">إعدادات الحساب</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container -mt-20 relative z-20 space-y-8">
        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary/60 font-medium">إجمالي التسجيلات</CardDescription>
              <CardTitle className="text-4xl font-bold text-primary">{dashboard?.stats.totalRegistrations ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary/60 font-medium">الأحداث القادمة</CardDescription>
              <CardTitle className="text-4xl font-bold text-secondary">{dashboard?.stats.upcomingEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary/60 font-medium">الأحداث المحضورة</CardDescription>
              <CardTitle className="text-4xl font-bold text-primary">{dashboard?.stats.attendedEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Profile Card */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">معلومات الحساب</CardTitle>
              <CardDescription>معلوماتك الشخصية والمهنية</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/user/profile">
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{dashboard?.user.email}</p>
                </div>
              </div>
              {dashboard?.user.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium" dir="ltr">{dashboard.user.phone}</p>
                  </div>
                </div>
              )}
              {dashboard?.user.companyName && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الشركة</p>
                    <p className="font-medium">{dashboard.user.companyName}</p>
                  </div>
                </div>
              )}
              {dashboard?.user.position && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المنصب</p>
                    <p className="font-medium">{dashboard.user.position}</p>
                  </div>
                </div>
              )}
              {dashboard?.user.activityType && (
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {dashboard.user.activityType}
                  </Badge>
                </div>
              )}
              {(dashboard?.user.instagram || dashboard?.user.twitter) && (
                <div className="flex items-center gap-4 sm:col-span-2 pt-2 border-t">
                  {dashboard?.user.instagram && (
                    <a
                      href={`https://instagram.com/${dashboard.user.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm">@{dashboard.user.instagram}</span>
                    </a>
                  )}
                  {dashboard?.user.twitter && (
                    <a
                      href={`https://twitter.com/${dashboard.user.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                      <span className="text-sm">@{dashboard.user.twitter}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registrations */}
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          <Tabs defaultValue="upcoming" className="w-full">
            <div className="border-b px-6 py-4 bg-muted/30">
              <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">الأحداث القادمة</TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-primary data-[state=active]:text-white">الأرشيف</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="p-6 m-0 space-y-4 min-h-[300px]">
              {dashboard?.upcomingRegistrations && dashboard.upcomingRegistrations.length > 0 ? (
                dashboard.upcomingRegistrations.map((reg: RegistrationItem) => (
                  <RegistrationCard key={reg.id} registration={reg} />
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">لا توجد أحداث قادمة</h3>
                  <p className="text-muted-foreground mb-6">لم تقم بالتسجيل في أي أحداث قادمة بعد</p>
                  <Button asChild variant="default">
                    <Link href="/sessions">استعرض الأحداث المتاحة</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="p-6 m-0 space-y-4 min-h-[300px]">
              {dashboard?.pastRegistrations && dashboard.pastRegistrations.length > 0 ? (
                dashboard.pastRegistrations.map((reg: RegistrationItem) => (
                  <RegistrationCard key={reg.id} registration={reg} isPast />
                ))
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">لا يوجد سجل للأحداث السابقة</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
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
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl text-primary group-hover:text-secondary transition-colors">{registration.session.title}</CardTitle>
            <CardDescription className="font-medium">التجمع رقم {registration.session.sessionNumber}</CardDescription>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>تم التسجيل: {formatArabicDate(new Date(registration.registeredAt))} - {formatArabicTime(new Date(registration.registeredAt))}</span>
            </div>
          </div>
          <Badge variant={registration.isApproved ? "default" : "secondary"} className="px-3 py-1">
            {registration.isApproved ? "مؤكد" : "في انتظار الموافقة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 bg-muted/20 p-4 rounded-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">التاريخ</p>
                <p className="font-medium">{formatArabicDate(new Date(registration.session.date))}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الوقت</p>
                <p className="font-medium">{formatArabicTime(new Date(registration.session.date))}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {registration.session.location && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المكان</p>
                  <p className="font-medium">{registration.session.location}</p>
                </div>
              </div>
            )}
            {registration.companions.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المرافقين</p>
                  <p className="font-medium">{registration.companions.map((c) => c.name).join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" size="sm" asChild className="hover:bg-primary hover:text-white transition-colors">
            <Link href={`/session/${registration.session.id}`}>عرض التفاصيل</Link>
          </Button>
          {!isPast && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/user/registrations/${registration.id}/edit`}>
                <Edit className="w-4 h-4 ml-2" />
                تعديل التسجيل
              </Link>
            </Button>
          )}
          {registration.isApproved && !isPast && (
            <Button variant="default" size="sm" asChild className="bg-secondary hover:bg-secondary/90 text-primary font-bold">
              <Link href={`/user/qr/${registration.session.id}`}>بطاقة الدخول (QR)</Link>
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
