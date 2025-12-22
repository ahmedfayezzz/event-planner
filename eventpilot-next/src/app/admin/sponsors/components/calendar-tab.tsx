"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatArabicDate } from "@/lib/utils";
import { WeeklyGrid } from "./weekly-grid";
import { MonthlyTimeline } from "./monthly-timeline";
import { SponsorshipChart } from "./sponsorship-chart";

// Helper to get week start/end dates
function getWeekBounds(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Start of current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  // End of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

// Helper to get month bounds
function getMonthBounds(monthOffset: number) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 2, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
}

export function CalendarTab() {
  const [view, setView] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === "week") {
      const { startOfWeek, endOfWeek } = getWeekBounds(weekOffset);
      return { startDate: startOfWeek, endDate: endOfWeek };
    } else {
      const { startOfMonth, endOfMonth } = getMonthBounds(monthOffset);
      return { startDate: startOfMonth, endDate: endOfMonth };
    }
  }, [view, weekOffset, monthOffset]);

  // Fetch calendar data
  const { data: calendarData, isLoading } = api.sponsor.getSponsorshipCalendar.useQuery(dateRange);

  // Fetch chart data
  const { data: chartData } = api.sponsor.getSponsorshipStats.useQuery({ sessionCount: 12 });

  const handlePrevious = () => {
    if (view === "week") {
      setWeekOffset((prev) => prev - 1);
    } else {
      setMonthOffset((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (view === "week") {
      setWeekOffset((prev) => prev + 1);
    } else {
      setMonthOffset((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    if (view === "week") {
      setWeekOffset(0);
    } else {
      setMonthOffset(0);
    }
  };

  const stats = calendarData?.stats;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفعاليات</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalSessions ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة الرعاية</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.fullySponsored ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">جزئية الرعاية</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.partiallySponsored ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدون رعاية</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.noSponsorship ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
          <TabsList>
            <TabsTrigger value="week">أسبوعي</TabsTrigger>
            <TabsTrigger value="month">شهري</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            اليوم
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground min-w-[200px] text-center">
            {formatArabicDate(dateRange.startDate)} - {formatArabicDate(dateRange.endDate)}
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : view === "week" ? (
            <WeeklyGrid sessions={calendarData?.sessions ?? []} />
          ) : (
            <MonthlyTimeline sessions={calendarData?.sessions ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Sponsorship History Chart */}
      {chartData && <SponsorshipChart data={chartData} />}
    </div>
  );
}
