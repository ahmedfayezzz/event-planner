"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Car,
  Loader2,
  Clock,
  CheckCircle,
  ArrowRight,
  Crown,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface QueueItem {
  id: string;
  guestName: string;
  guestPhone: string | null;
  isVip: boolean;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;
  parkingSlot: string | null;
  status: string;
  retrievalRequestedAt: Date | null;
  retrievalPriority: number;
}

// Get valet token from localStorage
function useValetToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("valet-token"));
  }, []);

  return token;
}

export default function ValetQueuePage() {
  const token = useValetToken();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch assigned sessions for this valet employee
  const { data: assignedSessions, isLoading: sessionsLoading } = api.valet.getMyAssignedSessions.useQuery(
    undefined,
    {
      enabled: !!token,
      refetchInterval: 30000,
    }
  );

  // Only show active sessions
  const valetSessions = assignedSessions?.filter((s) => s.status !== "completed") ?? [];

  // Fetch retrieval queue
  const {
    data: queue,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = api.valet.getRetrievalQueue.useQuery(
    { sessionId: selectedSessionId! },
    {
      enabled: !!selectedSessionId,
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  // Mark as ready mutation
  const markReadyMutation = api.valet.markVehicleReady.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة السيارة - جاهزة للاستلام");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
    },
  });

  // Mark as retrieved mutation
  const markRetrievedMutation = api.valet.markVehicleRetrieved.useMutation({
    onSuccess: () => {
      toast.success("تم تسليم السيارة بنجاح");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
    },
  });

  const formatWaitTime = (date: Date | null) => {
    if (!date) return "-";
    return formatDistanceToNow(new Date(date), { locale: ar, addSuffix: true });
  };

  const getVehicleDescription = (item: QueueItem) => {
    const parts = [item.vehicleColor, item.vehicleMake, item.vehicleModel].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "غير محدد";
  };

  const requestedItems = queue?.filter((q) => q.status === "requested") ?? [];
  const readyItems = queue?.filter((q) => q.status === "ready") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طوابير الاسترجاع</h1>
          <p className="text-muted-foreground">إدارة طلبات استرجاع السيارات</p>
        </div>
        {selectedSessionId && (
          <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
        )}
      </div>

      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختر الحدث</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : valetSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد أحداث مسجل فيها</p>
              <p className="text-sm mt-1">تواصل مع المدير لتسجيلك في الأحداث</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {valetSessions.map((session) => (
                <Button
                  key={session.id}
                  variant={selectedSessionId === session.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  {session.title}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Display */}
      {selectedSessionId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Requested Queue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  طلبات الاسترجاع
                </CardTitle>
                <Badge variant="secondary">{requestedItems.length}</Badge>
              </div>
              <CardDescription>سيارات في انتظار الإحضار</CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requestedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">لا توجد طلبات حالياً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.isVip ? "border-amber-200 bg-amber-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <p className="font-semibold">{item.guestName}</p>
                            {item.isVip && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getVehicleDescription(item)}
                          </p>
                          {item.vehiclePlate && (
                            <p className="text-sm font-mono bg-muted px-2 py-0.5 rounded inline-block">
                              {item.vehiclePlate}
                            </p>
                          )}
                          {item.parkingSlot && (
                            <p className="text-xs text-muted-foreground">
                              موقع الركن: {item.parkingSlot}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatWaitTime(item.retrievalRequestedAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => markReadyMutation.mutate({ valetRecordId: item.id })}
                          disabled={markReadyMutation.isPending}
                        >
                          {markReadyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              جاهزة
                              <ArrowRight className="h-4 w-4 mr-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ready Queue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  جاهزة للاستلام
                </CardTitle>
                <Badge variant="secondary">{readyItems.length}</Badge>
              </div>
              <CardDescription>سيارات في منطقة الاستلام</CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : readyItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">لا توجد سيارات جاهزة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readyItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.isVip ? "border-amber-200 bg-amber-50/50" : "bg-green-50/50 border-green-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{item.guestName}</p>
                            {item.isVip && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getVehicleDescription(item)}
                          </p>
                          {item.vehiclePlate && (
                            <p className="text-sm font-mono bg-white px-2 py-0.5 rounded inline-block border">
                              {item.vehiclePlate}
                            </p>
                          )}
                          {item.guestPhone && (
                            <p className="text-xs text-muted-foreground">
                              {item.guestPhone}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => markRetrievedMutation.mutate({ valetRecordId: item.id })}
                          disabled={markRetrievedMutation.isPending}
                        >
                          {markRetrievedMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 ml-1" />
                              تم التسليم
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
