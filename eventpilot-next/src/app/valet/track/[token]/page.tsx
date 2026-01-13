"use client";

import { use } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Loader2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Timer,
  RefreshCw,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  expected: {
    label: "في انتظار الوصول",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: <Clock className="h-5 w-5" />,
  },
  parked: {
    label: "السيارة مركونة",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: <Car className="h-5 w-5" />,
  },
  requested: {
    label: "طلب الاسترجاع",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: <Timer className="h-5 w-5" />,
  },
  ready: {
    label: "جاهزة للاستلام",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  retrieved: {
    label: "تم الاستلام",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
};

export default function ValetTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const {
    data: valetStatus,
    isLoading,
    error,
    refetch,
  } = api.valet.getStatusByToken.useQuery(
    { token },
    {
      refetchInterval: 10000, // Refresh every 10 seconds
      retry: false,
    }
  );

  const requestRetrievalMutation = api.valet.requestRetrievalByToken.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void refetch();
    },
    onError: (err) => {
      if (err.message === "NOT_PARKED") {
        toast.error("السيارة لم يتم ركنها بعد");
      } else if (err.message === "ALREADY_RETRIEVED") {
        toast.error("تم استلام السيارة مسبقاً");
      } else {
        toast.error(err.message || "حدث خطأ");
      }
    },
  });

  const handleRequestRetrieval = () => {
    requestRetrievalMutation.mutate({ token });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !valetStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-red-100 w-fit mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold">رابط غير صالح</h2>
            <p className="text-muted-foreground">
              هذا الرابط غير صحيح أو لم يعد صالحاً. تأكد من الرابط المرسل إليك عبر البريد الإلكتروني.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[valetStatus.status] ?? statusConfig.expected;
  const canRequestRetrieval = valetStatus.status === "parked";
  const isInQueue = valetStatus.status === "requested" || valetStatus.status === "ready";
  const isCompleted = valetStatus.status === "retrieved";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-8">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">تتبع سيارتك</h1>
                <p className="text-sm text-muted-foreground">{valetStatus.session.title}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              className="h-10 w-10"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <Card className="overflow-hidden">
          <div className={cn("h-2", status.bgColor.replace("100", "500"))} />
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn("p-4 rounded-full", status.bgColor)}>
                <div className={status.color}>{status.icon}</div>
              </div>
              <div>
                <Badge className={cn("text-sm px-3 py-1", status.bgColor, status.color)}>
                  {status.label}
                </Badge>
              </div>

              {/* Queue position */}
              {isInQueue && valetStatus.queuePosition && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 w-full max-w-xs">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-yellow-700">موقعك في الطابور</p>
                    <p className="text-4xl font-bold text-yellow-600">
                      #{valetStatus.queuePosition}
                    </p>
                    {valetStatus.estimatedWaitMinutes && (
                      <p className="text-sm text-yellow-600">
                        الوقت المتوقع: ~{valetStatus.estimatedWaitMinutes} دقيقة
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Ready notification */}
              {valetStatus.status === "ready" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">سيارتك جاهزة للاستلام!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2 text-center">
                    يرجى التوجه إلى منطقة استلام السيارات
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              تفاصيل السيارة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {valetStatus.ticketNumber !== null && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">رقم التذكرة</span>
                <span className="font-bold text-xl text-primary">
                  #{valetStatus.ticketNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">اسم الضيف</span>
              <span className="font-medium">{valetStatus.guestName}</span>
            </div>
            {(valetStatus.vehicleMake || valetStatus.vehicleModel) && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">نوع السيارة</span>
                <span className="font-medium">
                  {[valetStatus.vehicleMake, valetStatus.vehicleModel]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              </div>
            )}
            {valetStatus.vehicleColor && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">اللون</span>
                <span className="font-medium">{valetStatus.vehicleColor}</span>
              </div>
            )}
            {valetStatus.vehiclePlate && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">رقم اللوحة</span>
                <span className="font-medium font-mono">{valetStatus.vehiclePlate}</span>
              </div>
            )}
            {valetStatus.parkingSlot && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">موقع الركن</span>
                <span className="font-medium">{valetStatus.parkingSlot}</span>
              </div>
            )}
            {valetStatus.isVip && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">الأولوية</span>
                <Badge className="bg-amber-100 text-amber-700">VIP</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              سجل الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Parked */}
              {valetStatus.parkedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Car className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">تم ركن السيارة</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(valetStatus.parkedAt), "h:mm a - d MMMM", { locale: ar })}
                    </p>
                  </div>
                </div>
              )}

              {/* Retrieval Requested */}
              {valetStatus.retrievalRequestedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <Timer className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">طلب استرجاع السيارة</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(valetStatus.retrievalRequestedAt), "h:mm a - d MMMM", {
                        locale: ar,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Vehicle Ready */}
              {valetStatus.vehicleReadyAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">السيارة جاهزة</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(valetStatus.vehicleReadyAt), "h:mm a - d MMMM", {
                        locale: ar,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Retrieved */}
              {valetStatus.retrievedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    <CheckCircle2 className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">تم الاستلام</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(valetStatus.retrievedAt), "h:mm a - d MMMM", {
                        locale: ar,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Request Retrieval Button */}
        {canRequestRetrieval && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg safe-area-inset">
            <Button
              className="w-full h-14 text-lg"
              onClick={handleRequestRetrieval}
              disabled={requestRetrievalMutation.isPending}
            >
              {requestRetrievalMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الطلب...
                </>
              ) : (
                <>
                  <ArrowDown className="ml-2 h-5 w-5" />
                  طلب استرجاع السيارة
                </>
              )}
            </Button>
          </div>
        )}

        {/* Spacer for fixed button */}
        {canRequestRetrieval && <div className="h-20" />}
      </div>
    </div>
  );
}
