"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Car,
  Loader2,
  ParkingSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Send,
  RefreshCw,
  Crown,
} from "lucide-react";

export default function AdminValetDashboardPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);

  // Fetch sessions with valet enabled
  const { data: sessionsData, isLoading: sessionsLoading } = api.session.listAdmin.useQuery(
    { status: "open", limit: 50 },
    { refetchInterval: 30000 }
  );

  const valetSessions = sessionsData?.sessions?.filter((s) => s.valetEnabled) ?? [];

  // Fetch valet stats for selected session
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = api.valet.getSessionValetStats.useQuery(
    { sessionId: selectedSessionId },
    { enabled: !!selectedSessionId, refetchInterval: 10000 }
  );

  // Fetch valet guests for selected session
  const {
    data: guests,
    isLoading: guestsLoading,
    refetch: refetchGuests,
  } = api.valet.getSessionValetGuests.useQuery(
    { sessionId: selectedSessionId },
    { enabled: !!selectedSessionId, refetchInterval: 10000 }
  );

  // Fetch retrieval queue
  const { data: queue, refetch: refetchQueue } = api.valet.getRetrievalQueue.useQuery(
    { sessionId: selectedSessionId },
    { enabled: !!selectedSessionId, refetchInterval: 5000 }
  );

  // Broadcast mutation
  const broadcastMutation = api.valet.sendBroadcast.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال الإشعار إلى ${data.sent} ضيف`);
      setShowBroadcastDialog(false);
      setBroadcastMessage("");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إرسال الإشعار");
    },
  });

  // Mark VIP mutation
  const markVipMutation = api.valet.markGuestVip.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة VIP");
      refetchGuests();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
    },
  });

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) {
      toast.error("الرجاء إدخال نص الرسالة");
      return;
    }
    broadcastMutation.mutate({
      sessionId: selectedSessionId,
      message: broadcastMessage.trim(),
    });
  };

  const handleRefresh = () => {
    refetchStats();
    refetchGuests();
    refetchQueue();
    toast.success("تم تحديث البيانات");
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">جديد</Badge>;
    }
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

  const selectedSession = valetSessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6">
      {/* Session Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">اختر الحدث</CardTitle>
              <CardDescription>اختر الحدث لعرض إحصائيات الفاليه</CardDescription>
            </div>
            {selectedSessionId && (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 ml-1" />
                تحديث
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
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

      {/* Stats Cards */}
      {selectedSessionId && (
        <>
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ParkingSquare className="h-4 w-4" />
                    مركونة حالياً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.currentlyParked}</div>
                  <p className="text-xs text-muted-foreground">
                    من أصل {stats.capacity} سعة
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min((stats.currentlyParked / stats.capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    في الانتظار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{stats.requested}</div>
                  <p className="text-xs text-muted-foreground">طلبات استرجاع</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    جاهزة للاستلام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                  <p className="text-xs text-muted-foreground">سيارات جاهزة</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    تم الاستلام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.retrieved}</div>
                  <p className="text-xs text-muted-foreground">اليوم</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBroadcastDialog(true)}
              >
                <Send className="h-4 w-4 ml-1" />
                إرسال إشعار للجميع
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("/valet/queue", "_blank")}
              >
                <Clock className="h-4 w-4 ml-1" />
                فتح طابور الاسترجاع
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("/valet/dashboard", "_blank")}
              >
                <Car className="h-4 w-4 ml-1" />
                فتح بوابة الموظفين
              </Button>
            </CardContent>
          </Card>

          {/* Retrieval Queue Preview */}
          {queue && queue.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      طابور الاسترجاع الحالي
                    </CardTitle>
                    <CardDescription>
                      {queue.length} طلب في الانتظار
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queue.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.isVip ? "border-amber-200 bg-amber-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.guestName}</p>
                            {item.isVip && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {[item.vehicleColor, item.vehicleMake, item.vehicleModel]
                              .filter(Boolean)
                              .join(" ") || "غير محدد"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                  {queue.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      +{queue.length - 5} آخرين
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guests List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    قائمة الضيوف
                  </CardTitle>
                  <CardDescription>
                    جميع الضيوف المسجلين في خدمة الفاليه
                  </CardDescription>
                </div>
                <Badge variant="secondary">{guests?.length ?? 0}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {guestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !guests || guests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد ضيوف مسجلين</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {guests.map((guest) => (
                    <div
                      key={guest.registrationId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        guest.valetRecord?.isVip
                          ? "border-amber-200 bg-amber-50/50"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{guest.name}</p>
                            {guest.valetRecord?.isVip && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          {guest.phone && (
                            <p className="text-sm text-muted-foreground">
                              {guest.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(guest.valetRecord?.status ?? null)}
                        {guest.valetRecord && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              markVipMutation.mutate({
                                registrationId: guest.registrationId,
                                isVip: !guest.valetRecord?.isVip,
                              })
                            }
                            disabled={markVipMutation.isPending}
                          >
                            <Crown
                              className={`h-4 w-4 ${
                                guest.valetRecord.isVip
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال إشعار للجميع</DialogTitle>
            <DialogDescription>
              سيتم إرسال هذا الإشعار لجميع الضيوف المسجلين في خدمة الفاليه
              {selectedSession && ` للحدث: ${selectedSession.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">نص الرسالة</Label>
              <Textarea
                id="message"
                placeholder="اكتب رسالتك هنا..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBroadcastDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={broadcastMutation.isPending}
            >
              {broadcastMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <Send className="h-4 w-4 ml-1" />
              )}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
