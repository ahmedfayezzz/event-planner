"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn, formatArabicDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageSquare,
  MoreVertical,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";

type SuggestionStatus = "pending" | "reviewed" | "implemented" | "dismissed";

const STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "قيد المراجعة",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    icon: Clock,
  },
  reviewed: {
    label: "تمت المراجعة",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    icon: Eye,
  },
  implemented: {
    label: "تم التنفيذ",
    color: "bg-green-500/10 text-green-600 border-green-200",
    icon: CheckCircle,
  },
  dismissed: {
    label: "مرفوض",
    color: "bg-red-500/10 text-red-600 border-red-200",
    icon: XCircle,
  },
};

export default function SuggestionsPage() {
  const [activeTab, setActiveTab] = useState<SuggestionStatus | "all">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isExpanded, toggleRow } = useExpandableRows();

  const statsQuery = api.suggestion.getStats.useQuery();
  const suggestionsQuery = api.suggestion.getAll.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
  });

  const updateStatusMutation = api.suggestion.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الاقتراح");
      suggestionsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteMutation = api.suggestion.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الاقتراح");
      setDeleteId(null);
      suggestionsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleStatusChange = (id: string, status: SuggestionStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الاقتراحات</h1>
        <p className="text-muted-foreground">
          عرض وإدارة اقتراحات المستخدمين لتحسين النظام
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإجمالي</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pending ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تمت المراجعة</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.reviewed ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم التنفيذ</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.implemented ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوض</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.dismissed ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SuggestionStatus | "all")}
      >
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="reviewed">تمت المراجعة</TabsTrigger>
          <TabsTrigger value="implemented">تم التنفيذ</TabsTrigger>
          <TabsTrigger value="dismissed">مرفوض</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Suggestions Table */}
      <Card>
        <CardContent className="p-0">
          {suggestionsQuery.isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد اقتراحات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead className="hidden md:table-cell">
                    الاقتراح
                  </TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden md:table-cell">
                    التاريخ
                  </TableHead>
                  <TableHead className="hidden md:table-cell"></TableHead>
                  <TableHead className="md:hidden w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => {
                  const statusConfig =
                    STATUS_CONFIG[suggestion.status as SuggestionStatus];
                  const StatusIcon = statusConfig.icon;
                  const expanded = isExpanded(suggestion.id);

                  return (
                    <React.Fragment key={suggestion.id}>
                      <TableRow>
                        <TableCell>
                          <div>
                            <Link
                              href={`/admin/users/${suggestion.user.id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {suggestion.user.name}
                            </Link>
                            <p className="text-sm text-muted-foreground hidden md:block">
                              {suggestion.user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs">
                          <p className="line-clamp-2">{suggestion.content}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatArabicDate(new Date(suggestion.createdAt))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(["pending", "reviewed", "implemented", "dismissed"] as SuggestionStatus[])
                                .filter((s) => s !== suggestion.status)
                                .map((status) => {
                                  const config = STATUS_CONFIG[status];
                                  const Icon = config.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() =>
                                        handleStatusChange(suggestion.id, status)
                                      }
                                    >
                                      <Icon className="me-2 h-4 w-4" />
                                      {config.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(suggestion.id)}
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="md:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(suggestion.id)}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Mobile expanded row */}
                      <tr className="md:hidden">
                        <td colSpan={3} className="p-0">
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
                                <div className="text-sm space-y-2">
                                  <div>
                                    <span className="text-muted-foreground">
                                      البريد:
                                    </span>
                                    <span className="mr-1" dir="ltr">
                                      {suggestion.user.email}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      التاريخ:
                                    </span>
                                    <span className="mr-1">
                                      {formatArabicDate(
                                        new Date(suggestion.createdAt)
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      الاقتراح:
                                    </span>
                                    <p className="mt-1 text-sm">
                                      {suggestion.content}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {(["pending", "reviewed", "implemented", "dismissed"] as SuggestionStatus[])
                                    .filter((s) => s !== suggestion.status)
                                    .map((status) => {
                                      const config = STATUS_CONFIG[status];
                                      const Icon = config.icon;
                                      return (
                                        <Button
                                          key={status}
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleStatusChange(
                                              suggestion.id,
                                              status
                                            )
                                          }
                                        >
                                          <Icon className="ml-1 h-3 w-3" />
                                          {config.label}
                                        </Button>
                                      );
                                    })}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => setDeleteId(suggestion.id)}
                                  >
                                    <Trash2 className="ml-1 h-3 w-3" />
                                    حذف
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الاقتراح</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الاقتراح؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
