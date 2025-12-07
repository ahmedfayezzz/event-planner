"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
}

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
  const debouncedSearch = useDebounce(search, 300);

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

  // Filter attendees by debounced search (client-side)
  const filteredAttendees: AttendeeItem[] = useMemo(() => {
    const list = attendance?.attendanceList || [];
    if (!debouncedSearch.trim()) return list;

    const searchLower = debouncedSearch.toLowerCase();
    return list.filter(
      (a: AttendeeItem) =>
        a.name?.toLowerCase().includes(searchLower) ||
        a.email?.toLowerCase().includes(searchLower) ||
        a.phone?.includes(debouncedSearch) ||
        a.invitedByName?.toLowerCase().includes(searchLower)
    );
  }, [attendance?.attendanceList, debouncedSearch]);

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
    return new Date(date).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم، البريد، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pe-10"
            />
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
                    <TableHead>الحالة</TableHead>
                    <TableHead>وقت الحضور</TableHead>
                    <TableHead className="w-24">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.map((attendee) => (
                    <TableRow key={attendee.registrationId}>
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
                          <p className="text-xs text-muted-foreground">
                            {attendee.email}
                          </p>
                          {attendee.isInvited && attendee.invitedByName && (
                            <p className="text-xs text-muted-foreground">
                              مدعو من: {attendee.invitedByName}
                            </p>
                          )}
                        </div>
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
                      <TableCell>
                        {attendee.attended ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatCheckInTime(attendee.checkInTime)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
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
                    </TableRow>
                  ))}
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
