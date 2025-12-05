"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Calendar, CheckCircle, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = api.admin.getAnalytics.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      title: "إجمالي المستخدمين",
      value: analytics.overview.totalUsers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "إجمالي الجلسات",
      value: analytics.overview.totalSessions,
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "إجمالي التسجيلات",
      value: analytics.overview.totalRegistrations,
      icon: CheckCircle,
      color: "text-purple-600",
    },
    {
      title: "متوسط نسبة الحضور",
      value: `${analytics.overview.avgAttendanceRate}%`,
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإحصائيات والتحليلات</h1>
        <p className="text-muted-foreground">
          نظرة شاملة على أداء المنصة
        </p>
      </div>

      {/* Overview Stats */}
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

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>اتجاه التسجيلات</CardTitle>
            <CardDescription>عدد التسجيلات خلال آخر 12 شهر</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.registrationTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.registrationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ direction: "rtl" }}
                    labelFormatter={(label) => `الشهر: ${label}`}
                    formatter={(value) => [`${value} تسجيل`, "التسجيلات"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: "#8884d8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Activity Type */}
        <Card>
          <CardHeader>
            <CardTitle>المستخدمين حسب نوع النشاط</CardTitle>
            <CardDescription>توزيع المستخدمين على أنواع الأنشطة</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.usersByActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.usersByActivity}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {analytics.usersByActivity.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} مستخدم`, "العدد"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Users by Gender */}
        <Card>
          <CardHeader>
            <CardTitle>المستخدمين حسب الجنس</CardTitle>
            <CardDescription>توزيع المستخدمين</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {analytics.usersByGender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.usersByGender}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.usersByGender.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? "#0088FE" : "#FF69B4"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} مستخدم`, "العدد"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر الشركات مشاركة</CardTitle>
            <CardDescription>أعلى 10 شركات من حيث عدد المستخدمين</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {analytics.topCompanies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topCompanies.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                  <Tooltip formatter={(value) => [`${value} مستخدم`, "العدد"]} />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>أداء الجلسات</CardTitle>
          <CardDescription>إحصائيات التسجيل والحضور لكل جلسة</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.sessionPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الجلسة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المسجلين</TableHead>
                  <TableHead>الحاضرين</TableHead>
                  <TableHead>نسبة الحضور</TableHead>
                  <TableHead>نسبة الامتلاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.sessionPerformance.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>{formatArabicDate(new Date(session.date))}</TableCell>
                    <TableCell>{session.registrations}</TableCell>
                    <TableCell>{session.attendees}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${session.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{session.attendanceRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${session.fillRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{session.fillRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد جلسات بعد
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Attendees Table */}
      <Card>
        <CardHeader>
          <CardTitle>أكثر الأعضاء حضوراً</CardTitle>
          <CardDescription>الأعضاء الأكثر التزاماً بالحضور</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topAttendees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الجلسات المحضورة</TableHead>
                  <TableHead>إجمالي التسجيلات</TableHead>
                  <TableHead>نسبة الحضور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topAttendees.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.company || "-"}</TableCell>
                    <TableCell>{user.sessionsAttended}</TableCell>
                    <TableCell>{user.totalRegistrations}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${user.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{user.attendanceRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد بيانات حضور بعد
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
