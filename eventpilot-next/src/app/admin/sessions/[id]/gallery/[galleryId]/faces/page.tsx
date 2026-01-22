"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowRight,
  User,
  UserPlus,
  Check,
  Share2,
  MessageCircle,
  Mail,
  Eye,
  Loader2,
  Images,
  ExternalLink,
  ChevronsUpDown,
} from "lucide-react";

const shareStatusLabels: Record<string, string> = {
  pending: "لم يتم المشاركة",
  shared: "تمت المشاركة",
  viewed: "تم العرض",
};

const shareStatusColors: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-600 border-gray-200",
  shared: "bg-blue-500/10 text-blue-600 border-blue-200",
  viewed: "bg-green-500/10 text-green-600 border-green-200",
};

export default function FaceClustersPage({
  params,
}: {
  params: Promise<{ id: string; galleryId: string }>;
}) {
  const { id: sessionId, galleryId } = use(params);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<"user" | "manual" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const utils = api.useUtils();

  const { data: gallery } = api.gallery.getById.useQuery({ galleryId });
  const { data: clusters, isLoading } = api.gallery.getClusters.useQuery({
    galleryId,
    filter: "all",
  });
  const { data: attendees, isLoading: attendeesLoading } = api.gallery.getSessionAttendees.useQuery({ galleryId });
  const { data: shareStatus } = api.gallery.getShareStatus.useQuery({ galleryId });

  const assignToUserMutation = api.gallery.assignClusterToUser.useMutation({
    onSuccess: async () => {
      toast.success("تم تعيين الشخص بنجاح");
      closeDialog();
      await utils.gallery.getClusters.invalidate({ galleryId });
      await utils.gallery.getShareStatus.invalidate({ galleryId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل التعيين");
    },
  });

  const assignManuallyMutation = api.gallery.assignClusterManually.useMutation({
    onSuccess: async () => {
      toast.success("تم تعيين الشخص بنجاح");
      closeDialog();
      await utils.gallery.getClusters.invalidate({ galleryId });
      await utils.gallery.getShareStatus.invalidate({ galleryId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل التعيين");
    },
  });

  const shareClusterMutation = api.gallery.shareCluster.useMutation({
    onSuccess: async (data, variables) => {
      if (variables.via === "whatsapp" && data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
      toast.success("تمت المشاركة بنجاح");
      await utils.gallery.getClusters.invalidate({ galleryId });
      await utils.gallery.getShareStatus.invalidate({ galleryId });
    },
    onError: (error) => {
      toast.error(error.message || "فشلت المشاركة");
    },
  });

  const closeDialog = () => {
    setSelectedCluster(null);
    setAssignMode(null);
    setSelectedUserId("");
    setUserSearchOpen(false);
    setManualName("");
    setManualPhone("");
    setManualEmail("");
  };

  const handleAssignToUser = () => {
    if (!selectedCluster || !selectedUserId) return;
    assignToUserMutation.mutate({
      clusterId: selectedCluster,
      userId: selectedUserId,
    });
  };

  const handleAssignManually = () => {
    if (!selectedCluster || !manualName) return;
    assignManuallyMutation.mutate({
      clusterId: selectedCluster,
      name: manualName,
      phone: manualPhone || undefined,
      email: manualEmail || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const assignedClusters = clusters?.filter((c) => c.userId || c.manualName) || [];
  const unassignedClusters = clusters?.filter((c) => !c.userId && !c.manualName) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${sessionId}/gallery/${galleryId}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إدارة الوجوه</h1>
            <p className="text-muted-foreground">{gallery?.title || "معرض الصور"}</p>
          </div>
        </div>
      </div>

      {/* Share Status Summary */}
      {shareStatus && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{shareStatus.total}</div>
              <p className="text-sm text-muted-foreground">إجمالي الأشخاص</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{shareStatus.pending}</div>
              <p className="text-sm text-muted-foreground">لم تتم المشاركة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{shareStatus.shared}</div>
              <p className="text-sm text-muted-foreground">تمت المشاركة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{shareStatus.viewed}</div>
              <p className="text-sm text-muted-foreground">تم العرض</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="unassigned" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unassigned">
            غير معين ({unassignedClusters.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            تم التعيين ({assignedClusters.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            الكل ({clusters?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unassigned">
          <ClusterGrid
            clusters={unassignedClusters}
            onAssign={(id) => {
              setSelectedCluster(id);
              setAssignMode(null);
            }}
            onShare={(id, via) => shareClusterMutation.mutate({ clusterId: id, via })}
            shareLoading={shareClusterMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="assigned">
          <ClusterGrid
            clusters={assignedClusters}
            onAssign={(id) => {
              setSelectedCluster(id);
              setAssignMode(null);
            }}
            onShare={(id, via) => shareClusterMutation.mutate({ clusterId: id, via })}
            shareLoading={shareClusterMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="all">
          <ClusterGrid
            clusters={clusters || []}
            onAssign={(id) => {
              setSelectedCluster(id);
              setAssignMode(null);
            }}
            onShare={(id, via) => shareClusterMutation.mutate({ clusterId: id, via })}
            shareLoading={shareClusterMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={selectedCluster !== null} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعيين الشخص</DialogTitle>
            <DialogDescription>
              اختر طريقة التعيين
            </DialogDescription>
          </DialogHeader>

          {!assignMode && (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => setAssignMode("user")}
              >
                <User className="ml-3 h-5 w-5" />
                <div className="text-right">
                  <p className="font-medium">عضو مسجل</p>
                  <p className="text-sm text-muted-foreground">اختر من قائمة الحضور</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => setAssignMode("manual")}
              >
                <UserPlus className="ml-3 h-5 w-5" />
                <div className="text-right">
                  <p className="font-medium">إدخال يدوي</p>
                  <p className="text-sm text-muted-foreground">أضف اسم ومعلومات التواصل</p>
                </div>
              </Button>
            </div>
          )}

          {assignMode === "user" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اختر العضو</Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedUserId ? (
                        <div className="flex items-center gap-2">
                          {attendees?.find((u) => u.id === selectedUserId)?.avatarUrl && (
                            <Image
                              src={attendees.find((u) => u.id === selectedUserId)!.avatarUrl!}
                              alt=""
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          <span>{attendees?.find((u) => u.id === selectedUserId)?.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">ابحث بالاسم أو الهاتف أو البريد...</span>
                      )}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="ابحث بالاسم أو الهاتف أو البريد..." />
                      <CommandList>
                        {attendeesLoading ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            جاري التحميل...
                          </div>
                        ) : !attendees || attendees.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            لا يوجد مسجلين في هذه الجلسة
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>لا يوجد نتائج مطابقة</CommandEmpty>
                            <CommandGroup heading={`${attendees.length} مسجل`}>
                              {attendees.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.name} ${user.phone || ""} ${user.email || ""}`}
                                  onSelect={() => {
                                    setSelectedUserId(user.id);
                                    setUserSearchOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    {user.avatarUrl ? (
                                      <Image
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium truncate">{user.name}</p>
                                        {user.attended && (
                                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                            حاضر
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {user.phone || user.email || ""}
                                      </p>
                                    </div>
                                    {selectedUserId === user.id && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setAssignMode(null)}>
                  رجوع
                </Button>
                <Button
                  onClick={handleAssignToUser}
                  disabled={!selectedUserId || assignToUserMutation.isPending}
                >
                  {assignToUserMutation.isPending && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  تعيين
                </Button>
              </DialogFooter>
            </div>
          )}

          {assignMode === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="اسم الشخص"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف (للواتساب)</Label>
                <Input
                  id="phone"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="+966..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setAssignMode(null)}>
                  رجوع
                </Button>
                <Button
                  onClick={handleAssignManually}
                  disabled={!manualName || assignManuallyMutation.isPending}
                >
                  {assignManuallyMutation.isPending && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  تعيين
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ClusterGridProps {
  clusters: Array<{
    id: string;
    autoLabel: string | null;
    manualName: string | null;
    faceCount: number;
    representativeFaceUrl: string | null;
    shareStatus: string;
    publicToken: string;
    viewCount: number;
    matchConfidence: number | null;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
    faces: Array<{
      clusterSimilarity: number | null;
      faceThumbnailUrl: string | null;
      image: {
        imageUrl: string;
      };
    }>;
  }>;
  onAssign: (clusterId: string) => void;
  onShare: (clusterId: string, via: "whatsapp" | "email") => void;
  shareLoading: boolean;
}

function ClusterGrid({ clusters, onAssign, onShare, shareLoading }: ClusterGridProps) {
  if (clusters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
          <p className="text-muted-foreground">
            لم يتم العثور على أشخاص في هذه الفئة
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {clusters.map((cluster) => {
        const displayName = cluster.user?.name || cluster.manualName || cluster.autoLabel || "شخص غير معروف";
        const imageUrl = cluster.representativeFaceUrl || cluster.faces[0]?.image.imageUrl;
        const isAssigned = cluster.user || cluster.manualName;
        const canShare = isAssigned && (cluster.user || cluster.manualName);

        // Compute min similarity for debugging (excluding seed face at 100%)
        const similarities = cluster.faces
          .map((f) => f.clusterSimilarity)
          .filter((s): s is number => s !== null && s < 100);
        const minSimilarity = similarities.length > 0 ? Math.min(...similarities) : null;

        return (
          <Card key={cluster.id} className="overflow-hidden">
            <div className="relative aspect-square bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <Badge variant="secondary" className="text-xs">
                  <Images className="h-3 w-3 ml-1" />
                  {cluster.faceCount}
                </Badge>
                {process.env.NODE_ENV === "development" && minSimilarity !== null && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      minSimilarity >= 95
                        ? "bg-green-500/20 text-green-700 border-green-300"
                        : minSimilarity >= 90
                        ? "bg-yellow-500/20 text-yellow-700 border-yellow-300"
                        : "bg-red-500/20 text-red-700 border-red-300"
                    }`}
                    title={`Min similarity: ${minSimilarity.toFixed(1)}%`}
                  >
                    {minSimilarity.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {cluster.user?.avatarUrl && (
                    <Image
                      src={cluster.user.avatarUrl}
                      alt={cluster.user.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <p className="font-medium text-sm truncate flex-1">{displayName}</p>
                  {isAssigned && (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs ${shareStatusColors[cluster.shareStatus]}`}
                  >
                    {shareStatusLabels[cluster.shareStatus]}
                  </Badge>
                  {cluster.viewCount > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {cluster.viewCount}
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => onAssign(cluster.id)}
                  >
                    <UserPlus className="h-3 w-3 ml-1" />
                    {isAssigned ? "تعديل" : "تعيين"}
                  </Button>
                  {canShare && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onShare(cluster.id, "whatsapp")}
                      disabled={shareLoading}
                      title="مشاركة عبر واتساب"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`/photos/${cluster.publicToken}`, "_blank")}
                    title="فتح صفحة الصور"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
