"use client";

import React, { use, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserLabelManager } from "@/components/admin/user-label-manager";
import { UserNotes } from "@/components/admin/user-notes";
import { UserAvatar } from "@/components/user-avatar";
import { formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import { HOSTING_TYPES } from "@/lib/constants";
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Tag,
  ExternalLink,
  Shield,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
  StickyNote,
  Camera,
  Loader2,
  Trash2,
  Pencil,
  HandCoins,
} from "lucide-react";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { getSponsorshipTypeLabel, getSponsorTypeLabel } from "@/lib/constants";

// Helper to check if value is a custom hex color
const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

// Background style classes for logos
const logoBgClasses: Record<string, string> = {
  transparent: "bg-muted",
  dark: "bg-gray-900",
  light: "bg-white",
  primary: "bg-primary",
};

// Helper to get the primary sponsor link
function getSponsorLink(socialMediaLinks: Record<string, string> | null | undefined): string | null {
  if (!socialMediaLinks) return null;
  const priorityOrder = ["website", "twitter", "instagram", "linkedin"];
  for (const key of priorityOrder) {
    if (socialMediaLinks[key]) return socialMediaLinks[key];
  }
  const values = Object.values(socialMediaLinks).filter(Boolean);
  return values.length > 0 ? values[0] : null;
}

