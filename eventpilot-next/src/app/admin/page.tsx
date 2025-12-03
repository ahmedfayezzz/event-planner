"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatArabicDate } from "@/lib/utils";
import { Users, Calendar, CheckCircle, Clock, Plus } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading } = api.admin.getDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const stats = [
    {
      title: "إجمالي المستخدمين",
      value: dashboard.stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "إجمالي الجلسات",
      value: dashboard.stats.totalSessions,
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "إجمالي التسجيلات",
      value: dashboard.stats.totalRegistrations,
      icon: CheckCircle,
      color: "text-purple-600",
    },
    {
      title: "في انتظار الموافقة",
      value: dashboard.stats.pendingApprovals,
      icon: Clock,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground">
            نظرة عامة على منصة ثلوثية الأعمال
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/sessions/new">
            <Plus className="ml-2 h-4 w-4" />
            جلسة جديدة
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>الجلسات القادمة</CardTitle>
            <CardDescription>
              الجلسات المفتوحة للتسجيل
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.upcomingSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                لا توجد جلسات قادمة
              </p>
            ) : (
              <div className="space-y-4">
                {dashboard.upcomingSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/admin/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatArabicDate(new Date(session.date))}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {session.registrationCount} / {session.maxParticipants}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>أحدث التسجيلات</CardTitle>
            <CardDescription>
              آخر 10 تسجيلات في المنصة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.recentRegistrations.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                لا توجد تسجيلات بعد
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.recentRegistrations.slice(0, 5).map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{reg.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {reg.sessionTitle}
                      </p>
                    </div>
                    <Badge variant={reg.isApproved ? "default" : "secondary"}>
                      {reg.isApproved ? "مؤكد" : "معلق"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Stats */}
      {dashboard.attendanceStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>إحصائيات الحضور</CardTitle>
            <CardDescription>
              نسبة الحضور في آخر 5 جلسات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الجلسة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المسجلين</TableHead>
                  <TableHead>الحاضرين</TableHead>
                  <TableHead>نسبة الحضور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.attendanceStats.map((stat) => (
                  <TableRow key={stat.sessionId}>
                    <TableCell className="font-medium">{stat.title}</TableCell>
                    <TableCell>{formatArabicDate(new Date(stat.date))}</TableCell>
                    <TableCell>{stat.registrations}</TableCell>
                    <TableCell>{stat.attendees}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${stat.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{stat.attendanceRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
