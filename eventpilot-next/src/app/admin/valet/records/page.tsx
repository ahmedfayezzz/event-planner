"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import {
  Car,
  Loader2,
  Search,
  MoreVertical,
  Crown,
  Clock,
  CheckCircle,
  ParkingSquare,
  AlertCircle,
  RefreshCw,
  Pencil,
} from "lucide-react";

type ValetStatus = "expected" | "parked" | "requested" | "ready" | "retrieved";

export default function ValetRecordsPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Override action state
  const [overrideAction, setOverrideAction] = useState<{
    type: "status" | "vip" | "details";
    recordId: string;
    guestName: string;
    currentStatus?: ValetStatus;
    currentVip?: boolean;
    vehicleInfo?: {
      make: string;
      model: string;
      color: string;
      plate: string;
      slot: string;
    };
  } | null>(null);

  const [newStatus, setNewStatus] = useState<ValetStatus>("parked");
  const [overrideReason, setOverrideReason] = useState("");
  const [vehicleForm, setVehicleForm] = useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    slot: "",
  });

  // Fetch sessions with valet enabled
  const { data: sessionsData, isLoading: sessionsLoading } = api.session.listAdmin.useQuery(
    { status: "open", limit: 50 },
    { refetchInterval: 30000 }
  );

  const valetSessions = sessionsData?.sessions?.filter((s) => s.valetEnabled) ?? [];

  // Fetch all valet records for the session
  const {
    data: records,
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = api.valet.getAllRecords.useQuery(
    { sessionId: selectedSessionId },
    { enabled: !!selectedSessionId, refetchInterval: 15000 }
  );

  // Admin override mutations
  const overrideStatusMutation = api.valet.adminOverrideStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحالة بواسطة المدير");
      refetchRecords();
      setOverrideAction(null);
      setOverrideReason("");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
    },
  });

  const overrideVipMutation = api.valet.adminOverrideVip.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة VIP");
      refetchRecords();
      setOverrideAction(null);
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
    },
  });

  const updateDetailsMutation = api.valet.adminUpdateVehicleDetails.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات السيارة");
      refetchRecords();
      setOverrideAction(null);
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث البيانات");
    },
  });

  const handleOverrideStatus = () => {
    if (!overrideAction || overrideAction.type !== "status") return;
    overrideStatusMutation.mutate({
      valetRecordId: overrideAction.recordId,
      newStatus,
      reason: overrideReason.trim() || undefined,
    });
  };

  const handleOverrideVip = () => {
    if (!overrideAction || overrideAction.type !== "vip") return;
    overrideVipMutation.mutate({
      valetRecordId: overrideAction.recordId,
      isVip: !overrideAction.currentVip,
    });
  };

  const handleUpdateDetails = () => {
    if (!overrideAction || overrideAction.type !== "details") return;
    updateDetailsMutation.mutate({
      valetRecordId: overrideAction.recordId,
      vehicleMake: vehicleForm.make || undefined,
      vehicleModel: vehicleForm.model || undefined,
      vehicleColor: vehicleForm.color || undefined,
      vehiclePlate: vehicleForm.plate || undefined,
      parkingSlot: vehicleForm.slot || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "expected":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">متوقع</Badge>;
      case "parked":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">مركون</Badge>;
      case "requested":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">طلب استرجاع</Badge>;
      case "ready":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">جاهز</Badge>;
      case "retrieved":
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">تم الاستلام</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "expected":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "parked":
        return <ParkingSquare className="h-4 w-4 text-green-500" />;
      case "requested":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case "retrieved":
        return <Car className="h-4 w-4 text-gray-500" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  // Filter records
  const filteredRecords = records?.filter((record) => {
    if (statusFilter !== "all" && record.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        record.guestName.toLowerCase().includes(query) ||
        record.vehiclePlate?.toLowerCase().includes(query) ||
        record.parkingSlot?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Session Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">اختر الحدث</CardTitle>
              <CardDescription>عرض سجلات الفاليه للحدث المحدد</CardDescription>
            </div>
            {selectedSessionId && (
              <Button variant="outline" size="sm" onClick={() => refetchRecords()}>
                <RefreshCw className="h-4 w-4 ml-1" />
                تحديث
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Skeleton className="h-10 w-full md:w-80" />
          ) : valetSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد أحداث مفعلة فيها خدمة الفاليه</p>
            </div>
          ) : (
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="اختر حدث..." />
              </SelectTrigger>
              <SelectContent>
                {valetSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.title} - {new Date(session.date).toLocaleDateString("ar-SA")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Records Table */}
      {selectedSessionId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">سجلات الفاليه</CardTitle>
                <CardDescription>
                  جميع سجلات خدمة الفاليه مع إمكانية التعديل الإداري
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم، اللوحة، الموقع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="expected">متوقع</SelectItem>
                    <SelectItem value="parked">مركون</SelectItem>
                    <SelectItem value="requested">طلب استرجاع</SelectItem>
                    <SelectItem value="ready">جاهز</SelectItem>
                    <SelectItem value="retrieved">تم الاستلام</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recordsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !filteredRecords || filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد سجلات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الضيف</TableHead>
                    <TableHead>السيارة</TableHead>
                    <TableHead className="hidden md:table-cell">موقع الركن</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden lg:table-cell">وقت الركن</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{record.guestName}</p>
                          {record.isVip && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        {record.guestPhone && (
                          <p className="text-sm text-muted-foreground">
                            {record.guestPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {[record.vehicleColor, record.vehicleMake, record.vehicleModel]
                            .filter(Boolean)
                            .join(" ") || "غير محدد"}
                        </p>
                        {record.vehiclePlate && (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {record.vehiclePlate}
                          </code>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {record.parkingSlot || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          {getStatusBadge(record.status)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {record.parkedAt
                          ? formatArabicDate(new Date(record.parkedAt))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setOverrideAction({
                                  type: "status",
                                  recordId: record.id,
                                  guestName: record.guestName,
                                  currentStatus: record.status as ValetStatus,
                                });
                                setNewStatus(record.status as ValetStatus);
                              }}
                            >
                              <RefreshCw className="me-2 h-4 w-4" />
                              تغيير الحالة
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setOverrideAction({
                                  type: "vip",
                                  recordId: record.id,
                                  guestName: record.guestName,
                                  currentVip: record.isVip,
                                })
                              }
                            >
                              <Crown className="me-2 h-4 w-4" />
                              {record.isVip ? "إزالة VIP" : "تعيين VIP"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setOverrideAction({
                                  type: "details",
                                  recordId: record.id,
                                  guestName: record.guestName,
                                  vehicleInfo: {
                                    make: record.vehicleMake || "",
                                    model: record.vehicleModel || "",
                                    color: record.vehicleColor || "",
                                    plate: record.vehiclePlate || "",
                                    slot: record.parkingSlot || "",
                                  },
                                });
                                setVehicleForm({
                                  make: record.vehicleMake || "",
                                  model: record.vehicleModel || "",
                                  color: record.vehicleColor || "",
                                  plate: record.vehiclePlate || "",
                                  slot: record.parkingSlot || "",
                                });
                              }}
                            >
                              <Pencil className="me-2 h-4 w-4" />
                              تعديل البيانات
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Override Dialog */}
      <Dialog
        open={overrideAction?.type === "status"}
        onOpenChange={(open) => {
          if (!open) {
            setOverrideAction(null);
            setOverrideReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير حالة السيارة (إجراء إداري)</DialogTitle>
            <DialogDescription>
              تغيير حالة سيارة {overrideAction?.guestName}. سيتم تسجيل هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ValetStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expected">متوقع</SelectItem>
                  <SelectItem value="parked">مركون</SelectItem>
                  <SelectItem value="requested">طلب استرجاع</SelectItem>
                  <SelectItem value="ready">جاهز للاستلام</SelectItem>
                  <SelectItem value="retrieved">تم الاستلام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>سبب التغيير (اختياري)</Label>
              <Textarea
                placeholder="أدخل سبب التغيير للتوثيق..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideAction(null)}>
              إلغاء
            </Button>
            <Button
              onClick={handleOverrideStatus}
              disabled={overrideStatusMutation.isPending}
            >
              {overrideStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              )}
              تأكيد التغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIP Override Dialog */}
      <AlertDialog
        open={overrideAction?.type === "vip"}
        onOpenChange={(open) => !open && setOverrideAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {overrideAction?.currentVip ? "إزالة حالة VIP" : "تعيين كـ VIP"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {overrideAction?.currentVip
                ? `هل أنت متأكد من إزالة حالة VIP للضيف "${overrideAction?.guestName}"؟`
                : `هل أنت متأكد من تعيين الضيف "${overrideAction?.guestName}" كـ VIP؟ سيتم إعطاؤه أولوية في طابور الاسترجاع.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleOverrideVip}
              disabled={overrideVipMutation.isPending}
            >
              {overrideVipMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              )}
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vehicle Details Dialog */}
      <Dialog
        open={overrideAction?.type === "details"}
        onOpenChange={(open) => !open && setOverrideAction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات السيارة</DialogTitle>
            <DialogDescription>
              تعديل بيانات سيارة {overrideAction?.guestName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>الشركة المصنعة</Label>
                <Input
                  placeholder="مثال: تويوتا"
                  value={vehicleForm.make}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, make: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>الموديل</Label>
                <Input
                  placeholder="مثال: كامري"
                  value={vehicleForm.model}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, model: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>اللون</Label>
                <Input
                  placeholder="مثال: أبيض"
                  value={vehicleForm.color}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>رقم اللوحة</Label>
                <Input
                  placeholder="مثال: أ ب ج 1234"
                  value={vehicleForm.plate}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, plate: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>موقع الركن</Label>
              <Input
                placeholder="مثال: A-15"
                value={vehicleForm.slot}
                onChange={(e) =>
                  setVehicleForm((prev) => ({ ...prev, slot: e.target.value }))
                }
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideAction(null)}>
              إلغاء
            </Button>
            <Button
              onClick={handleUpdateDetails}
              disabled={updateDetailsMutation.isPending}
            >
              {updateDetailsMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              )}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
