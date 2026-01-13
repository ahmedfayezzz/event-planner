"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Car,
  Search,
  QrCode,
  Loader2,
  User,
  Phone,
  Mail,
  ParkingSquare,
  CheckCircle,
  Crown,
  Clock,
  ArrowRight,
  RefreshCw,
  Camera,
  X,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";

function useValetToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("valet-token"));
  }, []);

  return token;
}

interface GuestResult {
  registrationId: string;
  name: string;
  phone: string | null;
  email?: string | null;
  valetStatus: string | null;
  isVip: boolean;
}

interface ParkDialogData {
  registrationId: string;
  sessionId: string;
  name: string;
  phone: string | null;
}

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

export default function ValetSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const token = useValetToken();

  const [activeTab, setActiveTab] = useState("checkin");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestResult[]>([]);
  const [parkDialog, setParkDialog] = useState<ParkDialogData | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    slot: "",
  });
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch session info
  const { data: sessionInfo, isLoading: sessionLoading } = api.valet.getSessionForValet.useQuery(
    { sessionId },
    { enabled: !!token && !!sessionId }
  );

  // Fetch retrieval queue
  const {
    data: queue,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = api.valet.getRetrievalQueue.useQuery(
    { sessionId },
    { enabled: !!sessionId && activeTab === "queue", refetchInterval: 5000 }
  );

  // Search guests
  const searchMutation = api.valet.searchGuests.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      if (data.length === 0) {
        toast.info("لم يتم العثور على نتائج");
      }
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في البحث");
    },
  });

  // Get guest by QR
  const qrMutation = api.valet.getGuestByQR.useMutation({
    onSuccess: (data) => {
      stopScanner();
      setParkDialog({
        registrationId: data.registrationId,
        sessionId: data.sessionId,
        name: data.name,
        phone: data.phone ?? null,
      });
    },
    onError: (error) => {
      toast.error(error.message || "رمز QR غير صالح");
    },
  });

  // Park vehicle mutation
  const parkMutation = api.valet.parkVehicle.useMutation({
    onSuccess: () => {
      toast.success("تم ركن السيارة بنجاح");
      setParkDialog(null);
      setVehicleInfo({ make: "", model: "", color: "", plate: "", slot: "" });
      setSearchResults([]);
      setSearchQuery("");
    },
    onError: (error) => {
      if (error.message === "CAPACITY_FULL") {
        toast.error("الموقف ممتلئ - لا يوجد مكان متاح");
      } else if (error.message === "ALREADY_PARKED") {
        toast.error("السيارة مركونة مسبقاً");
      } else {
        toast.error(error.message || "فشل ركن السيارة");
      }
    },
  });

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

  // QR Scanner functions
  const startScanner = async () => {
    setScannerError(null);
    setShowScanner(true);

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setScannerError("يجب استخدام HTTPS للوصول إلى الكاميرا. استخدم البحث بدلاً من ذلك.");
      return;
    }

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError("متصفحك لا يدعم الوصول إلى الكاميرا. استخدم البحث بدلاً من ذلك.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning with BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetector }).BarcodeDetector({ formats: ["qr_code"] });
          scanFrame(barcodeDetector);
        } else {
          setScannerError("متصفحك لا يدعم مسح رموز QR. استخدم البحث بدلاً من ذلك.");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setScannerError("تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setScannerError("لم يتم العثور على كاميرا. تأكد من توصيل كاميرا بجهازك.");
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          setScannerError("الكاميرا قيد الاستخدام من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.");
        } else if (error.name === "OverconstrainedError") {
          setScannerError("لا يمكن استخدام الكاميرا الخلفية. جاري المحاولة بالكاميرا المتاحة...");
          // Try again without facingMode constraint
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play();
              if ("BarcodeDetector" in window) {
                const barcodeDetector = new (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetector }).BarcodeDetector({ formats: ["qr_code"] });
                setScannerError(null);
                scanFrame(barcodeDetector);
              }
            }
          } catch {
            setScannerError("لا يمكن الوصول لأي كاميرا على جهازك.");
          }
        } else {
          setScannerError(`خطأ في الكاميرا: ${error.message}`);
        }
      } else {
        setScannerError("لا يمكن الوصول للكاميرا. تأكد من منح الإذن.");
      }
    }
  };

  interface BarcodeDetector {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
  }

  const scanFrame = async (detector: BarcodeDetector) => {
    if (!videoRef.current || !showScanner) return;

    try {
      const barcodes = await detector.detect(videoRef.current);
      if (barcodes.length > 0) {
        const qrData = barcodes[0].rawValue;
        qrMutation.mutate({ qrData });
        return;
      }
    } catch (error) {
      // Continue scanning
    }

    if (showScanner) {
      requestAnimationFrame(() => scanFrame(detector));
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
    setScannerError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("الرجاء إدخال كلمة للبحث");
      return;
    }
    searchMutation.mutate({ sessionId, query: searchQuery.trim() });
  };

  const handlePark = () => {
    if (!parkDialog) return;
    parkMutation.mutate({
      registrationId: parkDialog.registrationId,
      vehicleMake: vehicleInfo.make || undefined,
      vehicleModel: vehicleInfo.model || undefined,
      vehicleColor: vehicleInfo.color || undefined,
      vehiclePlate: vehicleInfo.plate || undefined,
      parkingSlot: vehicleInfo.slot || undefined,
    });
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

  if (!token) {
    return null;
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Car className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">الحدث غير موجود</h2>
        <p className="text-muted-foreground mt-2">تأكد من أنك مسجل لهذا الحدث</p>
        <Link href="/valet">
          <Button className="mt-4">العودة للأحداث</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/valet" className="hover:text-primary transition-colors">
              الأحداث
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate">{sessionInfo.title}</span>
          </div>
          <h1 className="text-xl font-bold truncate">{sessionInfo.title}</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="checkin" className="text-base">
            <ParkingSquare className="h-4 w-4 ml-2" />
            تسجيل السيارات
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-base relative">
            <Clock className="h-4 w-4 ml-2" />
            طابور الاسترجاع
            {(requestedItems.length + readyItems.length) > 0 && (
              <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {requestedItems.length + readyItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="mt-4 space-y-4">
          {/* QR Scanner Button */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {showScanner ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full aspect-square object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white rounded-lg shadow-lg" />
                  </div>
                  {scannerError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-center text-white p-4">
                        <p className="mb-4">{scannerError}</p>
                        <Button variant="outline" onClick={stopScanner}>
                          إغلاق
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 left-4"
                    onClick={stopScanner}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  {qrMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={startScanner}
                  className="w-full p-8 flex flex-col items-center justify-center gap-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-4 rounded-full bg-primary/10">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">مسح رمز QR</p>
                    <p className="text-sm text-muted-foreground">
                      امسح رمز تسجيل الضيف لتسجيل السيارة
                    </p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Search Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                البحث عن ضيف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="ابحث بالاسم أو رقم الهاتف أو البريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 text-base"
                />
                <Button onClick={handleSearch} disabled={searchMutation.isPending} size="lg">
                  {searchMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((guest) => (
                    <div
                      key={guest.registrationId}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-full bg-muted shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{guest.name}</p>
                            {guest.isVip && (
                              <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                          </div>
                          {guest.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span dir="ltr">{guest.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(guest.valetStatus)}
                        {(!guest.valetStatus || guest.valetStatus === "expected") && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setParkDialog({
                                registrationId: guest.registrationId,
                                sessionId,
                                name: guest.name,
                                phone: guest.phone,
                              })
                            }
                          >
                            <ParkingSquare className="h-4 w-4 ml-1" />
                            ركن
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
              <RefreshCw className="h-4 w-4 ml-1" />
              تحديث
            </Button>
          </div>

          {queueLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requestedItems.length === 0 && readyItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="font-medium">لا توجد طلبات استرجاع حالياً</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ستظهر الطلبات هنا عندما يطلب الضيوف سياراتهم
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Requested Section */}
              {requestedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      في انتظار الإحضار
                    </h3>
                    <Badge variant="secondary">{requestedItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {requestedItems.map((item, index) => (
                      <Card
                        key={item.id}
                        className={item.isVip ? "border-amber-200 bg-amber-50/50" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  #{index + 1}
                                </span>
                                <p className="font-semibold truncate">{item.guestName}</p>
                                {item.isVip && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getVehicleDescription(item)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {item.vehiclePlate && (
                                  <span className="font-mono bg-muted px-2 py-0.5 rounded" dir="ltr">
                                    {item.vehiclePlate}
                                  </span>
                                )}
                                {item.parkingSlot && (
                                  <span className="text-muted-foreground">
                                    موقع: {item.parkingSlot}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatWaitTime(item.retrievalRequestedAt)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => markReadyMutation.mutate({ valetRecordId: item.id })}
                              disabled={markReadyMutation.isPending}
                              className="shrink-0"
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready Section */}
              {readyItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      جاهزة للاستلام
                    </h3>
                    <Badge variant="secondary">{readyItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {readyItems.map((item) => (
                      <Card
                        key={item.id}
                        className={item.isVip ? "border-amber-200 bg-amber-50/50" : "bg-green-50/50 border-green-200"}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">{item.guestName}</p>
                                {item.isVip && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getVehicleDescription(item)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {item.vehiclePlate && (
                                  <span className="font-mono bg-white px-2 py-0.5 rounded border" dir="ltr">
                                    {item.vehiclePlate}
                                  </span>
                                )}
                                {item.guestPhone && (
                                  <span className="text-muted-foreground" dir="ltr">
                                    {item.guestPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 shrink-0"
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Park Vehicle Dialog */}
      <Dialog open={!!parkDialog} onOpenChange={(open) => !open && setParkDialog(null)}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>ركن سيارة</DialogTitle>
            <DialogDescription>
              أدخل بيانات السيارة للضيف: {parkDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="make">الشركة المصنعة</Label>
                <Input
                  id="make"
                  placeholder="مثال: تويوتا"
                  value={vehicleInfo.make}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({ ...prev, make: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">الموديل</Label>
                <Input
                  id="model"
                  placeholder="مثال: كامري"
                  value={vehicleInfo.model}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({ ...prev, model: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">اللون</Label>
                <Input
                  id="color"
                  placeholder="مثال: أبيض"
                  value={vehicleInfo.color}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">رقم اللوحة</Label>
                <Input
                  id="plate"
                  placeholder="مثال: أ ب ج 1234"
                  value={vehicleInfo.plate}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({ ...prev, plate: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot">موقع الركن</Label>
              <Input
                id="slot"
                placeholder="مثال: A-15"
                value={vehicleInfo.slot}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, slot: e.target.value }))
                }
                dir="ltr"
                className="text-left h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setParkDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={handlePark} disabled={parkMutation.isPending}>
              {parkMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="me-2 h-4 w-4" />
              )}
              تأكيد الركن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
