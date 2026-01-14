"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { MonthlyCalendar } from "./monthly-calendar";
import { SponsorshipChart } from "./sponsorship-chart";

const ARABIC_MONTHS: Record<number, string> = {
  0: "يناير",
  1: "فبراير",
  2: "مارس",
  3: "أبريل",
  4: "مايو",
  5: "يونيو",
  6: "يوليو",
  7: "أغسطس",
  8: "سبتمبر",
  9: "أكتوبر",
  10: "نوفمبر",
  11: "ديسمبر",
};

// Helper to get month bounds for a specific year and month
function getMonthBounds(year: number, month: number) {
  const startOfMonth = new Date(year, month, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(year, month + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
}

// Generate month options for the dropdown (current year ± 1 year)
function generateMonthOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options: { value: string; label: string }[] = [];

  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let month = 0; month < 12; month++) {
      options.push({
        value: `${year}-${month}`,
        label: `${ARABIC_MONTHS[month]} ${year}`,
      });
    }
  }

  return options;
}

export function CalendarTab() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Calculate date range for the selected month
  const dateRange = useMemo(() => {
    const { startOfMonth, endOfMonth } = getMonthBounds(selectedYear, selectedMonth);
    return { startDate: startOfMonth, endDate: endOfMonth };
  }, [selectedYear, selectedMonth]);

  // Fetch calendar data
  const { data: calendarData, isLoading } = api.sponsor.getSponsorshipCalendar.useQuery(dateRange);

  // Fetch chart data
  const { data: chartData } = api.sponsor.getSponsorshipStats.useQuery({ sessionCount: 12 });

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
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

      {/* Month Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={`${selectedYear}-${selectedMonth}`}
            onValueChange={handleMonthSelect}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {ARABIC_MONTHS[selectedMonth]} {selectedYear}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleToday}>
            اليوم
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MonthlyCalendar
              year={selectedYear}
              month={selectedMonth}
              sessions={calendarData?.sessions ?? []}
            />
          )}
        </CardContent>
      </Card>

      {/* Sponsorship History Chart */}
      {chartData && <SponsorshipChart data={chartData} />}
    </div>
  );
}
