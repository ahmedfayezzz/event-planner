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
  Loader2,
  User,
  Phone,
  ParkingSquare,
  CheckCircle,
  Crown,
  Clock,
  ArrowRight,
  RefreshCw,
  Camera,
  X,
  ChevronRight,
  Ticket,
  CarFront,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  ticketNumber: number | null;
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
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [collectionSearchResults, setCollectionSearchResults] = useState<GuestResult[]>([]);
  const [parkDialog, setParkDialog] = useState<ParkDialogData | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    slot: "",
  });
  const [showScanner, setShowScanner] = useState(false);
  const [showCollectionScanner, setShowCollectionScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"checkin" | "collection">("checkin");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch session info
  const { data: sessionInfo, isLoading: sessionLoading } = api.valet.getSessionForValet.useQuery(
    { sessionId },
    { enabled: !!token && !!sessionId }
  );

  // Fetch retrieval queue - always enabled so badge shows count
  const {
    data: queue,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = api.valet.getRetrievalQueue.useQuery(
    { sessionId },
    { enabled: !!sessionId && !!token, refetchInterval: 10000 }
  );

  // Search guests for check-in
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

  // Search guests for collection
  const collectionSearchMutation = api.valet.searchGuests.useMutation({
    onSuccess: (data) => {
      setCollectionSearchResults(data);
      if (data.length === 0) {
        toast.info("لم يتم العثور على نتائج");
      }
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في البحث");
    },
  });

  // Get guest by QR for check-in
  const qrMutation = api.valet.getGuestByQR.useMutation({
    onSuccess: (data) => {
      stopScanner();
      if (scanMode === "checkin") {
        setParkDialog({
          registrationId: data.registrationId,
          sessionId: data.sessionId,
          name: data.name,
          phone: data.phone ?? null,
        });
      } else {
        // Collection mode - request retrieval
        if (data.valetRecord?.status === "parked") {
          requestRetrievalMutation.mutate({ registrationId: data.registrationId });
        } else if (data.valetRecord?.status === "requested" || data.valetRecord?.status === "ready") {
          toast.info(`السيارة في طابور الاسترجاع - تذكرة #${data.valetRecord.ticketNumber ?? "N/A"}`);
        } else if (data.valetRecord?.status === "retrieved") {
          toast.error("تم استلام السيارة مسبقاً");
        } else {
          toast.error("السيارة لم يتم ركنها بعد");
        }
      }
    },
    onError: (error) => {
      toast.error(error.message || "رمز QR غير صالح");
    },
  });

  // Park vehicle mutation
  const parkMutation = api.valet.parkVehicle.useMutation({
    onSuccess: (data) => {
      toast.success(`تم ركن السيارة بنجاح - تذكرة #${data.ticketNumber}`);
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

  // Request retrieval mutation (for valet)
  const requestRetrievalMutation = api.valet.valetRequestRetrieval.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.message} - تذكرة #${data.ticketNumber ?? "N/A"}`);
      setCollectionSearchResults([]);
      setCollectionSearchQuery("");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(error.message || "فشل طلب الاسترجاع");
    },
  });

  // Mark as fetching mutation
  const markFetchingMutation = api.valet.markVehicleFetching.useMutation({
    onSuccess: () => {
      toast.success("جاري إحضار السيارة");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الحالة");
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
  const startScanner = async (mode: "checkin" | "collection") => {
    setScannerError(null);
    setScanMode(mode);
    if (mode === "checkin") {
      setShowScanner(true);
    } else {
      setShowCollectionScanner(true);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetector }).BarcodeDetector({ formats: ["qr_code"] });
          scanFrame(barcodeDetector);
        } else {
          setScannerError("متصفحك لا يدعم مسح رموز QR. استخدم البحث بدلاً من ذلك.");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      setScannerError("لا يمكن الوصول للكاميرا. تأكد من منح الإذن.");
    }
  };

  interface BarcodeDetector {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
  }

  const scanFrame = async (detector: BarcodeDetector) => {
    if (!videoRef.current || (!showScanner && !showCollectionScanner)) return;

    try {
      const barcodes = await detector.detect(videoRef.current);
      if (barcodes.length > 0) {
        const qrData = barcodes[0].rawValue;
        qrMutation.mutate({ qrData });
        return;
      }
    } catch {
      // Continue scanning
    }

    if (showScanner || showCollectionScanner) {
      requestAnimationFrame(() => scanFrame(detector));
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
    setShowCollectionScanner(false);
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

  const handleCollectionSearch = () => {
    if (!collectionSearchQuery.trim()) {
      toast.error("الرجاء إدخال كلمة للبحث");
      return;
    }
    collectionSearchMutation.mutate({ sessionId, query: collectionSearchQuery.trim() });
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
      case "fetching":
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">جاري الإحضار</Badge>;
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
  const fetchingItems = queue?.filter((q) => q.status === "fetching") ?? [];
  const readyItems = queue?.filter((q) => q.status === "ready") ?? [];
  const totalQueueCount = requestedItems.length + fetchingItems.length + readyItems.length;

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

  // Scanner component (shared between checkin and collection)
  const ScannerView = ({ mode }: { mode: "checkin" | "collection" }) => (
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
  );

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
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="checkin" className="text-sm">
            <ParkingSquare className="h-4 w-4 ml-1" />
            تسجيل
          </TabsTrigger>
          <TabsTrigger value="collection" className="text-sm">
            <CarFront className="h-4 w-4 ml-1" />
            طلب استرجاع
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-sm relative">
            <Clock className="h-4 w-4 ml-1" />
            الطابور
            {totalQueueCount > 0 && (
              <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {totalQueueCount}
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
                <ScannerView mode="checkin" />
              ) : (
                <button
                  onClick={() => startScanner("checkin")}
                  className="w-full p-6 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-3 rounded-full bg-primary/10">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">مسح رمز QR لركن السيارة</p>
                    <p className="text-sm text-muted-foreground">
                      امسح رمز تسجيل الضيف
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
                  placeholder="الاسم، الهاتف، أو البريد..."
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
                      className="flex items-center justify-between p-3 rounded-lg border bg-white"
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
                            <p className="text-sm text-muted-foreground" dir="ltr">
                              {guest.phone}
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

        {/* Collection Tab */}
        <TabsContent value="collection" className="mt-4 space-y-4">
          {/* QR Scanner for Collection */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {showCollectionScanner ? (
                <ScannerView mode="collection" />
              ) : (
                <button
                  onClick={() => startScanner("collection")}
                  className="w-full p-6 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-3 rounded-full bg-amber-100">
                    <Camera className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">مسح رمز QR لطلب الاسترجاع</p>
                    <p className="text-sm text-muted-foreground">
                      امسح رمز الضيف لإضافة سيارته للطابور
                    </p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Search for Collection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                البحث لطلب استرجاع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="الاسم، الهاتف، أو البريد..."
                  value={collectionSearchQuery}
                  onChange={(e) => setCollectionSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCollectionSearch()}
                  className="h-12 text-base"
                />
                <Button onClick={handleCollectionSearch} disabled={collectionSearchMutation.isPending} size="lg">
                  {collectionSearchMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Collection Search Results */}
              {collectionSearchResults.length > 0 && (
                <div className="space-y-2">
                  {collectionSearchResults.map((guest) => (
                    <div
                      key={guest.registrationId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white"
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
                            <p className="text-sm text-muted-foreground" dir="ltr">
                              {guest.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(guest.valetStatus)}
                        {guest.valetStatus === "parked" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => requestRetrievalMutation.mutate({ registrationId: guest.registrationId })}
                            disabled={requestRetrievalMutation.isPending}
                          >
                            {requestRetrievalMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CarFront className="h-4 w-4 ml-1" />
                                طلب
                              </>
                            )}
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
          ) : totalQueueCount === 0 ? (
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
                    {requestedItems.map((item) => (
                      <Card
                        key={item.id}
                        className={item.isVip ? "border-amber-200 bg-amber-50/50" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.ticketNumber !== null && (
                                  <span className="inline-flex items-center gap-1 text-sm font-bold bg-primary text-white px-2 py-0.5 rounded">
                                    <Ticket className="h-3 w-3" />
                                    {item.ticketNumber}
                                  </span>
                                )}
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
                              onClick={() => markFetchingMutation.mutate({ valetRecordId: item.id })}
                              disabled={markFetchingMutation.isPending}
                              className="shrink-0"
                            >
                              {markFetchingMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  إحضار
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

              {/* Fetching Section */}
              {fetchingItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Car className="h-4 w-4 text-orange-500 animate-pulse" />
                      جاري الإحضار
                    </h3>
                    <Badge variant="secondary">{fetchingItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {fetchingItems.map((item) => (
                      <Card
                        key={item.id}
                        className={item.isVip ? "border-amber-200 bg-amber-50/50" : "bg-orange-50/50 border-orange-200"}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.ticketNumber !== null && (
                                  <span className="inline-flex items-center gap-1 text-sm font-bold bg-orange-500 text-white px-2 py-0.5 rounded">
                                    <Ticket className="h-3 w-3" />
                                    {item.ticketNumber}
                                  </span>
                                )}
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
                                {item.parkingSlot && (
                                  <span className="text-muted-foreground">
                                    موقع: {item.parkingSlot}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => markReadyMutation.mutate({ valetRecordId: item.id })}
                              disabled={markReadyMutation.isPending}
                              className="shrink-0 bg-green-600 hover:bg-green-700"
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
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.ticketNumber !== null && (
                                  <span className="inline-flex items-center gap-1 text-sm font-bold bg-green-600 text-white px-2 py-0.5 rounded">
                                    <Ticket className="h-3 w-3" />
                                    {item.ticketNumber}
                                  </span>
                                )}
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
              <Label htmlFor="slot">موقع الركن (اختياري)</Label>
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
