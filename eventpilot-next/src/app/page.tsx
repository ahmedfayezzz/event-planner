"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountdownTimer } from "@/components/countdown-timer";
import { SessionCard } from "@/components/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Lightbulb, Zap, Calendar, ArrowLeft } from "lucide-react";

interface SessionItem {
  id: string;
  title: string;
  sessionNumber: number;
  date: Date;
  status: string;
  maxParticipants: number;
  registrationCount: number | null;
  isFull: boolean;
  canRegister: boolean;
  guestName: string | null;
  showGuestProfile?: boolean;
  description?: string | null;
  location: string | null;
}

export default function HomePage() {
  const { data: upcomingSessions, isLoading } = api.session.getUpcoming.useQuery({
    limit: 3,
  });

  const nextSession = upcomingSessions?.[0];

  return (
    <div className="flex flex-col">
      {/* Hero Section with Gradient */}
      <section className="relative bg-gradient-hero text-white py-20 md:py-32 overflow-hidden">
        <div className="container relative z-10 text-center space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              ثلوثية الأعمال
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mt-4">
              منصة التواصل المهني الأسبوعية - حيث يلتقي رواد الأعمال لتبادل الخبرات وبناء العلاقات
            </p>
          </div>

          {/* Countdown to next session */}
          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-8 w-48 mx-auto mb-4 bg-white/20" />
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-20 bg-white/20" />
                ))}
              </div>
            </div>
          ) : nextSession ? (
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 max-w-2xl mx-auto animate-slide-up">
              <CardContent className="py-8">
                <p className="text-white/80 mb-4">الجلسة القادمة: {nextSession.title}</p>
                <CountdownTimer
                  targetDate={new Date(nextSession.date)}
                  className="text-white"
                />
              </CardContent>
            </Card>
          ) : (
            <p className="text-white/80 py-8">
              لا توجد جلسات قادمة حالياً
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button size="lg" variant="secondary" className="btn-lift" asChild>
              <Link href="/sessions">
                <Calendar className="ml-2 h-5 w-5" />
                عرض الجلسات
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="btn-lift bg-transparent border-white text-white hover:bg-white/10" asChild>
              <Link href="/register">
                إنشاء حساب
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4 text-center">
            <div className="space-y-2">
              <div className="stat-value">50+</div>
              <div className="stat-label">جلسة منعقدة</div>
            </div>
            <div className="space-y-2">
              <div className="stat-value">500+</div>
              <div className="stat-label">عضو مسجل</div>
            </div>
            <div className="space-y-2">
              <div className="stat-value">1000+</div>
              <div className="stat-label">حضور</div>
            </div>
            <div className="space-y-2">
              <div className="stat-value">100+</div>
              <div className="stat-label">شراكة ناجحة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">الجلسات القادمة</h2>
            <p className="text-muted-foreground">
              سجل الآن لحجز مقعدك في الجلسات القادمة
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="pt-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingSessions && upcomingSessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session: SessionItem) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">لا توجد جلسات قادمة حالياً</p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-8">
            <Button variant="outline" className="btn-lift" asChild>
              <Link href="/sessions">
                عرض جميع الجلسات
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">لماذا ثلوثية الأعمال؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              نوفر لك بيئة مثالية للتواصل المهني وتطوير أعمالك
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="card-hover text-center">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="feature-icon mx-auto">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">تواصل مهني</h3>
                <p className="text-muted-foreground">
                  التقِ بأفضل رواد الأعمال والمهنيين في مجالك
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover text-center">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="feature-icon mx-auto">
                  <Lightbulb className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">تبادل الخبرات</h3>
                <p className="text-muted-foreground">
                  استفد من خبرات الآخرين وشارك معرفتك
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover text-center">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="feature-icon mx-auto">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">فرص جديدة</h3>
                <p className="text-muted-foreground">
                  اكتشف فرص عمل وشراكات جديدة
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-primary text-white">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold">انضم إلينا اليوم</h2>
          <p className="text-white/90 max-w-xl mx-auto">
            سجل الآن وكن جزءاً من مجتمع ثلوثية الأعمال
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="btn-lift" asChild>
              <Link href="/register">إنشاء حساب مجاني</Link>
            </Button>
            <Button size="lg" variant="outline" className="btn-lift bg-transparent border-white text-white hover:bg-white/10" asChild>
              <Link href="/user/login">تسجيل الدخول</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
