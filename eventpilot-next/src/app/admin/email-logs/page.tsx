"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import {
  Search,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 50;

const EMAIL_TYPES = [
  { value: "confirmation", label: "تأكيد" },
  { value: "pending", label: "قيد الانتظار" },
  { value: "companion", label: "مرافق" },
  { value: "welcome", label: "ترحيب" },
  { value: "password_reset", label: "إعادة تعيين كلمة المرور" },
  { value: "invitation", label: "دعوة" },
  { value: "bulk", label: "رسالة جماعية" },
  { value: "valet_parked", label: "ركن السيارة" },
  { value: "valet_ready", label: "السيارة جاهزة" },
  { value: "valet_broadcast", label: "إعلان الفاليه" },
];

export default function EmailLogsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cleanupDays, setCleanupDays] = useState("30");
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch stats
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = api.email.getStats.useQuery(
    undefined,
    { enabled: isSuperAdmin }
  );

  // Fetch logs with cursor pagination
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.email.getLogs.useInfiniteQuery(
    {
      status: statusFilter !== "all" ? (statusFilter as "pending" | "sent" | "failed") : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: isSuperAdmin,
    }
  );

  const allLogs = data?.pages.flatMap((page) => page.logs) ?? [];

  // Mark for retry mutation
  const markForRetryMutation = api.email.markForRetry.useMutation({
    onSuccess: () => {
      toast.success("تم تحديد البريد لإعادة المحاولة");
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Cleanup mutation
  const cleanupMutation = api.email.cleanup.useMutation({
    onSuccess: (data) => {
      toast.success(`تم حذف ${data.deleted} سجل`);
      refetch();
      refetchStats();
      setCleanupDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleCleanup = () => {
    cleanupMutation.mutate({
      olderThanDays: parseInt(cleanupDays),
      status: "all",
    });
  };

  // Check session loading
  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check authorization
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">غير مصرح</h1>
        <p className="text-muted-foreground">هذه الصفحة متاحة للمدراء العامين فقط</p>
      </div>
    );
  }

  const showTableSkeleton = isLoading && allLogs.length === 0;
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سجل البريد الإلكتروني</h1>
          <p className="text-muted-foreground">عرض جميع رسائل البريد المرسلة</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setCleanupDialogOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="me-2 h-4 w-4" />
          تنظيف السجلات
        </Button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإجمالي</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مرسل</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">فاشل</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالبريد أو العنوان..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="sent">مرسل</SelectItem>
                <SelectItem value="failed">فاشل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع البريد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {EMAIL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {showTableSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : allLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد سجلات</p>
            </div>
          ) : (
            <>
              {showInlineLoading && (
                <div className="flex items-center justify-center gap-2 py-2 bg-muted/50 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحميل...
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستلم</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">تاريخ الإنشاء</TableHead>
                    <TableHead className="hidden md:table-cell">تاريخ الإرسال</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="font-mono text-sm" dir="ltr">
                          {log.to}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EMAIL_TYPES.find((t) => t.value === log.type)?.label || log.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.status === "sent"
                              ? "bg-green-500/10 text-green-600 border-green-200"
                              : log.status === "failed"
                              ? "bg-red-500/10 text-red-600 border-red-200"
                              : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                          }
                        >
                          {log.status === "sent" && "مرسل"}
                          {log.status === "failed" && "فاشل"}
                          {log.status === "pending" && "قيد الانتظار"}
                        </Badge>
                        {log.errorMessage && (
                          <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={log.errorMessage}>
                            {log.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatArabicDate(new Date(log.createdAt))}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {log.sentAt ? formatArabicDate(new Date(log.sentAt)) : "-"}
                      </TableCell>
                      <TableCell>
                        {log.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markForRetryMutation.mutate({ logId: log.id })}
                            disabled={markForRetryMutation.isPending}
                            title="إعادة المحاولة"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="p-4 text-center border-t">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="me-2 h-4 w-4" />
                    )}
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تنظيف سجلات البريد</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف جميع سجلات البريد الأقدم من عدد الأيام المحدد. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm">حذف السجلات الأقدم من</span>
              <Input
                type="number"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="w-20"
                min="1"
                max="365"
              />
              <span className="text-sm">يوم</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cleanupMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
