"use client";

import React, { use, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  formatArabicDate,
  formatArabicTime,
  formatArabicDateTime,
  getWhatsAppUrl,
} from "@/lib/utils";
import { normalizeArabic } from "@/lib/search";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Search,
  Check,
  Download,
  Users,
  CheckCheck,
  Loader2,
  UserPlus,
  MessageCircle,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Calendar,
  User,
  Building2,
  Briefcase,
  Tag,
  UserMinus,
  Undo2,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface RegistrationItem {
  id: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  position?: string | null;
  labels?: Array<{ id: string; name: string; color: string }>;
  isGuest: boolean;
  isApproved: boolean;
  isRejected?: boolean;
  isNotComing?: boolean;
  notComingReason?: string | null;
  registeredAt: Date;
  isInvited?: boolean;
  invitedByName?: string | null;
  companionCount?: number;
  isManual?: boolean;
  // Admin tracking (super admin only)
  approvedByName?: string | null;
  approvedAt?: Date | null;
  rejectedByName?: string | null;
  rejectedAt?: Date | null;
  markedNotComingByName?: string | null;
  markedNotComingAt?: Date | null;
}

type FilterType = "all" | "direct" | "invited";
type StatusFilterType = "all" | "coming" | "notcoming" | "pending" | "rejected";
type TagFilterType = "all" | string;

