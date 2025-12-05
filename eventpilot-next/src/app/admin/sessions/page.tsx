"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatArabicDate } from "@/lib/utils";
import { Plus, Eye, Edit, Users, Calendar, Loader2 } from "lucide-react";

interface SessionItem {
  id: string;
  sessionNumber: number;
  title: string;
  date: Date;
  status: string;
  maxParticipants: number;
  registrationCount: number;
}

export default function AdminSessionsPage() {
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("all");

  const { data, isLoading, isFetching } = api.session.list.useQuery(
    tab === "upcoming"
      ? { upcoming: true }
      : tab === "completed"
        ? { status: "completed" }
        : undefined
  );

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-600 border-green-200",
    closed: "bg-red-500/10 text-red-600 border-red-200",
    completed: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const statusLabels: Record<string, string> = {
    open: "مفتوح",
    closed: "مغلق",
    completed: "منتهي",
  };

  // Show inline loading when switching tabs
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الجلسات</h1>
          <p className="text-muted-foreground">إدارة جلسات ثلوثية الأعمال</p>
        </div>
        <Button asChild>
          <Link href="/admin/sessions/new">
            <Plus className="me-2 h-4 w-4" />
            جلسة جديدة
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">جميع الجلسات</TabsTrigger>
          <TabsTrigger value="upcoming">القادمة</TabsTrigger>
          <TabsTrigger value="completed">المنتهية</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {tab === "all"
                  ? "جميع الجلسات"
                  : tab === "upcoming"
                    ? "الجلسات القادمة"
                    : "الجلسات المنتهية"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0" dir="rtl">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data || data.sessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>لا توجد جلسات</p>
                </div>
              ) : (
                <>
                  {/* Inline loading indicator */}
                  {showInlineLoading && (
                    <div className="flex items-center justify-center gap-2 py-2 bg-muted/50 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحميل...
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التسجيلات</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sessions.map((session: SessionItem) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {session.sessionNumber}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/sessions/${session.id}`}
                              className="hover:underline"
                            >
                              {session.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatArabicDate(new Date(session.date))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[session.status]}
                            >
                              {statusLabels[session.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {session.registrationCount}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / {session.maxParticipants}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/session/${session.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/sessions/${session.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <Link
                                  href={`/admin/sessions/${session.id}/attendees`}
                                >
                                  <Users className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
