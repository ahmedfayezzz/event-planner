"use client";

import React, { use, useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn, formatArabicTime, formatArabicDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { formatArabicDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  QrCode,
  Check,
  Search,
  Users,
  UserPlus,
  Camera,
  Hand,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  Tag,
  Phone,
  Download,
} from "lucide-react";

// Attendee type for the attendance list
interface AttendeeItem {
  registrationId: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  isGuest: boolean;
  isInvited?: boolean;
  invitedByName?: string | null;
  attended: boolean;
  checkInTime: Date | null;
  qrVerified: boolean;
  companionCount: number;
  labels?: Array<{ id: string; name: string; color: string }>;
}

type TypeFilterType = "all" | "direct" | "invited";
type AttendanceFilterType = "all" | "checkedin" | "absent";
type LabelFilterType = "all" | string;

// Dynamically import QR scanner to avoid SSR issues
const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export default function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all");
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilterType>("all");
  const [labelFilter, setLabelFilter] = useState<LabelFilterType>("all");
  const debouncedSearch = useDebounce(search, 300);
  const { isExpanded, toggleRow } = useExpandableRows();

  // QR Scanner Dialog state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    name?: string | null;
    type?: string;
    error?: string;
  } | null>(null);

  // Manual Check-in Dialog state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [selectedForCheckIn, setSelectedForCheckIn] = useState<string[]>([]);

  const {
    data: attendance,
    isLoading,
    refetch,
  } = api.attendance.getSessionAttendance.useQuery(
    { sessionId: id },
    { refetchInterval: 10000 }
  );
  const { data: allLabels } = api.label.getAll.useQuery();

  const markQRMutation = api.attendance.markAttendanceQR.useMutation({
    onSuccess: (data) => {
      setScanResult({
        success: true,
        name: data.name,
        type: data.type,
      });
      setScanCount((prev) => prev + 1);
      refetch();
      // Auto-dismiss success after 2 seconds
      setTimeout(() => setScanResult(null), 2000);
    },
    onError: (error) => {
      setScanResult({
        success: false,
        error: error.message,
      });
      // Auto-dismiss error after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    },
  });

  const markManualMutation = api.attendance.markAttendance.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الحضور");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Reset scan count when dialog opens
  useEffect(() => {
    if (scannerOpen) {
      setScanCount(0);
      setScanResult(null);
    }
  }, [scannerOpen]);

  const handleScan = useCallback(
    (result: { rawValue: string }[]) => {
      if (result.length > 0) {
        const qrData = result[0].rawValue;

        // Prevent duplicate scans
        if (qrData === lastScanned) return;
        setLastScanned(qrData);

        // Reset after 3 seconds to allow rescan
        setTimeout(() => setLastScanned(null), 3000);

        markQRMutation.mutate({ qrData });
      }
    },
    [lastScanned, markQRMutation]
  );

  // Filter attendees by debounced search, type, attendance, and label (client-side)
  const filteredAttendees: AttendeeItem[] = useMemo(() => {
    let list = attendance?.attendanceList || [];

    // Filter by type
    if (typeFilter === "direct") {
      list = list.filter((a: AttendeeItem) => !a.isInvited);
    } else if (typeFilter === "invited") {
      list = list.filter((a: AttendeeItem) => a.isInvited);
    }

    // Filter by attendance status
    if (attendanceFilter === "checkedin") {
      list = list.filter((a: AttendeeItem) => a.attended);
    } else if (attendanceFilter === "absent") {
      list = list.filter((a: AttendeeItem) => !a.attended);
    }

    // Filter by label
    if (labelFilter !== "all") {
      list = list.filter((a: AttendeeItem) =>
        a.labels?.some((label) => label.id === labelFilter)
      );
    }

    // Filter by search
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      list = list.filter(
        (a: AttendeeItem) =>
          a.name?.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone?.includes(debouncedSearch) ||
          a.invitedByName?.toLowerCase().includes(searchLower)
      );
    }

    return list;
  }, [attendance?.attendanceList, debouncedSearch, typeFilter, attendanceFilter, labelFilter]);

  // Filter absent attendees for manual check-in dialog
  const absentAttendees: AttendeeItem[] = useMemo(() => {
    const list = attendance?.attendanceList || [];
    const absent = list.filter((a: AttendeeItem) => !a.attended);

    if (!manualSearch.trim()) return absent;

    const searchLower = manualSearch.toLowerCase();
    return absent.filter(
      (a: AttendeeItem) =>
        a.name?.toLowerCase().includes(searchLower) ||
        a.email?.toLowerCase().includes(searchLower) ||
        a.phone?.includes(manualSearch)
    );
  }, [attendance?.attendanceList, manualSearch]);

  const handleBulkCheckIn = async () => {
    if (selectedForCheckIn.length === 0) return;

    for (const regId of selectedForCheckIn) {
      await markManualMutation.mutateAsync({
        registrationId: regId,
        attended: true,
      });
    }

    toast.success(`تم تسجيل حضور ${selectedForCheckIn.length} شخص`);
    setSelectedForCheckIn([]);
    setManualOpen(false);
  };

  const toggleSelectForCheckIn = (regId: string) => {
    setSelectedForCheckIn((prev) =>
      prev.includes(regId)
        ? prev.filter((id) => id !== regId)
        : [...prev, regId]
    );
  };

  const selectAllAbsent = () => {
    const allAbsentIds = absentAttendees.map((a) => a.registrationId);
    const allSelected = allAbsentIds.every((id) =>
      selectedForCheckIn.includes(id)
    );
    if (allSelected) {
      setSelectedForCheckIn([]);
    } else {
      setSelectedForCheckIn(allAbsentIds);
    }
  };

  const formatCheckInTime = (date: Date | null) => {
    if (!date) return "-";
    return formatArabicTime(new Date(date));
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!attendance) return;

    const headers = [
      "الاسم",
      "البريد",
      "الهاتف",
      "النوع",
      "حالة الحضور",
      "وقت الحضور",
      "التصنيفات",
    ];

    const rows = filteredAttendees.map((a) => [
      a.name || "",
      a.email || "",
      a.phone || "",
      a.isInvited ? "مرافق" : "مباشر",
      a.attended ? "حاضر" : "غائب",
      a.checkInTime ? formatArabicDateTime(new Date(a.checkInTime)) : "-",
      a.labels?.map((l) => l.name).join("، ") || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\r\n");

    // Use Uint8Array with BOM for proper UTF-8 encoding
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoder = new TextEncoder();
    const csvData = encoder.encode(csvContent);
    const blob = new Blob([BOM, csvData], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${attendance.session.title || id}.csv`;
    link.click();
    toast.success("تم تصدير البيانات");
  };

  if (isLoading) {
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/checkin">العودة</Link>
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
            <Link href="/admin/checkin">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">تسجيل الحضور</h1>
            <p className="text-muted-foreground">
              {attendance.session.title} -{" "}
              {formatArabicDate(new Date(attendance.session.date))}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="me-2 h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المسجلين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendance.stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {attendance.stats.totalDirect} مباشر + {attendance.stats.totalInvited} مرافق
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الحاضرين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendance.stats.attended}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">لم يحضروا</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {attendance.stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">نسبة الحضور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendance.stats.total > 0
                ? Math.round(
                    (attendance.stats.attended / attendance.stats.total) * 100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setScannerOpen(true)} size="lg">
          <Camera className="ml-2 h-5 w-5" />
          بدء المسح
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setManualOpen(true)}
        >
          <Hand className="ml-2 h-5 w-5" />
          تسجيل حضور يدوي
        </Button>
      </div>

      {/* Attendee List - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة المسجلين
          </CardTitle>
          <CardDescription>
            جميع المسجلين في هذا الحدث
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attendance Status Tabs */}
          <Tabs
            value={attendanceFilter}
            onValueChange={(v) => setAttendanceFilter(v as AttendanceFilterType)}
            className="w-fit"
          >
            <TabsList>
              <TabsTrigger value="all">الكل ({attendance?.stats.total || 0})</TabsTrigger>
              <TabsTrigger value="checkedin">حاضر ({attendance?.stats.attended || 0})</TabsTrigger>
              <TabsTrigger value="absent">غائب ({attendance?.stats.pending || 0})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilterType)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="نوع التسجيل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="direct">مباشر ({attendance?.stats.totalDirect || 0})</SelectItem>
                <SelectItem value="invited">مرافقين ({attendance?.stats.totalInvited || 0})</SelectItem>
              </SelectContent>
            </Select>
            {allLabels && allLabels.length > 0 && (
              <Select
                value={labelFilter}
                onValueChange={(v) => setLabelFilter(v as LabelFilterType)}
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
            <div className="relative flex-1 max-w-md">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، البريد، أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>
          </div>

          {/* List */}
          <div className="border rounded-lg">
            {filteredAttendees.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                لا توجد نتائج
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead className="hidden md:table-cell">الهاتف</TableHead>
                    <TableHead className="hidden lg:table-cell">التصنيفات</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">وقت الحضور</TableHead>
                    <TableHead className="hidden md:table-cell w-24">إجراء</TableHead>
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.map((attendee) => {
                    const expanded = isExpanded(attendee.registrationId);
                    return (
                      <React.Fragment key={attendee.registrationId}>
                        <TableRow>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{attendee.name}</p>
                                {attendee.isInvited && (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs"
                                  >
                                    <UserPlus className="me-1 h-3 w-3" />
                                    مرافق
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground hidden md:block truncate">
                                {attendee.email}
                              </p>
                              {attendee.isInvited && attendee.invitedByName && (
                                <p className="text-xs text-muted-foreground hidden md:block">
                                  مدعو من: {attendee.invitedByName}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {attendee.phone ? (
                              <span className="text-sm" dir="ltr">
                                {attendee.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {attendee.labels && attendee.labels.length > 0 ? (
                              <div className="flex flex-wrap gap-0.5">
                                {attendee.labels.slice(0, 2).map((label) => (
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
                                {attendee.labels.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{attendee.labels.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={attendee.attended ? "default" : "outline"}
                              className={
                                attendee.attended
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : "bg-orange-500/10 text-orange-600 border-orange-200"
                              }
                            >
                              {attendee.attended ? (
                                <>
                                  <Check className="me-1 h-3 w-3" />
                                  حاضر
                                </>
                              ) : (
                                "غائب"
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {attendee.attended ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatCheckInTime(attendee.checkInTime)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {!attendee.attended && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  markManualMutation.mutate({
                                    registrationId: attendee.registrationId,
                                    attended: true,
                                  })
                                }
                                disabled={markManualMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(attendee.registrationId)}
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
                                    {attendee.email && (
                                      <div>
                                        <span className="text-muted-foreground">البريد:</span>
                                        <span className="mr-1 truncate" dir="ltr">{attendee.email}</span>
                                      </div>
                                    )}
                                    {attendee.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">الهاتف:</span>
                                        <span className="mr-1" dir="ltr">{attendee.phone}</span>
                                      </div>
                                    )}
                                    {attendee.labels && attendee.labels.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">التصنيفات:</span>
                                        {attendee.labels.map((label) => (
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
                                      </div>
                                    )}
                                    {attendee.isInvited && attendee.invitedByName && (
                                      <div>
                                        <span className="text-muted-foreground">مدعو من:</span>
                                        <span className="mr-1">{attendee.invitedByName}</span>
                                      </div>
                                    )}
                                    {attendee.attended && (
                                      <div>
                                        <span className="text-muted-foreground">وقت الحضور:</span>
                                        <span className="mr-1">
                                          {formatCheckInTime(attendee.checkInTime)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {!attendee.attended && (
                                    <div className="pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          markManualMutation.mutate({
                                            registrationId: attendee.registrationId,
                                            attended: true,
                                          })
                                        }
                                        disabled={markManualMutation.isPending}
                                      >
                                        <Check className="h-3 w-3 ml-1" />
                                        تسجيل حضور
                                      </Button>
                                    </div>
                                  )}
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
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              مسح رمز QR
            </DialogTitle>
            <DialogDescription>
              وجه الكاميرا نحو رمز QR للمسجل
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            {/* Scanner */}
            <div className="overflow-hidden rounded-lg">
              <Scanner
                onScan={handleScan}
                allowMultiple={true}
                scanDelay={500}
                styles={{
                  container: { height: 320 },
                  video: { objectFit: "cover" },
                }}
              />
            </div>

            {/* Scan Result Overlay */}
            {scanResult && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center rounded-lg ${
                  scanResult.success
                    ? "bg-green-500/95"
                    : "bg-red-500/95"
                }`}
              >
                {scanResult.success ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-white mb-4 animate-in zoom-in duration-300" />
                    <p className="text-xl font-bold text-white">
                      تم التسجيل
                    </p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {scanResult.name}
                    </p>
                    {scanResult.type === "companion" && (
                      <Badge className="mt-2 bg-white/20 text-white border-white/30">
                        مرافق
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-white mb-4 animate-in zoom-in duration-300" />
                    <p className="text-xl font-bold text-white">
                      خطأ
                    </p>
                    <p className="text-lg text-white/90 mt-2 text-center px-4">
                      {scanResult.error}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Scan Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              تم المسح: <span className="font-bold text-foreground">{scanCount}</span> حضور
            </p>
            <Button variant="outline" onClick={() => setScannerOpen(false)}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Check-in Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              تسجيل حضور يدوي
            </DialogTitle>
            <DialogDescription>
              اختر الأشخاص الذين تريد تسجيل حضورهم
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث عن مستخدم..."
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              className="pe-10"
            />
          </div>

          {/* Absent Attendees List */}
          <ScrollArea className="h-64 border rounded-md">
            {absentAttendees.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {manualSearch
                  ? "لا توجد نتائج"
                  : "جميع المسجلين حاضرون"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {/* Select All */}
                <div
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer border-b mb-2"
                  onClick={selectAllAbsent}
                >
                  <Checkbox
                    checked={
                      absentAttendees.length > 0 &&
                      absentAttendees.every((a) =>
                        selectedForCheckIn.includes(a.registrationId)
                      )
                    }
                  />
                  <span className="font-medium">تحديد الكل</span>
                  <span className="text-sm text-muted-foreground">
                    ({absentAttendees.length})
                  </span>
                </div>

                {absentAttendees.map((attendee) => (
                  <div
                    key={attendee.registrationId}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleSelectForCheckIn(attendee.registrationId)}
                  >
                    <Checkbox
                      checked={selectedForCheckIn.includes(
                        attendee.registrationId
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{attendee.name}</p>
                        {attendee.isInvited && (
                          <Badge
                            variant="outline"
                            className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs"
                          >
                            مرافق
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {attendee.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              تم تحديد: <span className="font-bold text-foreground">{selectedForCheckIn.length}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleBulkCheckIn}
                disabled={
                  selectedForCheckIn.length === 0 ||
                  markManualMutation.isPending
                }
              >
                {markManualMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Check className="h-4 w-4 ml-2" />
                )}
                تسجيل الحضور
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