// Sponsor Logo component with presigned URL support
function SponsorLogo({
  logoUrl,
  name,
  type,
  logoBackground = "transparent",
}: {
  logoUrl: string | null;
  name: string;
  type: string;
  logoBackground?: string;
}) {
  const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

  const isCustomColor = isHexColor(logoBackground);
  const bgClass = isCustomColor ? "" : (logoBgClasses[logoBackground] || logoBgClasses.transparent);

  if (logoUrl && presignedUrl) {
    return (
      <div
        className={`relative h-12 w-12 rounded-lg overflow-hidden border flex-shrink-0 ${bgClass}`}
        style={isCustomColor ? { backgroundColor: logoBackground } : undefined}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <img
            src={presignedUrl}
            alt={name}
            className="h-full w-full object-contain p-1"
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      {type === "company" ? (
        <Building2 className="h-6 w-6 text-primary/60" />
      ) : (
        <User className="h-6 w-6 text-primary/60" />
      )}
    </div>
  );
}

// Edit form data type for comprehensive edit
interface EditFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  position: string;
  activityType: string;
  instagram: string;
  snapchat: string;
  twitter: string;
  gender: "male" | "female" | "";
  goal: string;
  wantsToHost: boolean;
  hostingTypes: string[];
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const currentUserId = session?.user?.id;

  const { isExpanded, toggleRow } = useExpandableRows();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);

  const { data: user, isLoading, refetch } = api.admin.getUserById.useQuery({ id });

  // Admin avatar upload mutations
  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();
  const updateUserAvatar = api.admin.updateUserAvatar.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصورة الشخصية");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الصورة");
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG, PNG أو WebP");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        imageType: "avatar",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: user.id,
      });

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("فشل رفع الصورة");
      }

      // Step 3: Update user avatar URL
      await updateUserAvatar.mutateAsync({
        userId: user.id,
        avatarUrl: publicUrl,
      });
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("فشل رفع الصورة الشخصية");
    } finally {
      setIsUploadingAvatar(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      await updateUserAvatar.mutateAsync({
        userId: user.id,
        avatarUrl: null,
      });
    } catch (error) {
      console.error("Remove avatar failed:", error);
    }
  };

  // Edit mutations
  const updateUserMutation = api.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم");
      refetch();
      setEditDialogOpen(false);
      setEditForm(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateManualUserMutation = api.admin.updateManualUser.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم");
      refetch();
      setEditDialogOpen(false);
      setEditForm(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Open edit dialog
  const openEditDialog = () => {
    if (!user) return;
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName || "",
      position: user.position || "",
      activityType: user.activityType || "",
      instagram: user.instagram || "",
      snapchat: user.snapchat || "",
      twitter: user.twitter || "",
      gender: (user.gender as "male" | "female" | "") || "",
      goal: user.goal || "",
      wantsToHost: user.wantsToHost || false,
      hostingTypes: user.hostingTypes || [],
    });
    setEditDialogOpen(true);
  };

  // Handle edit form submit
  const handleEditSubmit = () => {
    if (!editForm || !user) return;

    if (isSuperAdmin) {
      // Super admin uses comprehensive update
      updateUserMutation.mutate({
        userId: user.id,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        companyName: editForm.companyName || null,
        position: editForm.position || null,
        activityType: editForm.activityType || null,
        instagram: editForm.instagram || null,
        snapchat: editForm.snapchat || null,
        twitter: editForm.twitter || null,
        gender: editForm.gender || null,
        goal: editForm.goal || null,
        wantsToHost: editForm.wantsToHost,
        hostingTypes: editForm.hostingTypes,
      });
    } else {
      // Regular admin uses simple update (only for manual users)
      updateManualUserMutation.mutate({
        userId: user.id,
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone,
        companyName: editForm.companyName || undefined,
        position: editForm.position || undefined,
      });
    }
  };

  // Handle hosting type toggle
  const handleHostingTypeToggle = (type: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      hostingTypes: editForm.hostingTypes.includes(type)
        ? editForm.hostingTypes.filter((t) => t !== type)
        : [...editForm.hostingTypes, type],
    });
  };

  // Determine if edit button should be visible
  const canEdit = user && (
    // Super admin can edit any user except other super admins (can edit self)
    (isSuperAdmin && (user.role !== "SUPER_ADMIN" || user.id === currentUserId)) ||
    // Regular admin can only edit manually created users
    (!isSuperAdmin && user.isManuallyCreated)
  );

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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">المستخدم غير موجود</h2>
        <Button asChild>
          <Link href="/admin/users">العودة للمستخدمين</Link>
        </Button>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">مدير رئيسي</Badge>;
      case "ADMIN":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">مدير</Badge>;
      default:
        return <Badge variant="secondary">مستخدم</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {/* Avatar with upload */}
          <div className="relative group">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-muted">
              <UserAvatar
                avatarUrl={user.avatarUrl}
                name={user.name}
                size="lg"
                className="h-full w-full"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {getRoleBadge(user.role)}
              {user.isActive ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                  <UserCheck className="h-3 w-3 me-1" />
                  نشط
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                  <UserX className="h-3 w-3 me-1" />
                  معطل
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>انضم في {formatArabicDate(new Date(user.createdAt))}</span>
              {user.avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={updateUserAvatar.isPending}
                  className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                >
                  {updateUserAvatar.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  حذف الصورة
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Edit button */}
        {canEdit && (
          <Button variant="outline" onClick={openEditDialog}>
            <Pencil className="me-2 h-4 w-4" />
            تعديل البيانات
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">التسجيلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.totalRegistrations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الحضور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{user.stats.totalAttendances}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user.stats.totalRegistrations > 0
                ? `${Math.round((user.stats.totalAttendances / user.stats.totalRegistrations) * 100)}%`
                : "0%"}{" "}
              معدل الحضور
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المرافقين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{user.stats.totalCompanions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">طلبات الضيافة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{user.stats.hostingRequests}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات المستخدم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" dir="ltr">{user.phone}</span>
              </div>
            )}
            {user.companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.companyName}</span>
              </div>
            )}
            {user.position && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.position}</span>
              </div>
            )}
            {user.twitter && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={user.twitter.startsWith("http") ? user.twitter : `https://twitter.com/${user.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  X (Twitter)
                </a>
              </div>
            )}
            {user.instagram && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={user.instagram.startsWith("http") ? user.instagram : `https://instagram.com/${user.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Instagram
                </a>
              </div>
            )}
            {user.snapchat && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Snapchat: {user.snapchat}</span>
              </div>
            )}
            {user.wantsToHost && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">يرغب بتقديم الضيافة</span>
              </div>
            )}

            {/* Labels */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  التصنيفات
                </span>
                <UserLabelManager
                  userId={user.id}
                  userLabels={user.labels}
                  onUpdate={() => refetch()}
                  trigger={
                    <Button variant="ghost" size="sm">
                      تعديل
                    </Button>
                  }
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.labels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">لا توجد تصنيفات</span>
                ) : (
                  user.labels.map((label) => (
                    <Badge
                      key={label.id}
                      style={{
                        backgroundColor: label.color + "20",
                        color: label.color,
                        borderColor: label.color + "40",
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  الملاحظات
                  {user.notes && user.notes.length > 0 && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {user.notes.length}
                    </span>
                  )}
                </span>
                <UserNotes
                  userId={user.id}
                  notes={user.notes}
                  noteCount={user.notes?.length ?? 0}
                  onUpdate={() => refetch()}
                  trigger={
                    <Button variant="ghost" size="sm">
                      {user.notes && user.notes.length > 0 ? "عرض الكل" : "إضافة"}
                    </Button>
                  }
                />
              </div>
              {user.notes && user.notes.length > 0 ? (
                <div className="space-y-2">
                  {user.notes.slice(0, 2).map((note) => (
                    <div key={note.id} className="text-sm bg-muted/50 p-2 rounded">
                      <p className="line-clamp-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdBy.name}
                      </p>
                    </div>
                  ))}
                  {user.notes.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{user.notes.length - 2} ملاحظات أخرى
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
              )}
            </div>

            {/* Linked Sponsors */}
            {user.sponsors && user.sponsors.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <HandCoins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">الرعايات المرتبطة</span>
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {user.sponsors.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {user.sponsors.map((sponsor) => {
                    const sponsorLink = getSponsorLink(sponsor.socialMediaLinks as Record<string, string> | null);
                    return (
                      <div
                        key={sponsor.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <Link href={`/admin/sponsors/${sponsor.id}`}>
                          <SponsorLogo
                            logoUrl={sponsor.logoUrl}
                            name={sponsor.name}
                            type={sponsor.type}
                            logoBackground={sponsor.logoBackground ?? "transparent"}
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/sponsors/${sponsor.id}`}
                              className="font-medium text-sm hover:underline"
                            >
                              {sponsor.name}
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              {getSponsorTypeLabel(sponsor.type)}
                            </Badge>
                            {sponsorLink && (
                              <a
                                href={sponsorLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sponsor.sponsorshipTypes.slice(0, 2).map((type) => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="text-xs bg-primary/10 text-primary"
                              >
                                {getSponsorshipTypeLabel(type)}
                              </Badge>
                            ))}
                            {sponsor.sponsorshipTypes.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{sponsor.sponsorshipTypes.length - 2}
                              </Badge>
                            )}
                          </div>
                          {sponsor.eventSponsorships.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {sponsor.eventSponsorships.length} رعاية
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              سجل التسجيلات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {user.registrations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>لا توجد تسجيلات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحدث</TableHead>
                    <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                    <TableHead className="hidden md:table-cell">المرافقين</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">الحضور</TableHead>
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.registrations.map((reg) => {
                    const expanded = isExpanded(reg.id);
                    return (
                      <React.Fragment key={reg.id}>
                        <TableRow>
                          <TableCell>
                            <Link
                              href={`/admin/sessions/${reg.session.id}`}
                              className="font-medium hover:underline"
                            >
                              {reg.session.title}
                            </Link>
                            <p className="text-xs text-muted-foreground hidden md:block">
                              #{reg.session.sessionNumber}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatArabicDate(new Date(reg.session.date))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {reg.invitedRegistrations.length > 0 ? (
                              <Badge variant="outline">
                                {reg.invitedRegistrations.length} مرافق
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={reg.isApproved ? "default" : "outline"}
                              className={
                                reg.isApproved
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : "bg-orange-500/10 text-orange-600 border-orange-200"
                              }
                            >
                              {reg.isApproved ? "مؤكد" : "معلق"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {reg.attendance?.attended ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 me-1" />
                                حضر
                              </Badge>
                            ) : new Date(reg.session.date) < new Date() ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                                لم يحضر
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Clock className="h-3 w-3 me-1" />
                                قادم
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(reg.id)}
                            >
                              {expanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        <tr className="md:hidden">
                          <td colSpan={3} className="p-0">
                            <div
                              className={cn(
                                "grid transition-all duration-300 ease-in-out",
                                expanded
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0"
                              )}
                            >
                              <div className="overflow-hidden">
                                <div className="p-4 bg-muted/30 border-b space-y-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">رقم الحدث:</span>
                                    <span className="mr-1">#{reg.session.sessionNumber}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">التاريخ:</span>
                                    <span className="mr-1">{formatArabicDate(new Date(reg.session.date))}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">المرافقين:</span>
                                    <span className="mr-1">
                                      {reg.invitedRegistrations.length > 0
                                        ? `${reg.invitedRegistrations.length} مرافق`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">الحضور:</span>
                                    <span className="mr-1">
                                      {reg.attendance?.attended ? (
                                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                          <CheckCircle className="h-3 w-3 me-1" />
                                          حضر
                                        </Badge>
                                      ) : new Date(reg.session.date) < new Date() ? (
                                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                                          لم يحضر
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground">
                                          <Clock className="h-3 w-3 me-1" />
                                          قادم
                                        </Badge>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              {isSuperAdmin
                ? "تعديل جميع بيانات المستخدم"
                : "تعديل بيانات المستخدم المضاف يدوياً"}
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 py-4">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  المعلومات الأساسية
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">الاسم *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="الاسم الكامل"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">رقم الهاتف *</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-email">البريد الإلكتروني *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      placeholder="example@domain.com"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Info Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  المعلومات المهنية
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-company">الشركة</Label>
                    <Input
                      id="edit-company"
                      value={editForm.companyName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, companyName: e.target.value })
                      }
                      placeholder="اسم الشركة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position">المنصب</Label>
                    <Input
                      id="edit-position"
                      value={editForm.position}
                      onChange={(e) =>
                        setEditForm({ ...editForm, position: e.target.value })
                      }
                      placeholder="المسمى الوظيفي"
                    />
                  </div>
                  {isSuperAdmin && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="edit-activity">نوع النشاط</Label>
                      <Input
                        id="edit-activity"
                        value={editForm.activityType}
                        onChange={(e) =>
                          setEditForm({ ...editForm, activityType: e.target.value })
                        }
                        placeholder="نوع النشاط التجاري"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Super Admin only sections */}
              {isSuperAdmin && (
                <>
                  {/* Social Media Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      التواصل الاجتماعي
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit-instagram">Instagram</Label>
                        <Input
                          id="edit-instagram"
                          value={editForm.instagram}
                          onChange={(e) =>
                            setEditForm({ ...editForm, instagram: e.target.value })
                          }
                          placeholder="اسم المستخدم"
                          dir="ltr"
                          className="text-left"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-snapchat">Snapchat</Label>
                        <Input
                          id="edit-snapchat"
                          value={editForm.snapchat}
                          onChange={(e) =>
                            setEditForm({ ...editForm, snapchat: e.target.value })
                          }
                          placeholder="اسم المستخدم"
                          dir="ltr"
                          className="text-left"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-twitter">X (Twitter)</Label>
                        <Input
                          id="edit-twitter"
                          value={editForm.twitter}
                          onChange={(e) =>
                            setEditForm({ ...editForm, twitter: e.target.value })
                          }
                          placeholder="اسم المستخدم"
                          dir="ltr"
                          className="text-left"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Info Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      معلومات شخصية
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-gender">الجنس</Label>
                        <Select
                          value={editForm.gender || "none"}
                          onValueChange={(value) =>
                            setEditForm({
                              ...editForm,
                              gender: value === "none" ? "" : (value as "male" | "female"),
                            })
                          }
                        >
                          <SelectTrigger id="edit-gender">
                            <SelectValue placeholder="اختر الجنس" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">غير محدد</SelectItem>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-goal">الهدف</Label>
                      <Textarea
                        id="edit-goal"
                        value={editForm.goal}
                        onChange={(e) =>
                          setEditForm({ ...editForm, goal: e.target.value })
                        }
                        placeholder="الهدف من الانضمام..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Hosting Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      الضيافة
                    </h3>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-wants-host" className="cursor-pointer">
                        يرغب بتقديم الضيافة
                      </Label>
                      <Switch
                        id="edit-wants-host"
                        checked={editForm.wantsToHost}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, wantsToHost: checked })
                        }
                      />
                    </div>
                    {editForm.wantsToHost && (
                      <div className="space-y-2">
                        <Label>أنواع الضيافة</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {HOSTING_TYPES.map((type) => (
                            <div key={type.value} className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                id={`hosting-${type.value}`}
                                checked={editForm.hostingTypes.includes(type.value)}
                                onCheckedChange={() => handleHostingTypeToggle(type.value)}
                              />
                              <Label
                                htmlFor={`hosting-${type.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {type.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                updateUserMutation.isPending ||
                updateManualUserMutation.isPending ||
                !editForm?.name ||
                !editForm?.phone ||
                !editForm?.email
              }
            >
              {(updateUserMutation.isPending || updateManualUserMutation.isPending) ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="me-2 h-4 w-4" />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
