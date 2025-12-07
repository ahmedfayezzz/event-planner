"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatArabicDate } from "@/lib/utils";
import { QrCode, Calendar, CalendarDays, CalendarRange } from "lucide-react";

type DateRange = "today" | "week" | "month" | "all";

interface SessionItem {
  id: string;
  title: string;
  sessionNumber: number;
  date: Date;
  registrationCount: number;
  status: string;
}

const dateRangeTabs: { value: DateRange; label: string; icon: React.ReactNode }[] = [
  { value: "today", label: "اليوم", icon: <Calendar className="h-4 w-4" /> },
  { value: "week", label: "هذا الأسبوع", icon: <CalendarDays className="h-4 w-4" /> },
  { value: "month", label: "هذا الشهر", icon: <CalendarRange className="h-4 w-4" /> },
  { value: "all", label: "الكل", icon: null },
];

export default function CheckInSelectPage() {
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const { data, isLoading } = api.session.list.useQuery({ dateRange });

  const getEmptyMessage = () => {
    switch (dateRange) {
      case "today":
        return "لا توجد أحداث اليوم";
      case "week":
        return "لا توجد أحداث هذا الأسبوع";
      case "month":
        return "لا توجد أحداث هذا الشهر";
      default:
        return "لا توجد أحداث";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تسجيل الحضور</h1>
        <p className="text-muted-foreground">اختر حدث لبدء تسجيل الحضور</p>
      </div>

      {/* Date Range Tabs */}
      <Tabs
        value={dateRange}
        onValueChange={(value) => setDateRange(value as DateRange)}
      >
        <TabsList className="grid w-full grid-cols-4">
          {dateRangeTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data || data.sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{getEmptyMessage()}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sessions.map((session: SessionItem) => (
            <Card
              key={session.id}
              className="hover:border-primary transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <CardDescription>
                      التجمع رقم {session.sessionNumber}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">{session.registrationCount} مسجل</Badge>
                    {session.status === "completed" && (
                      <Badge variant="secondary">مكتملة</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {formatArabicDate(new Date(session.date))}
                </p>
                <Button asChild className="w-full">
                  <Link href={`/admin/checkin/${session.id}`}>
                    <QrCode className="me-2 h-4 w-4" />
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
