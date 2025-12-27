"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatArabicDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Eye,
  Edit,
  Users,
  Calendar,
  Loader2,
  MoreHorizontal,
  QrCode,
  ChevronUp,
  ChevronDown,
  Globe,
  EyeOff,
  Archive,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

type VisibilityStatus = "inactive" | "active" | "archived";

interface SessionItem {
  id: string;
  sessionNumber: number;
  title: string;
  date: Date;
  status: string;
  visibilityStatus: VisibilityStatus;
  maxParticipants: number;
  registrationCount: number | null;
  _count: { registrations: number };
}

export default function AdminSessionsPage() {
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("upcoming");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityStatus | "all">("all");

  const utils = api.useUtils();
  const { isExpanded, toggleRow } = useExpandableRows();

  // Build query params based on filters
  const queryParams = {
    ...(visibilityFilter !== "all" ? { visibilityStatus: visibilityFilter } : {}),
    sortOrder: tab === "upcoming" ? "asc" as const : "desc" as const,
  };

  const { data, isLoading, isFetching } = api.session.listAdmin.useQuery(queryParams);

  // Filter sessions client-side based on tab
  const filteredSessions = data?.sessions.filter((session: SessionItem) => {
    const isPast = new Date(session.date) < new Date();
    if (tab === "upcoming") {
      // Show future sessions that are open
      return !isPast && session.status === "open";
    }
    if (tab === "completed") {
      // Show past sessions OR sessions with completed status
      return isPast || session.status === "completed";
    }
    return true;
  }) ?? [];

  const updateVisibilityMutation = api.session.updateVisibility.useMutation({
    onSuccess: (_, variables) => {
      const labels: Record<VisibilityStatus, string> = {
        inactive: "مسودة",
        active: "منشور",
        archived: "مؤرشف",
      };
      toast.success(`تم تغيير حالة النشر إلى "${labels[variables.visibilityStatus]}"`);
      utils.session.listAdmin.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث حالة النشر");
    },
  });

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

  const visibilityColors: Record<VisibilityStatus, string> = {
    inactive: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    active: "bg-blue-500/10 text-blue-600 border-blue-200",
    archived: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const visibilityLabels: Record<VisibilityStatus, string> = {
    inactive: "مسودة",
    active: "منشور",
    archived: "مؤرشف",
  };

  const visibilityIcons: Record<VisibilityStatus, React.ReactNode> = {
    inactive: <EyeOff className="h-3 w-3 ml-1" />,
    active: <Globe className="h-3 w-3 ml-1" />,
    archived: <Archive className="h-3 w-3 ml-1" />,
  };

  // Show inline loading when switching tabs
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأحداث</h1>
          <p className="text-muted-foreground">إدارة أحداث ثلوثية الأعمال</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/guests">
              <Users className="me-2 h-4 w-4" />
              الضيوف
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/sessions/new">
              <Plus className="me-2 h-4 w-4" />
              حدث جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">جميع الأحداث</TabsTrigger>
            <TabsTrigger value="upcoming">القادمة</TabsTrigger>
            <TabsTrigger value="completed">المنتهية</TabsTrigger>
          </TabsList>
          <Select
            value={visibilityFilter}
            onValueChange={(v) => setVisibilityFilter(v as VisibilityStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="حالة النشر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="inactive">مسودة</SelectItem>
              <SelectItem value="active">منشور</SelectItem>
              <SelectItem value="archived">مؤرشف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {tab === "all"
                  ? "جميع الأحداث"
                  : tab === "upcoming"
                  ? "الأحداث القادمة"
                  : "الأحداث المنتهية"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0" dir="rtl">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>لا توجد أحداث</p>
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
                        <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                        <TableHead className="hidden lg:table-cell">النشر</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="hidden md:table-cell">التسجيلات</TableHead>
                        <TableHead className="hidden md:table-cell">الإجراءات</TableHead>
                        <TableHead className="md:hidden w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session: SessionItem) => {
                        const expanded = isExpanded(session.id);
                        return (
                          <React.Fragment key={session.id}>
                            <TableRow>
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
                              <TableCell className="hidden md:table-cell">
                                {formatArabicDate(new Date(session.date))}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge
                                  variant="outline"
                                  className={cn("flex items-center w-fit", visibilityColors[session.visibilityStatus])}
                                >
                                  {visibilityIcons[session.visibilityStatus]}
                                  {visibilityLabels[session.visibilityStatus]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={statusColors[session.status]}
                                >
                                  {statusLabels[session.status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="font-medium">
                                  {session._count.registrations}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  / {session.maxParticipants}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/admin/sessions/${session.id}`}>
                                        <Eye className="ml-2 h-4 w-4" />
                                        عرض التفاصيل
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/admin/sessions/${session.id}/edit`}
                                      >
                                        <Edit className="ml-2 h-4 w-4" />
                                        تعديل
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/admin/sessions/${session.id}/attendees`}
                                      >
                                        <Users className="ml-2 h-4 w-4" />
                                        المسجلين
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/admin/checkin/${session.id}`}>
                                        <QrCode className="ml-2 h-4 w-4" />
                                        تسجيل الحضور
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/admin/sessions/new?duplicateFrom=${session.id}`}>
                                        <Copy className="ml-2 h-4 w-4" />
                                        نسخ الحدث
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {/* Visibility Status Actions */}
                                    {session.visibilityStatus !== "active" && (
                                      <DropdownMenuItem
                                        onClick={() => updateVisibilityMutation.mutate({ id: session.id, visibilityStatus: "active" })}
                                        disabled={updateVisibilityMutation.isPending}
                                      >
                                        <Globe className="ml-2 h-4 w-4 text-blue-600" />
                                        نشر الحدث
                                      </DropdownMenuItem>
                                    )}
                                    {session.visibilityStatus === "active" && (
                                      <DropdownMenuItem
                                        onClick={() => updateVisibilityMutation.mutate({ id: session.id, visibilityStatus: "inactive" })}
                                        disabled={updateVisibilityMutation.isPending}
                                      >
                                        <EyeOff className="ml-2 h-4 w-4 text-yellow-600" />
                                        إلغاء النشر
                                      </DropdownMenuItem>
                                    )}
                                    {session.visibilityStatus !== "archived" && (
                                      <DropdownMenuItem
                                        onClick={() => updateVisibilityMutation.mutate({ id: session.id, visibilityStatus: "archived" })}
                                        disabled={updateVisibilityMutation.isPending}
                                      >
                                        <Archive className="ml-2 h-4 w-4 text-gray-600" />
                                        أرشفة الحدث
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell className="md:hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleRow(session.id)}
                                >
                                  {expanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            <tr className="md:hidden">
                              <td colSpan={4} className="p-0">
                                <div
                                  className={cn(
                                    "grid transition-all duration-300 ease-in-out",
                                    expanded
                                      ? "grid-rows-[1fr] opacity-100"
                                      : "grid-rows-[0fr] opacity-0"
                                  )}
                                >
                                  <div className="overflow-hidden">
                                    <div className="p-4 bg-muted/30 border-b space-y-3">
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">التاريخ:</span>
                                          <span className="mr-1 font-medium">
                                            {formatArabicDate(new Date(session.date))}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">التسجيلات:</span>
                                          <span className="mr-1 font-medium">
                                            {session._count.registrations} / {session.maxParticipants}
                                          </span>
                                        </div>
                                        <div className="col-span-2">
                                          <span className="text-muted-foreground">النشر:</span>
                                          <Badge
                                            variant="outline"
                                            className={cn("mr-1 inline-flex items-center", visibilityColors[session.visibilityStatus])}
                                          >
                                            {visibilityIcons[session.visibilityStatus]}
                                            {visibilityLabels[session.visibilityStatus]}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href={`/admin/sessions/${session.id}`}>
                                            <Eye className="ml-1 h-3 w-3" />
                                            عرض
                                          </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href={`/admin/sessions/${session.id}/edit`}>
                                            <Edit className="ml-1 h-3 w-3" />
                                            تعديل
                                          </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href={`/admin/sessions/${session.id}/attendees`}>
                                            <Users className="ml-1 h-3 w-3" />
                                            المسجلين
                                          </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href={`/admin/checkin/${session.id}`}>
                                            <QrCode className="ml-1 h-3 w-3" />
                                            الحضور
                                          </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href={`/admin/sessions/new?duplicateFrom=${session.id}`}>
                                            <Copy className="ml-1 h-3 w-3" />
                                            نسخ
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
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
