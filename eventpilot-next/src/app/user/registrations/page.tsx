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
import { Mail, Phone, Building2, Briefcase, Instagram, Twitter, Edit, Calendar, Clock, MapPin, Users, CalendarCheck, ExternalLink, Car } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

interface RegistrationItem {
  id: string;
  isApproved: boolean;
  registeredAt: Date;
  needsValet?: boolean;
  session: {
    id: string;
    title: string;
    date: Date;
    location: string | null;
    locationUrl: string | null;
    sessionNumber: number;
    valetEnabled?: boolean;
  };
  companions: { id: string; name: string }[];
  valetRecord?: {
    id: string;
    status: string;
    trackingToken: string | null;
    ticketNumber: number | null;
  } | null;
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
      <div className="bg-primary text-white pt-12 sm:pt-20 pb-24 sm:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="flex flex-col items-center text-center md:flex-row md:text-start md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <UserAvatar
                avatarUrl={dashboard?.user.avatarUrl}
                name={dashboard?.user.name}
                size="xl"
                variant="accent"
                className="rounded-2xl border-2 border-white/20 shadow-xl"
              />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">مرحباً، {dashboard?.user.name}</h1>
                <p className="text-white/80 mt-1 text-sm sm:text-base">تسجيلاتي في الأحداث</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="secondary" className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto" asChild>
                <Link href="/sessions">تصفح الأحداث</Link>
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto" asChild>
                <Link href="/user/profile">إعدادات الحساب</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20 space-y-6 sm:space-y-8">
        {/* Stats */}
        <div className="grid gap-3 sm:gap-6 grid-cols-3">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardDescription className="text-primary/60 font-medium text-xs sm:text-sm">إجمالي التسجيلات</CardDescription>
              <CardTitle className="text-2xl sm:text-4xl font-bold text-primary">{dashboard?.stats.totalRegistrations ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardDescription className="text-primary/60 font-medium text-xs sm:text-sm">الأحداث القادمة</CardDescription>
              <CardTitle className="text-2xl sm:text-4xl font-bold text-accent">{dashboard?.stats.upcomingEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md hover:transform hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardDescription className="text-primary/60 font-medium text-xs sm:text-sm">الأحداث المحضورة</CardDescription>
              <CardTitle className="text-2xl sm:text-4xl font-bold text-primary">{dashboard?.stats.attendedEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Profile Card */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">معلومات الحساب</CardTitle>
              <CardDescription className="text-xs sm:text-sm">معلوماتك الشخصية والمهنية</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
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
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          <Tabs defaultValue="upcoming" className="w-full">
            <div className="border-b px-3 sm:px-6 py-3 sm:py-4 bg-muted/30">
              <TabsList className="bg-white border shadow-sm w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">الأحداث القادمة</TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">الأرشيف</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="p-3 sm:p-6 m-0 space-y-4 min-h-[300px]">
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

            <TabsContent value="past" className="p-3 sm:p-6 m-0 space-y-4 min-h-[300px]">
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
    needsValet?: boolean;
    session: {
      id: string;
      title: string;
      date: Date;
      location: string | null;
      locationUrl: string | null;
      sessionNumber: number;
      valetEnabled?: boolean;
    };
    companions: { id: string; name: string }[];
    valetRecord?: {
      id: string;
      status: string;
      trackingToken: string | null;
      ticketNumber: number | null;
    } | null;
  };
  isPast?: boolean;
}) {
  const hasValetTracking = registration.valetRecord?.trackingToken;
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div className="space-y-1 order-2 sm:order-1">
            <CardTitle className="text-base sm:text-xl text-primary group-hover:text-accent transition-colors">{registration.session.title}</CardTitle>
            <CardDescription className="font-medium text-xs sm:text-sm">التجمع رقم {registration.session.sessionNumber}</CardDescription>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground pt-1">
              <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>تم التسجيل: {formatArabicDate(new Date(registration.registeredAt))}</span>
              <span className="hidden sm:inline">- {formatArabicTime(new Date(registration.registeredAt))}</span>
            </div>
          </div>
          <Badge
            variant={registration.isApproved ? "default" : "secondary"}
            className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs order-1 sm:order-2 self-start shrink-0"
          >
            {registration.isApproved ? "مؤكد" : "في انتظار الموافقة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
        <div className="grid gap-3 sm:gap-6 md:grid-cols-2 bg-muted/20 p-3 sm:p-4 rounded-lg sm:rounded-xl">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">التاريخ</p>
                <p className="font-medium text-xs sm:text-sm truncate">{formatArabicDate(new Date(registration.session.date))}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">الوقت</p>
                <p className="font-medium text-xs sm:text-sm">{formatArabicTime(new Date(registration.session.date))}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {registration.session.location && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">المكان</p>
                  {registration.session.locationUrl ? (
                    <a
                      href={registration.session.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-xs sm:text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span className="truncate">{registration.session.location}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="font-medium text-xs sm:text-sm truncate">{registration.session.location}</p>
                  )}
                </div>
              </div>
            )}
            {registration.companions.length > 0 && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">المرافقين</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{registration.companions.map((c) => c.name).join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 sm:justify-end">
          <Button variant="outline" size="sm" asChild className="hover:bg-primary hover:text-white transition-colors w-full sm:w-auto text-xs sm:text-sm">
            <Link href={`/session/${registration.session.id}`}>عرض التفاصيل</Link>
          </Button>
          {!isPast && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs sm:text-sm">
              <Link href={`/user/registrations/${registration.id}/edit`}>
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                تعديل التسجيل
              </Link>
            </Button>
          )}
          {hasValetTracking && (
            <Button variant="outline" size="sm" asChild className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 w-full sm:w-auto text-xs sm:text-sm">
              <Link href={`/valet/track/${registration.valetRecord?.trackingToken}`}>
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                تتبع سيارتك
              </Link>
            </Button>
          )}
          {registration.isApproved && !isPast && (
            <Button variant="default" size="sm" asChild className="bg-secondary hover:bg-secondary/90 text-primary font-bold w-full sm:w-auto text-xs sm:text-sm">
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
    <div className="container px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-10 w-40 sm:w-48" />
          <Skeleton className="h-4 sm:h-5 w-28 sm:w-32" />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-24" />
          ))}
        </div>
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 sm:h-40" />
        ))}
      </div>
    </div>
  );
}