export default function SessionAttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [tagFilter, setTagFilter] = useState<TagFilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isExpanded, toggleRow } = useExpandableRows();
  const [confirmAction, setConfirmAction] = useState<{
    type: "approveAll" | "approveSelected" | "approve" | "reject" | "markNotComing" | "cancelRejection";
    count?: number;
    registrationId?: string;
    name?: string;
    reason?: string;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { data: sessionData } = useSession();
  const isSuperAdmin = sessionData?.user?.role === "SUPER_ADMIN";

  const { data: session, isLoading: sessionLoading } =
    api.session.getAdminDetails.useQuery({ id });
  const {
    data: registrations,
    isLoading: registrationsLoading,
    isFetching,
    refetch,
  } = api.registration.getSessionRegistrations.useQuery(
    { sessionId: id, includeInvited: true },
    { enabled: !!id }
  );
  const { data: allLabels } = api.label.getAll.useQuery();

  const approveMutation = api.registration.approve.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد التسجيل");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const approveAllMutation = api.registration.approveAll.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تأكيد ${data.approvedCount} تسجيل`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const approveSelectedMutation = api.registration.approveMultiple.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تأكيد ${data.approvedCount} تسجيل`);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const rejectMutation = api.registration.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض التسجيل");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const markNotComingMutation = api.registration.markNotComing.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين المسجل كـ 'لن يحضر'");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const revertNotComingMutation = api.registration.revertNotComing.useMutation({
    onSuccess: () => {
      toast.success("تم إرجاع المسجل إلى 'سيحضر'");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const cancelRejectionMutation = api.registration.cancelRejection.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الرفض بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إلغاء الرفض");
    },
  });

  const { refetch: fetchCsv } = api.admin.exportSessionRegistrations.useQuery(
    { sessionId: id },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendees-${session?.sessionNumber || id}.csv`;
      link.click();
      toast.success("تم تصدير البيانات");
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(
        new Set(filteredRegistrations.map((r: RegistrationItem) => r.id))
      );
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (regId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(regId);
    } else {
      newSelected.delete(regId);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Filter registrations by search, type, status, and tag
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];

    let filtered = registrations;

    // Filter by type
    if (filter === "direct") {
      filtered = filtered.filter((reg: RegistrationItem) => !reg.isInvited);
    } else if (filter === "invited") {
      filtered = filtered.filter((reg: RegistrationItem) => reg.isInvited);
    }

    // Filter by status
    if (statusFilter === "all") {
      // "All" shows expected attendees only (excludes not coming and rejected)
      filtered = filtered.filter((reg: RegistrationItem) => !reg.isNotComing && !reg.isRejected);
    } else if (statusFilter === "coming") {
      filtered = filtered.filter((reg: RegistrationItem) => reg.isApproved && !reg.isNotComing);
    } else if (statusFilter === "notcoming") {
      filtered = filtered.filter((reg: RegistrationItem) => reg.isNotComing);
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((reg: RegistrationItem) => !reg.isApproved && !reg.isRejected);
    } else if (statusFilter === "rejected") {
      filtered = filtered.filter((reg: RegistrationItem) => reg.isRejected);
    }

    // Filter by tag
    if (tagFilter !== "all") {
      filtered = filtered.filter((reg: RegistrationItem) =>
        reg.labels?.some((label) => label.id === tagFilter)
      );
    }

    // Filter by search (with Arabic normalization)
    if (debouncedSearch.trim()) {
      const normalizedSearch = normalizeArabic(debouncedSearch);
      filtered = filtered.filter(
        (reg: RegistrationItem) =>
          normalizeArabic(reg.name || "").includes(normalizedSearch) ||
          normalizeArabic(reg.email || "").includes(normalizedSearch) ||
          normalizeArabic(reg.phone || "").includes(normalizedSearch) ||
          normalizeArabic(reg.invitedByName || "").includes(normalizedSearch)
      );
    }

    return filtered;
  }, [registrations, debouncedSearch, filter, statusFilter, tagFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!registrations)
      return { total: 0, expectedAttendees: 0, direct: 0, invited: 0, coming: 0, notComing: 0, pending: 0, rejected: 0 };

    const direct = registrations.filter(
      (r: RegistrationItem) => !r.isInvited
    ).length;
    const invited = registrations.filter(
      (r: RegistrationItem) => r.isInvited
    ).length;
    const coming = registrations.filter((r: RegistrationItem) => r.isApproved && !r.isNotComing).length;
    const notComing = registrations.filter((r: RegistrationItem) => r.isNotComing).length;
    const pending = registrations.filter((r: RegistrationItem) => !r.isApproved && !r.isRejected).length;
    const rejected = registrations.filter((r: RegistrationItem) => r.isRejected).length;

    return {
      total: registrations.length,
      // Expected attendees = confirmed coming only (excludes pending, not coming, and rejected)
      expectedAttendees: coming,
      direct,
      invited,
      coming,
      notComing,
      pending,
      rejected,
    };
  }, [registrations]);

  // Get selected registrations data
  const selectedRegistrations = useMemo(() => {
    return filteredRegistrations.filter((r: RegistrationItem) =>
      selectedIds.has(r.id)
    );
  }, [filteredRegistrations, selectedIds]);

  // Get pending selected registrations (for approve action)
  const pendingSelectedCount = selectedRegistrations.filter(
    (r: RegistrationItem) => !r.isApproved && !r.isRejected
  ).length;

  // Check if all filtered items are selected
  const isAllSelected =
    filteredRegistrations.length > 0 &&
    filteredRegistrations.every((r: RegistrationItem) => selectedIds.has(r.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  // Handle WhatsApp message for single registration
  const handleSendWhatsApp = (reg: RegistrationItem) => {
    if (!reg.phone) {
      toast.error("لا يوجد رقم هاتف");
      return;
    }

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const qrPageUrl = `${baseUrl}/qr/${reg.id}`;

    const message = `السلام عليكم
${reg.name || ""}،

نتشرف بحضوركم لحدث "${session?.title}"
التاريخ: ${session ? formatArabicDate(new Date(session.date)) : ""}
المكان: ${session?.location || "سيتم تحديده"}

رمز الحضور (QR):
${qrPageUrl}

نتشرف بحضوركم.

ثلوثية الأعمال`;

    const url = getWhatsAppUrl(reg.phone, message);
    window.open(url, "_blank");
  };

  // Handle bulk WhatsApp - opens first selected with phone
  const handleBulkWhatsApp = () => {
    const withPhone = selectedRegistrations.filter(
      (r: RegistrationItem) => r.phone
    );
    if (withPhone.length === 0) {
      toast.error("لا يوجد أرقام هاتف للمحددين");
      return;
    }

    // Open WhatsApp for the first person with a phone number
    // Note: WhatsApp API doesn't support bulk messaging, so we open one at a time
    handleSendWhatsApp(withPhone[0]);

    if (withPhone.length > 1) {
      toast.info(`تم فتح واتساب للأول. المتبقي: ${withPhone.length - 1} شخص`);
    }
  };

  // Export selected as CSV
  const handleExportSelected = () => {
    if (selectedRegistrations.length === 0) {
      toast.error("لم يتم تحديد أي مسجلين");
      return;
    }

    const headers = [
      "الاسم",
      "البريد",
      "الهاتف",
      "الشركة",
      "المنصب",
      "النوع",
      "الحالة",
      "تاريخ التسجيل",
    ];
    const rows = selectedRegistrations.map((r: RegistrationItem) => [
      r.name || "",
      r.email || "",
      r.phone || "",
      r.companyName || "",
      r.position || "",
      r.isInvited ? "مرافق" : r.isGuest ? "زائر" : "عضو",
      r.isRejected ? "مرفوض" : r.isApproved ? "مؤكد" : "معلق",
      formatArabicDateTime(new Date(r.registeredAt)),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `selected-attendees-${session?.sessionNumber || id}.csv`;
    link.click();
    toast.success(`تم تصدير ${selectedRegistrations.length} مسجل`);
  };

  // Show inline loading when refetching
  const showInlineLoading = isFetching && !registrationsLoading;

  // Handle confirmed action
  const handleConfirmedAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "approveAll") {
      approveAllMutation.mutate({ sessionId: id });
    } else if (confirmAction.type === "approveSelected") {
      const pendingIds = selectedRegistrations
        .filter((r: RegistrationItem) => !r.isApproved)
        .map((r: RegistrationItem) => r.id);
      approveSelectedMutation.mutate({ registrationIds: pendingIds });
    } else if (confirmAction.type === "approve" && confirmAction.registrationId) {
      approveMutation.mutate({ registrationId: confirmAction.registrationId });
    } else if (confirmAction.type === "reject" && confirmAction.registrationId) {
      rejectMutation.mutate({
        registrationId: confirmAction.registrationId,
        reason: confirmAction.reason || undefined
      });
    } else if (confirmAction.type === "markNotComing" && confirmAction.registrationId) {
      markNotComingMutation.mutate({
        registrationId: confirmAction.registrationId,
        reason: confirmAction.reason || undefined
      });
    } else if (confirmAction.type === "cancelRejection" && confirmAction.registrationId) {
      cancelRejectionMutation.mutate({
        registrationId: confirmAction.registrationId,
      });
    }
    setConfirmAction(null);
  };

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">المسجلين</h1>
            <p className="text-muted-foreground">
              {session.title} - {formatArabicDate(new Date(session.date))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <Button
              variant="outline"
              onClick={() =>
                setConfirmAction({ type: "approveAll", count: stats.pending })
              }
              disabled={approveAllMutation.isPending}
            >
              <CheckCheck className="me-2 h-4 w-4" />
              تأكيد الكل ({stats.pending})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="me-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              المتوقع حضورهم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.expectedAttendees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.coming} مؤكد + {stats.pending} معلق
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              المسجلين مباشرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.direct} / {session.maxParticipants}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المرافقين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.invited}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">لن يحضر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.notComing}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilterType)}
          className="w-fit"
        >
          <TabsList>
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="coming">سيحضر ({stats.coming})</TabsTrigger>
            <TabsTrigger value="notcoming">لن يحضر ({stats.notComing})</TabsTrigger>
            <TabsTrigger value="pending">معلق ({stats.pending})</TabsTrigger>
            <TabsTrigger value="rejected">مرفوض ({stats.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="نوع التسجيل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="direct">مباشر ({stats.direct})</SelectItem>
            <SelectItem value="invited">مرافقين ({stats.invited})</SelectItem>
          </SelectContent>
        </Select>
        {allLabels && allLabels.length > 0 && (
          <Select
            value={tagFilter}
            onValueChange={(v) => setTagFilter(v as TagFilterType)}
          >
            <SelectTrigger className="w-44">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <SelectValue placeholder="التصنيف" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {allLabels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-10"
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedIds.size} محدد
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 me-1" />
                  إلغاء التحديد
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {pendingSelectedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfirmAction({
                        type: "approveSelected",
                        count: pendingSelectedCount,
                      })
                    }
                    disabled={approveSelectedMutation.isPending}
                  >
                    {approveSelectedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 me-1 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4 me-1" />
                    )}
                    تأكيد ({pendingSelectedCount})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 me-1" />
                  واتساب
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <Download className="h-4 w-4 me-1" />
                  تصدير المحدد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {registrationsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{search ? "لا توجد نتائج مطابقة" : "لا يوجد مسجلين"}</p>
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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as unknown as HTMLInputElement).indeterminate =
                              isSomeSelected;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                        aria-label="تحديد الكل"
                      />
                    </TableHead>
                    <TableHead className="max-w-[140px]">الاسم</TableHead>
                    <TableHead className="hidden md:table-cell max-w-[180px]">
                      التواصل
                    </TableHead>
                    <TableHead className="hidden lg:table-cell max-w-[140px]">
                      الشركة
                    </TableHead>
                    <TableHead className="hidden lg:table-cell max-w-[120px]">
                      التصنيفات
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-[80px]">
                      النوع
                    </TableHead>
                    {filter !== "invited" && (
                      <TableHead className="hidden lg:table-cell w-[70px]">
                        المرافقين
                      </TableHead>
                    )}
                    {filter !== "direct" && (
                      <TableHead className="hidden lg:table-cell max-w-[120px]">
                        مدعو من
                      </TableHead>
                    )}
                    <TableHead className="w-[90px]">الحالة</TableHead>
                    <TableHead className="hidden md:table-cell w-[100px]">
                      تاريخ التسجيل
                    </TableHead>
                    <TableHead className="hidden md:table-cell w-[100px]">
                      الإجراءات
                    </TableHead>
                    {/* Mobile expand button */}
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg: RegistrationItem) => {
                    const expanded = isExpanded(reg.id);
                    return (
                      <React.Fragment key={reg.id}>
                        <TableRow
                          className={cn(
                            selectedIds.has(reg.id) && "bg-primary/5",
                            expanded && "md:border-b border-b-0"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(reg.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOne(reg.id, checked as boolean)
                              }
                              aria-label={`تحديد ${reg.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[140px]">
                            <div className="truncate">
                              {reg.userId ? (
                                <Link
                                  href={`/admin/users/${reg.userId}`}
                                  className="text-primary hover:underline"
                                  title={reg.name || undefined}
                                >
                                  {reg.name}
                                </Link>
                              ) : (
                                <span title={reg.name || undefined}>{reg.name}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[180px]">
                            <div className="text-sm space-y-0.5">
                              {reg.email && (
                                <div className="truncate text-xs" title={reg.email}>
                                  {reg.email}
                                </div>
                              )}
                              {reg.phone && (
                                <div
                                  className="text-muted-foreground text-xs"
                                  dir="ltr"
                                >
                                  {reg.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[140px]">
                            <div className="space-y-0.5">
                              <p className="truncate text-sm" title={reg.companyName || undefined}>
                                {reg.companyName || "-"}
                              </p>
                              {reg.position && (
                                <p className="text-xs text-muted-foreground truncate" title={reg.position}>
                                  {reg.position}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[120px]">
                            {reg.labels && reg.labels.length > 0 ? (
                              <div className="flex flex-wrap gap-0.5">
                                {reg.labels.slice(0, 2).map((label) => (
                                  <Badge
                                    key={label.id}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                    style={{
                                      backgroundColor: label.color + "20",
                                      color: label.color,
                                      borderColor: label.color + "40",
                                    }}
                                  >
                                    {label.name}
                                  </Badge>
                                ))}
                                {reg.labels.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{reg.labels.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell w-[80px]">
                            <div className="flex flex-col gap-0.5">
                              {reg.isInvited ? (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0 w-fit"
                                >
                                  مرافق
                                </Badge>
                              ) : (
                                <Badge
                                  variant={reg.isGuest ? "secondary" : "default"}
                                  className="text-[10px] px-1.5 py-0 w-fit"
                                >
                                  {reg.isGuest ? "زائر" : "عضو"}
                                </Badge>
                              )}
                              {reg.isManual && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 w-fit"
                                >
                                  يدوي
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {filter !== "invited" && (
                            <TableCell className="hidden lg:table-cell w-[70px] text-center text-sm">
                              {reg.companionCount || 0}
                            </TableCell>
                          )}
                          {filter !== "direct" && (
                            <TableCell className="hidden lg:table-cell max-w-[120px] text-muted-foreground">
                              <span className="truncate block text-sm" title={reg.invitedByName || undefined}>
                                {reg.invitedByName || "-"}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="w-[90px]">
                            <Badge
                              variant={reg.isApproved ? "default" : "outline"}
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                reg.isNotComing
                                  ? "bg-gray-500/10 text-gray-600 border-gray-200"
                                  : reg.isRejected
                                  ? "bg-red-500/10 text-red-600 border-red-200"
                                  : reg.isApproved
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : "bg-orange-500/10 text-orange-600 border-orange-200"
                              )}
                            >
                              {reg.isNotComing ? "لن يحضر" : reg.isRejected ? "مرفوض" : reg.isApproved ? "سيحضر" : "معلق"}
                            </Badge>
                            {isSuperAdmin && (reg.approvedByName || reg.rejectedByName || reg.markedNotComingByName) && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[80px]" title={
                                reg.approvedByName ? `أكده: ${reg.approvedByName}` :
                                reg.rejectedByName ? `رفضه: ${reg.rejectedByName}` :
                                reg.markedNotComingByName ? `عيّنه: ${reg.markedNotComingByName}` : undefined
                              }>
                                {reg.approvedByName && `أكده: ${reg.approvedByName}`}
                                {reg.rejectedByName && `رفضه: ${reg.rejectedByName}`}
                                {reg.markedNotComingByName && `عيّنه: ${reg.markedNotComingByName}`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground w-[100px]">
                            <div className="text-xs">
                              {formatArabicDate(new Date(reg.registeredAt))}
                            </div>
                            <div className="text-[10px]">
                              {formatArabicTime(new Date(reg.registeredAt))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell w-[100px]">
                            <div className="flex items-center gap-0.5">
                              {!reg.isApproved && !reg.isRejected && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "approve",
                                        registrationId: reg.id,
                                        name: reg.name || undefined,
                                      })
                                    }
                                    disabled={approveMutation.isPending}
                                    title="تأكيد التسجيل"
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "reject",
                                        registrationId: reg.id,
                                        name: reg.name || undefined,
                                      })
                                    }
                                    disabled={rejectMutation.isPending}
                                    title="رفض التسجيل"
                                  >
                                    <X className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </>
                              )}
                              {reg.isApproved && !reg.isNotComing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "markNotComing",
                                      registrationId: reg.id,
                                      name: reg.name || undefined,
                                    })
                                  }
                                  disabled={markNotComingMutation.isPending}
                                  title="تعيين كـ لن يحضر"
                                >
                                  <UserMinus className="h-3.5 w-3.5 text-gray-600" />
                                </Button>
                              )}
                              {reg.isNotComing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    revertNotComingMutation.mutate({ registrationId: reg.id })
                                  }
                                  disabled={revertNotComingMutation.isPending}
                                  title="إرجاع إلى سيحضر"
                                >
                                  <Undo2 className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              )}
                              {reg.isRejected && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "cancelRejection",
                                      registrationId: reg.id,
                                      name: reg.name || undefined,
                                    })
                                  }
                                  disabled={cancelRejectionMutation.isPending}
                                  title="إلغاء الرفض"
                                >
                                  <Undo2 className="h-3.5 w-3.5 text-orange-600" />
                                </Button>
                              )}
                              {reg.phone && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleSendWhatsApp(reg)}
                                  title="إرسال رسالة واتساب"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {/* Mobile expand button */}
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(reg.id)}
                            >
                              {expanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Mobile expanded content */}
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
                                <div className="p-4 bg-muted/30 border-b">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="truncate">
                                        {reg.email || "-"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span dir="ltr">{reg.phone || "-"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {reg.isInvited ? (
                                          <Badge
                                            variant="outline"
                                            className="bg-purple-500/10 text-purple-600 border-purple-200"
                                          >
                                            <UserPlus className="me-1 h-3 w-3" />
                                            مرافق
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant={
                                              reg.isGuest
                                                ? "secondary"
                                                : "default"
                                            }
                                          >
                                            {reg.isGuest ? "زائر" : "عضو"}
                                          </Badge>
                                        )}
                                        {reg.isManual && (
                                          <Badge
                                            variant="outline"
                                            className="bg-blue-500/10 text-blue-600 border-blue-200"
                                          >
                                            يدوي
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span>
                                        {formatArabicDate(
                                          new Date(reg.registeredAt)
                                        )}{" "}
                                        -{" "}
                                        {formatArabicTime(
                                          new Date(reg.registeredAt)
                                        )}
                                      </span>
                                    </div>
                                    {reg.companyName && (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{reg.companyName}</span>
                                      </div>
                                    )}
                                    {reg.position && (
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{reg.position}</span>
                                      </div>
                                    )}
                                    {reg.labels && reg.labels.length > 0 && (
                                      <div className="flex items-center gap-2 col-span-2">
                                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex flex-wrap gap-1">
                                          {reg.labels.map((label) => (
                                            <Badge
                                              key={label.id}
                                              variant="outline"
                                              className="text-xs"
                                              style={{
                                                backgroundColor:
                                                  label.color + "20",
                                                color: label.color,
                                                borderColor: label.color + "40",
                                              }}
                                            >
                                              {label.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {!reg.isInvited && (
                                      <div className="flex items-center gap-2 col-span-2">
                                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>
                                          المرافقين: {reg.companionCount || 0}
                                        </span>
                                      </div>
                                    )}
                                    {reg.isInvited && reg.invitedByName && (
                                      <div className="flex items-center gap-2 col-span-2">
                                        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>
                                          مدعو من: {reg.invitedByName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Actions */}
                                  <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
                                    {!reg.isApproved && !reg.isRejected && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setConfirmAction({
                                              type: "approve",
                                              registrationId: reg.id,
                                              name: reg.name || undefined,
                                            })
                                          }
                                          disabled={approveMutation.isPending}
                                        >
                                          <Check className="me-2 h-4 w-4" />
                                          تأكيد
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setConfirmAction({
                                              type: "reject",
                                              registrationId: reg.id,
                                              name: reg.name || undefined,
                                            })
                                          }
                                          disabled={rejectMutation.isPending}
                                          className="text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <X className="me-2 h-4 w-4" />
                                          رفض
                                        </Button>
                                      </>
                                    )}
                                    {reg.isRejected && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setConfirmAction({
                                            type: "cancelRejection",
                                            registrationId: reg.id,
                                            name: reg.name || undefined,
                                          })
                                        }
                                        disabled={cancelRejectionMutation.isPending}
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                      >
                                        <Undo2 className="me-2 h-4 w-4" />
                                        إلغاء الرفض
                                      </Button>
                                    )}
                                    {reg.phone && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSendWhatsApp(reg)}
                                      >
                                        <MessageCircle className="me-2 h-4 w-4" />
                                        واتساب
                                      </Button>
                                    )}
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "reject"
                ? "رفض التسجيل"
                : confirmAction?.type === "markNotComing"
                ? "تعيين كـ لن يحضر"
                : confirmAction?.type === "cancelRejection"
                ? "إلغاء الرفض"
                : "تأكيد التسجيل"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approveAll" &&
                `هل أنت متأكد من تأكيد ${confirmAction.count} تسجيل معلق؟`}
              {confirmAction?.type === "approveSelected" &&
                `هل أنت متأكد من تأكيد ${confirmAction?.count} تسجيل محدد؟`}
              {confirmAction?.type === "approve" &&
                `هل أنت متأكد من تأكيد تسجيل ${confirmAction?.name || "هذا المستخدم"}؟`}
              {confirmAction?.type === "reject" &&
                `هل أنت متأكد من رفض تسجيل ${confirmAction?.name || "هذا المستخدم"}؟ سيتم إرسال إشعار بالرفض.`}
              {confirmAction?.type === "markNotComing" &&
                `هل أنت متأكد من تعيين ${confirmAction?.name || "هذا المستخدم"} كـ "لن يحضر"؟`}
              {confirmAction?.type === "cancelRejection" &&
                `هل أنت متأكد من إلغاء رفض تسجيل ${confirmAction?.name || "هذا المستخدم"}؟ سيعود التسجيل إلى حالة الانتظار.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(confirmAction?.type === "reject" || confirmAction?.type === "markNotComing") && (
            <div className="py-2">
              <label className="text-sm text-muted-foreground mb-2 block">
                {confirmAction?.type === "reject" ? "سبب الرفض (اختياري)" : "سبب عدم الحضور (اختياري)"}
              </label>
              <Textarea
                placeholder={confirmAction?.type === "reject" ? "أدخل سبب الرفض إن وجد..." : "أدخل سبب عدم الحضور إن وجد..."}
                value={confirmAction?.reason || ""}
                onChange={(e) =>
                  setConfirmAction((prev) =>
                    prev ? { ...prev, reason: e.target.value } : null
                  )
                }
                className="resize-none"
                rows={3}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : confirmAction?.type === "markNotComing"
                  ? "bg-gray-600 hover:bg-gray-700"
                  : confirmAction?.type === "cancelRejection"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : ""
              }
            >
              {confirmAction?.type === "reject"
                ? "رفض"
                : confirmAction?.type === "markNotComing"
                ? "تعيين كـ لن يحضر"
                : confirmAction?.type === "cancelRejection"
                ? "إلغاء الرفض"
                : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
