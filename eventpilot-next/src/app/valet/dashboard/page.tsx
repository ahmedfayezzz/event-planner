"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ParkingSquare,
  CheckCircle,
  Crown,
} from "lucide-react";

// We need to pass the token in headers for valet procedures
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
  valetStatus: string | null;
  isVip: boolean;
}

interface ParkDialogData {
  registrationId: string;
  sessionId: string;
  name: string;
  phone: string | null;
}

export default function ValetDashboardPage() {
  const token = useValetToken();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
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

  // Fetch active sessions with valet enabled
  const { data: sessions, isLoading: sessionsLoading } = api.session.getActive.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter sessions with valet enabled
  const valetSessions = sessions?.filter((s) => s.valetEnabled) ?? [];

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

  // Park vehicle mutation
  const parkMutation = api.valet.parkVehicle.useMutation({
    onSuccess: () => {
      toast.success("تم ركن السيارة بنجاح");
      setParkDialog(null);
      setVehicleInfo({ make: "", model: "", color: "", plate: "", slot: "" });
      // Refresh search results
      if (selectedSessionId && searchQuery) {
        searchMutation.mutate({ sessionId: selectedSessionId, query: searchQuery });
      }
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

  const handleSearch = () => {
    if (!selectedSessionId) {
      toast.error("الرجاء اختيار حدث أولاً");
      return;
    }
    if (!searchQuery.trim()) {
      toast.error("الرجاء إدخال اسم للبحث");
      return;
    }
    searchMutation.mutate({ sessionId: selectedSessionId, query: searchQuery.trim() });
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

  if (!token) {
    return null; // Will redirect in layout
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">ابحث عن الضيوف وقم بركن سياراتهم</p>
      </div>

      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختر الحدث</CardTitle>
          <CardDescription>اختر الحدث الذي تعمل عليه</CardDescription>
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {valetSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  className={`p-4 rounded-lg border-2 text-right transition-all ${
                    selectedSessionId === session.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(session.date).toLocaleDateString("ar-SA")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      {selectedSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">البحث عن ضيف</CardTitle>
            <CardDescription>ابحث بالاسم للعثور على الضيف</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="ابحث باسم الضيف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
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
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{guest.name}</p>
                          {guest.isVip && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        {guest.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {guest.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(guest.valetStatus)}
                      {(!guest.valetStatus || guest.valetStatus === "expected") && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setParkDialog({
                              registrationId: guest.registrationId,
                              sessionId: selectedSessionId,
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
      )}

      {/* Park Vehicle Dialog */}
      <Dialog open={!!parkDialog} onOpenChange={(open) => !open && setParkDialog(null)}>
        <DialogContent className="max-w-md">
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
                  className="text-left"
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
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
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
