"use client";

import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  UserPlus,
  Clock,
  UtensilsCrossed,
  UsersRound,
} from "lucide-react";
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

const COLORS = [
  "#166534",
  "#D4A853",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

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
        <p className="text-muted-foreground">نظرة شاملة على أداء المنصة</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NEW: Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الاحتفاظ</CardTitle>
            <UserPlus className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.retention?.retentionRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.retention?.returningUsers ?? 0} عضو عائد من{" "}
              {analytics.retention?.totalActiveUsers ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المضيفين</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.hosting?.totalHosts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">متطوع للضيافة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المرافقين</CardTitle>
            <UsersRound className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.companions?.totalCompanions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              معدل {analytics.companions?.avgPerRegistration ?? 0} لكل تسجيل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التسجيل المبكر</CardTitle>
            <Clock className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.registrationTiming
                ? Math.round(
                    ((analytics.registrationTiming.find(
                      (t) => t.label === "أكثر من أسبوع"
                    )?.value ?? 0) /
                      analytics.registrationTiming.reduce(
                        (sum, t) => sum + t.value,
                        0
                      )) *
                      100
                  ) || 0
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              يسجلون قبل أسبوع أو أكثر
            </p>
          </CardContent>
        </Card>
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
                    stroke="#166534"
                    strokeWidth={2}
                    dot={{ fill: "#166534" }}
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

        {/* NEW: Registration Timing */}
        <Card>
          <CardHeader>
            <CardTitle>توقيت التسجيل</CardTitle>
            <CardDescription>متى يسجل الأعضاء قبل الجلسة</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.registrationTiming &&
            analytics.registrationTiming.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.registrationTiming}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ direction: "rtl" }}
                    formatter={(value) => [`${value} تسجيل`, "العدد"]}
                  />
                  <Bar dataKey="value" fill="#D4A853" radius={[4, 4, 0, 0]} />
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

      {/* Charts Row 2: New vs Returning & Hosting */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* NEW: New vs Returning Members */}
        <Card>
          <CardHeader>
            <CardTitle>الأعضاء الجدد مقابل العائدين</CardTitle>
            <CardDescription>
              توزيع الحضور في آخر 10 جلسات
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.retention?.newVsReturning &&
            analytics.retention.newVsReturning.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.retention.newVsReturning}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sessionTitle"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ direction: "rtl" }} />
                  <Legend />
                  <Bar
                    dataKey="newMembers"
                    name="جدد"
                    fill="#166534"
                    stackId="a"
                  />
                  <Bar
                    dataKey="returning"
                    name="عائدون"
                    fill="#D4A853"
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات كافية
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEW: Hosting Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>أنواع الضيافة المتطوع لها</CardTitle>
            <CardDescription>توزيع المضيفين حسب نوع الضيافة</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.hosting?.breakdown &&
            analytics.hosting.breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.hosting.breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="label"
                    label={({ label, percent }) =>
                      `${label} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {analytics.hosting.breakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} مضيف`, "العدد"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا يوجد مضيفين بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 md:grid-cols-2">
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

        {/* NEW: User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>نمو المستخدمين</CardTitle>
            <CardDescription>الأعضاء الجدد شهرياً (آخر 6 أشهر)</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.growthMetrics && analytics.growthMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.growthMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ direction: "rtl" }}
                    labelFormatter={(label) => `الشهر: ${label}`}
                    formatter={(value, name) => [
                      name === "newUsers"
                        ? `${value} عضو جديد`
                        : `${value}% نمو`,
                      name === "newUsers" ? "الأعضاء الجدد" : "نسبة النمو",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="أعضاء جدد"
                    stroke="#166534"
                    strokeWidth={2}
                    dot={{ fill: "#166534" }}
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
      </div>

      {/* Charts Row 4 */}
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
                        fill={index === 0 ? "#166534" : "#D4A853"}
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
            <CardDescription>
              أعلى 5 شركات من حيث عدد المستخدمين
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {analytics.topCompanies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.topCompanies.slice(0, 5)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                  <Tooltip formatter={(value) => [`${value} مستخدم`, "العدد"]} />
                  <Bar dataKey="count" fill="#166534" radius={[0, 4, 4, 0]} />
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
          <CardDescription>
            إحصائيات التسجيل والحضور لكل جلسة
          </CardDescription>
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
                    <TableCell>
                      {formatArabicDate(new Date(session.date))}
                    </TableCell>
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
