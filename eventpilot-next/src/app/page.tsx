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
      <section className="relative bg-gradient-hero text-white py-24 md:py-32 overflow-hidden">
        <div className="container relative z-10 text-center space-y-8">
          <div className="animate-fade-in space-y-4">
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight font-cairo leading-tight">
              ثلوثية الأعمال
            </h1>
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
              ملتقى النخبة من رواد الأعمال وصناع القرار.
              <br className="hidden md:block" />
              نصنع الفرص، ونبني الشراكات الاستراتيجية في بيئة مهنية راقية.
            </p>
          </div>

          {/* Countdown to next session */}
          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-8 w-48 mx-auto mb-4 bg-white/10" />
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-20 bg-white/10" />
                ))}
              </div>
            </div>
          ) : nextSession ? (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 max-w-3xl mx-auto animate-slide-up rounded-2xl">
              <CardContent className="py-10">
                <p className="text-secondary mb-6 text-lg font-medium">الجلسة القادمة: {nextSession.title}</p>
                <CountdownTimer
                  targetDate={new Date(nextSession.date)}
                  variant="dark"
                />
                {nextSession.canRegister && (
                  <div className="mt-8 flex justify-center">
                    <Link
                      href={`/session/${nextSession.id}`}
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white text-sm font-medium"
                    >
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      احفظ مكانك
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-white/80 py-8 text-lg">
              لا توجد جلسات قادمة حالياً
            </p>
          )}

          <div className="flex flex-col items-center gap-6 animate-slide-up pt-8">
            {/* Primary CTA */}
            <Button
              size="lg"
              className="bg-gradient-to-r from-secondary/90 to-secondary text-primary hover:from-secondary hover:to-secondary/90 text-xl px-12 py-8 h-auto font-bold shadow-[0_8px_32px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_48px_rgba(212,175,55,0.5)] transition-all hover:scale-[1.02] border-0 rounded-2xl backdrop-blur-sm group"
              asChild
            >
              <Link href="/sessions" className="flex items-center gap-3">
                <Calendar className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                تصفح جميع الجلسات
              </Link>
            </Button>

            {/* Secondary CTA - Glass Link */}
            <Link
              href="/register"
              className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all text-white/90 hover:text-white text-base font-medium shadow-lg"
            >
              عضوية جديدة
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Decorative elements - Golden Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/40 rounded-full blur-[100px]" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5"></div>
        <div className="container relative z-10">
          <div className="grid gap-8 md:grid-cols-4 text-center divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/10 animate-fade-in">
            <div className="space-y-2 pt-8 md:pt-0 hover:scale-105 transition-transform duration-300">
              <div className="text-secondary text-4xl md:text-5xl font-bold drop-shadow-sm">50+</div>
              <div className="text-white/90 text-lg font-medium">جلسة منعقدة</div>
            </div>
            <div className="space-y-2 pt-8 md:pt-0 hover:scale-105 transition-transform duration-300">
              <div className="text-secondary text-4xl md:text-5xl font-bold drop-shadow-sm">500+</div>
              <div className="text-white/90 text-lg font-medium">عضو مسجل</div>
            </div>
            <div className="space-y-2 pt-8 md:pt-0 hover:scale-105 transition-transform duration-300">
              <div className="text-secondary text-4xl md:text-5xl font-bold drop-shadow-sm">1000+</div>
              <div className="text-white/90 text-lg font-medium">حضور</div>
            </div>
            <div className="space-y-2 pt-8 md:pt-0 hover:scale-105 transition-transform duration-300">
              <div className="text-secondary text-4xl md:text-5xl font-bold drop-shadow-sm">100+</div>
              <div className="text-white/90 text-lg font-medium">شراكة ناجحة</div>
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
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">لماذا ثلوثية الأعمال؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              نوفر لك بيئة مثالية للتواصل المهني وتطوير أعمالك من خلال لقاءات دورية تجمع النخبة
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-2xl group animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardContent className="pt-10 pb-8 space-y-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-20 h-20 rounded-3xl">
                  <Users className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">تواصل مهني</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    التقِ بأفضل رواد الأعمال والمهنيين في مجالك لبناء شبكة علاقات قوية ومستدامة
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-2xl group animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardContent className="pt-10 pb-8 space-y-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-20 h-20 rounded-3xl">
                  <Lightbulb className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">تبادل الخبرات</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    استفد من تجارب الآخرين وشارك معرفتك في بيئة تفاعلية تشجع على التعلم والنمو
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-2xl group animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardContent className="pt-10 pb-8 space-y-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-20 h-20 rounded-3xl">
                  <Zap className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">فرص واعدة</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    اكتشف فرصاً استثمارية وشراكات استراتيجية قد تغير مسار مشروعك للأفضل
                  </p>
                </div>
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
