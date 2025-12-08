"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";

interface CompanionItem {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
}

export default function RegistrationConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: registration, isLoading, error } = api.registration.getConfirmation.useQuery({
    registrationId: id,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">التسجيل غير موجود</h1>
        <p className="text-muted-foreground mb-6">
          لم نتمكن من العثور على هذا التسجيل
        </p>
        <Button asChild>
          <Link href="/sessions">استعرض الأحداث</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">تم التسجيل بنجاح!</h1>
          <p className="text-muted-foreground">
            {registration.isApproved
              ? "تم تأكيد تسجيلك وستتلقى بريداً إلكترونياً بالتفاصيل"
              : "تسجيلك قيد المراجعة وسيتم إعلامك عند الموافقة"}
          </p>
        </div>

        {/* Registration Status */}
        <Card>
          <CardHeader className="text-center pb-2">
            <Badge
              variant={registration.isApproved ? "default" : "secondary"}
              className="w-fit mx-auto text-base px-4 py-1"
            >
              {registration.isApproved ? "مؤكد" : "في انتظار الموافقة"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{registration.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{registration.email}</p>
              </div>
            </div>

            {!registration.isApproved && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm text-amber-800">
                  سيتم إرسال بريد إلكتروني مع رمز QR عند الموافقة على تسجيلك
                </p>
              </div>
            )}

            {registration.isApproved && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-sm text-green-800">
                  تم إرسال رمز QR إلى بريدك الإلكتروني، أحضره معك يوم الحدث
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الحدث</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">اسم الحدث</p>
              <p className="font-medium">{registration.session.title}</p>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">{formatArabicDate(new Date(registration.session.date))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوقت</p>
                <p className="font-medium">{formatArabicTime(new Date(registration.session.date))}</p>
              </div>
            </div>
            {registration.session.location && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">المكان</p>
                  <p className="font-medium">{registration.session.location}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Companions */}
        {registration.companions && registration.companions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المرافقين ({registration.companions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {registration.companions.map((companion: CompanionItem) => (
                  <li
                    key={companion.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{companion.name}</p>
                      {companion.company && (
                        <p className="text-sm text-muted-foreground">{companion.company}</p>
                      )}
                    </div>
                    {companion.email && (
                      <span className="text-xs text-muted-foreground">{companion.email}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href={`/session/${registration.session.id}`}>عرض تفاصيل الحدث</Link>
          </Button>
          {registration.hasAccount ? (
            <Button variant="outline" asChild>
              <Link href="/user/registrations">الذهاب لتسجيلاتي</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/register">إنشاء حساب</Link>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href="/sessions">استعرض أحداث أخرى</Link>
          </Button>
        </div>

        {/* Add to Calendar Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>احفظ التاريخ في تقويمك!</p>
          <p className="mt-1">
            {formatArabicDate(new Date(registration.session.date))} - {formatArabicTime(new Date(registration.session.date))}
          </p>
        </div>
      </div>
    </div>
  );
}
