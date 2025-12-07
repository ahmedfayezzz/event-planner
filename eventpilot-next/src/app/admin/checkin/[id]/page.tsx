"use client";

import { use, useState, useCallback, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  X,
  Search,
  Users,
  Camera,
  CameraOff,
  UserPlus,
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
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
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
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    name?: string | null;
    type?: string;
    error?: string;
  } | null>(null);

  const {
    data: attendance,
    isLoading,
    refetch,
  } = api.attendance.getSessionAttendance.useQuery(
    { sessionId: id },
    { refetchInterval: 10000 } // Refresh every 10s
  );

  const markQRMutation = api.attendance.markAttendanceQR.useMutation({
    onSuccess: (data) => {
      setScanResult({
        success: true,
        name: data.name,
        type: data.type,
      });
      toast.success(`تم تسجيل حضور ${data.name}`);
      refetch();
    },
    onError: (error) => {
      setScanResult({
        success: false,
        error: error.message,
      });
      toast.error(error.message);
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الجلسة غير موجودة</h2>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  ماسح QR
                </CardTitle>
                <CardDescription>
                  وجه الكاميرا نحو رمز QR للمسجل
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setScannerEnabled(!scannerEnabled)}
              >
                {scannerEnabled ? (
                  <CameraOff className="h-4 w-4" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scannerEnabled ? (
              <div className="overflow-hidden rounded-lg">
                <Scanner
                  onScan={handleScan}
                  allowMultiple={true}
                  scanDelay={500}
                  styles={{
                    container: { height: 300 },
                    video: { objectFit: "cover" },
                  }}
                />
              </div>
            ) : (
              <div className="h-64 rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">الكاميرا متوقفة</p>
              </div>
            )}

            {/* Scan Result */}
            {scanResult && (
              <div
                className={`p-4 rounded-lg ${
                  scanResult.success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {scanResult.success ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span>تم تسجيل حضور: {scanResult.name}</span>
                    {scanResult.type === "companion" && (
                      <Badge variant="outline" className="ms-2 bg-purple-500/10 text-purple-600 border-purple-200">
                        مرافق
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5" />
                    <span>{scanResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendee List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة المسجلين
            </CardTitle>
            <CardDescription>
              انقر على المسجل لتسجيل حضوره يدوياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-auto">
              {filteredAttendees.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  لا توجد نتائج
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead></TableHead>
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
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">
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
                                : ""
                            }
                          >
                            {attendee.attended ? "حاضر" : "غائب"}
                          </Badge>
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
      </div>
    </div>
  );
}
