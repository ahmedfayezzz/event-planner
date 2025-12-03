"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArabicDate } from "@/lib/utils";
import { QrCode, Calendar } from "lucide-react";

interface SessionItem {
  id: string;
  title: string;
  sessionNumber: number;
  date: Date;
  registrationCount: number;
}

export default function CheckInSelectPage() {
  const { data, isLoading } = api.session.list.useQuery({ upcoming: true });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تسجيل الحضور</h1>
        <p className="text-muted-foreground">
          اختر جلسة لبدء تسجيل الحضور
        </p>
      </div>

      {!data || data.sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>لا توجد جلسات قادمة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sessions.map((session: SessionItem) => (
            <Card key={session.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <CardDescription>
                      التجمع رقم {session.sessionNumber}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {session.registrationCount} مسجل
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {formatArabicDate(new Date(session.date))}
                </p>
                <Button asChild className="w-full">
                  <Link href={`/admin/checkin/${session.id}`}>
                    <QrCode className="ml-2 h-4 w-4" />
                    بدء تسجيل الحضور
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
