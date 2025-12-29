"use client";

import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountdownTimer } from "@/components/countdown-timer";
import { SessionCard } from "@/components/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Lightbulb, Zap, Calendar, ArrowLeft } from "lucide-react";

interface SessionGuest {
  guest: {
    id: string;
    name: string;
    title: string | null;
    imageUrl: string | null;
    isPublic: boolean;
  };
}

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
  sessionGuests?: SessionGuest[];
  showGuestProfile?: boolean;
  description?: string | null;
  location: string | null;
}

export default function HomePage() {
  const { data: upcomingSessions, isLoading } =
    api.session.getUpcoming.useQuery({
      limit: 3,
    });

  const nextSession = upcomingSessions?.[0];

  return (
    <div className="flex flex-col">
      {/* Hero Section with Gradient */}
      <section className="relative bg-gradient-hero text-white py-12 md:py-24 lg:py-32 overflow-hidden">
        <div className="container relative z-10 text-center space-y-6 md:space-y-8 px-4">
          <div className="animate-fade-in space-y-6 md:space-y-8">
            {/* Logo + Brand Name */}
            <div className="flex flex-col items-center gap-4 md:gap-6">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="ثلوثية الأعمال"
                  width={160}
                  height={160}
                  className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 drop-shadow-2xl"
                  priority
                />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-cairo leading-tight">
                ثلوثية الأعمال
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed px-2">
              ملتقى النخبة من رواد الأعمال وصناع القرار.
              <br className="hidden md:block" />
              نصنع الفرص، ونبني الشراكات الاستراتيجية في بيئة مهنية راقية.
            </p>
          </div>

          {/* Countdown to next session */}
          {isLoading ? (
            <div className="py-4 md:py-8">
              <Skeleton className="h-6 md:h-8 w-40 md:w-48 mx-auto mb-3 md:mb-4 bg-white/10 rounded" />
              <div className="flex justify-center gap-2 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-14 md:h-24 md:w-20 bg-white/10 rounded-lg"
                  />
                ))}
              </div>
            </div>
          ) : nextSession ? (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 max-w-3xl mx-auto animate-slide-up rounded-xl md:rounded-2xl">
              <CardContent className="py-6 md:py-10 px-4 md:px-6">
                <p className="text-accent mb-4 md:mb-6 text-sm md:text-lg font-medium">
                  {nextSession.title}
                </p>
                <CountdownTimer
                  targetDate={new Date(nextSession.date)}
                  variant="dark"
                />
                {nextSession.canRegister && (
                  <div className="mt-5 md:mt-8 flex justify-center">
                    <Link
                      href={`/session/${nextSession.id}`}
                      className="group inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white text-xs md:text-sm font-medium"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:-translate-x-1 transition-transform" />
                      احفظ مكانك
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-white/80 py-4 md:py-8 text-sm md:text-lg">
              لا توجد أحداث قادمة حالياً
            </p>
          )}

          <div className="flex flex-col items-center gap-4 md:gap-6 animate-slide-up pt-4 md:pt-8">
            {/* Primary CTA */}
            <Button
              size="lg"
              className="bg-gradient-to-r from-accent/90 to-accent text-white hover:from-accent hover:to-accent/90 text-base md:text-xl px-8 md:px-12 py-5 md:py-8 h-auto font-bold shadow-[0_8px_32px_rgba(178,127,89,0.4)] hover:shadow-[0_12px_48px_rgba(178,127,89,0.5)] transition-all hover:scale-[1.02] border-0 rounded-xl md:rounded-2xl backdrop-blur-sm group w-full sm:w-auto"
              asChild
            >
              <Link
                href="/sessions"
                className="flex items-center justify-center gap-2 md:gap-3"
              >
                <Calendar className="h-5 w-5 md:h-6 md:w-6 group-hover:rotate-12 transition-transform" />
                تصفح جميع الأحداث
              </Link>
            </Button>

            {/* Secondary CTA - Glass Link */}
            <Link
              href="/register"
              className="group flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all text-white/90 hover:text-white text-sm md:text-base font-medium shadow-lg"
            >
              عضوية جديدة
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Decorative elements - Sand Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/40 rounded-full blur-[100px]" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 md:py-12 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-sadu opacity-[0.04]"></div>
        <div className="container relative z-10 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center animate-fade-in">
            <div className="space-y-1 md:space-y-2 py-4 md:py-0 hover:scale-105 transition-transform duration-300">
              <div className="text-accent text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-sm">
                50+
              </div>
              <div className="text-white/90 text-sm md:text-lg font-medium">
                حدث منعقد
              </div>
            </div>
            <div className="space-y-1 md:space-y-2 py-4 md:py-0 hover:scale-105 transition-transform duration-300">
              <div className="text-accent text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-sm">
                500+
              </div>
              <div className="text-white/90 text-sm md:text-lg font-medium">
                عضو مسجل
              </div>
            </div>
            <div className="space-y-1 md:space-y-2 py-4 md:py-0 hover:scale-105 transition-transform duration-300">
              <div className="text-accent text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-sm">
                1000+
              </div>
              <div className="text-white/90 text-sm md:text-lg font-medium">
                حضور
              </div>
            </div>
            <div className="space-y-1 md:space-y-2 py-4 md:py-0 hover:scale-105 transition-transform duration-300">
              <div className="text-accent text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-sm">
                100+
              </div>
              <div className="text-white/90 text-sm md:text-lg font-medium">
                شراكة ناجحة
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-10 md:py-16 lg:py-24 bg-gradient-to-b from-primary/5 via-transparent to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-sadu opacity-[0.02]" />
        <div className="container px-4 relative z-10">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-4">
              الأحداث القادمة
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              سجل الآن لحجز مقعدك في الأحداث القادمة
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 md:h-48 w-full" />
                  <CardContent className="pt-4 space-y-2 md:space-y-3">
                    <Skeleton className="h-4 md:h-5 w-3/4" />
                    <Skeleton className="h-3 md:h-4 w-1/2" />
                    <Skeleton className="h-3 md:h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingSessions && upcomingSessions.length > 0 ? (
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session: SessionItem) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <Card className="py-8 md:py-12">
              <CardContent className="text-center">
                <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/50 mb-3 md:mb-4" />
                <p className="text-muted-foreground text-sm md:text-base">
                  لا توجد أحداث قادمة حالياً
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-6 md:mt-8">
            <Button variant="outline" className="btn-lift" asChild>
              <Link href="/sessions">
                عرض جميع الأحداث
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 lg:py-32 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-16 space-y-2 md:space-y-4 animate-fade-in">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">
              لماذا ثلوثية الأعمال؟
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base lg:text-lg px-2">
              نوفر لك بيئة مثالية للتواصل المهني وتطوير أعمالك من خلال لقاءات
              دورية تجمع النخبة
            </p>
          </div>

          <div className="grid gap-4 md:gap-8 sm:grid-cols-2 md:grid-cols-3">
            <Card
              className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-xl md:rounded-2xl group animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <CardContent className="pt-6 pb-5 md:pt-10 md:pb-8 space-y-4 md:space-y-6 px-4 md:px-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl">
                  <Users className="h-7 w-7 md:h-10 md:w-10" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-primary">
                    تواصل مهني
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                    التقِ بأفضل رواد الأعمال والمهنيين في مجالك لبناء شبكة
                    علاقات قوية ومستدامة
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-xl md:rounded-2xl group animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="pt-6 pb-5 md:pt-10 md:pb-8 space-y-4 md:space-y-6 px-4 md:px-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl">
                  <Lightbulb className="h-7 w-7 md:h-10 md:w-10" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-primary">
                    تبادل الخبرات
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                    استفد من تجارب الآخرين وشارك معرفتك في بيئة تفاعلية تشجع على
                    التعلم والنمو
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all text-center rounded-xl md:rounded-2xl group animate-slide-up sm:col-span-2 md:col-span-1"
              style={{ animationDelay: "0.3s" }}
            >
              <CardContent className="pt-6 pb-5 md:pt-10 md:pb-8 space-y-4 md:space-y-6 px-4 md:px-6">
                <div className="feature-icon mx-auto bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl">
                  <Zap className="h-7 w-7 md:h-10 md:w-10" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-primary">
                    فرص واعدة
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                    اكتشف فرصاً استثمارية وشراكات استراتيجية قد تغير مسار مشروعك
                    للأفضل
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pattern Divider */}
      {/* <div className="pattern-border opacity-30"></div> */}

      {/* CTA Section */}
      <section className="py-10 md:py-16 lg:py-24 bg-gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-sadu-chain opacity-[0.03]"></div>
        <div className="container text-center space-y-4 md:space-y-6 px-4 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold">انضم إلينا اليوم</h2>
          <p className="text-white/90 max-w-xl mx-auto text-sm md:text-base">
            سجل الآن وكن جزءاً من مجتمع ثلوثية الأعمال
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Button
              size="default"
              variant="secondary"
              className="btn-lift w-full sm:w-auto"
              asChild
            >
              <Link href="/register">سجل كعضو</Link>
            </Button>
            <Button
              size="default"
              variant="outline"
              className="btn-lift bg-transparent border-accent text-accent hover:bg-accent/10 w-full sm:w-auto"
              asChild
            >
              <Link href="/become-sponsor">كن راعياً</Link>
            </Button>
            <Button
              size="default"
              variant="outline"
              className="btn-lift bg-transparent border-white text-white hover:bg-white/10 w-full sm:w-auto"
              asChild
            >
              <Link href="/user/login">تسجيل الدخول</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
