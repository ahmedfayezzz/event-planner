"use client";

import React, { use, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { cn, formatArabicDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Building2,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Globe,
  EyeOff,
  Pencil,
  User,
  FileText,
  Link2,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react";
import { GuestSocialMedia } from "@/components/admin/guest-social-media";
import { toast } from "sonner";

// Component to display guest image with presigned URL and upload/remove functionality
function GuestProfileImage({
  imageUrl,
  name,
  onUploadClick,
  onRemove,
  isUploading,
  isRemoving,
}: {
  imageUrl: string | null;
  name: string;
  onUploadClick: () => void;
  onRemove: () => void;
  isUploading: boolean;
  isRemoving: boolean;
}) {
  const { url, isLoading } = usePresignedUrl(imageUrl);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <Avatar className="h-24 w-24">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-full" />
          ) : (
            <>
              <AvatarImage src={url || undefined} alt={name} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <button
          onClick={onUploadClick}
          disabled={isUploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
      {imageUrl && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isRemoving}
              className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
            >
              {isRemoving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              حذف الصورة
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف صورة الضيف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف صورة الضيف؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف الصورة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isExpanded, toggleRow } = useExpandableRows();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const utils = api.useUtils();

  // Fetch guest data
  const { data: guest, isLoading, refetch } = api.guest.getById.useQuery({ id });

  // Mutations for image upload
  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();
  const updateGuestMutation = api.guest.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصورة بنجاح");
      refetch();
      utils.guest.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الصورة");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guest) return;

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

    setIsUploadingImage(true);
    try {
      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        imageType: "avatar",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: guest.id,
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

      // Step 3: Update guest image URL
      await updateGuestMutation.mutateAsync({
        id: guest.id,
        imageUrl: publicUrl,
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error("فشل رفع الصورة");
    } finally {
      setIsUploadingImage(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!guest) return;
    try {
      await updateGuestMutation.mutateAsync({
        id: guest.id,
        imageUrl: null,
      });
    } catch (error) {
      console.error("Remove image failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-4">الضيف غير موجود</h2>
        <Button asChild>
          <Link href="/admin/guests">العودة للضيوف</Link>
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
            <Link href="/admin/guests">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                {guest.title && (
                  <span className="text-muted-foreground">{guest.title} </span>
                )}
                {guest.name}
              </h1>
              {guest.isPublic ? (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-600 border-green-200"
                >
                  <Globe className="ml-1 h-3 w-3" />
                  عام
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-gray-500/10 text-gray-600 border-gray-200"
                >
                  <EyeOff className="ml-1 h-3 w-3" />
                  خاص
                </Badge>
              )}
            </div>
            {(guest.jobTitle || guest.company) && (
              <p className="text-muted-foreground mt-1">
                {guest.jobTitle}
                {guest.jobTitle && guest.company && " - "}
                {guest.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/guest/${guest.id}?preview=true`} target="_blank">
              <Eye className="ml-2 h-4 w-4" />
              معاينة
              <ExternalLink className="mr-2 h-3 w-3" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/guests/${id}/edit`}>
              <Pencil className="ml-2 h-4 w-4" />
              تعديل
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Guest Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الضيف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <GuestProfileImage
                  imageUrl={guest.imageUrl}
                  name={guest.name}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onRemove={handleRemoveImage}
                  isUploading={isUploadingImage}
                  isRemoving={updateGuestMutation.isPending && !isUploadingImage}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex-1 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {guest.jobTitle && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">المنصب</p>
                          <p className="font-medium">{guest.jobTitle}</p>
                        </div>
                      </div>
                    )}
                    {guest.company && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Building2 className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">الشركة</p>
                          <p className="font-medium">{guest.company}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">تاريخ الإضافة</p>
                        <p className="font-medium">
                          {formatArabicDate(new Date(guest.createdAt))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الأحداث</p>
                        <p className="font-medium">{guest.sessionGuests.length} حدث</p>
                      </div>
                    </div>
                  </div>
                  {guest.description && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">النبذة</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {guest.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الأحداث المرتبطة</CardTitle>
              <CardDescription>
                الأحداث التي شارك فيها هذا الضيف
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guest.sessionGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لم يشارك هذا الضيف في أي أحداث بعد
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 md:hidden"></TableHead>
                      <TableHead>الحدث</TableHead>
                      <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                      <TableHead className="hidden md:table-cell">الحالة</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guest.sessionGuests.map((sg) => (
                      <React.Fragment key={sg.id}>
                        <TableRow>
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(sg.id)}
                            >
                              {isExpanded(sg.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                #{sg.session.sessionNumber} - {sg.session.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatArabicDate(new Date(sg.session.date))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className={cn(
                                sg.session.visibilityStatus === "active"
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : sg.session.visibilityStatus === "archived"
                                    ? "bg-gray-500/10 text-gray-600 border-gray-200"
                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                              )}
                            >
                              {sg.session.visibilityStatus === "active"
                                ? "منشور"
                                : sg.session.visibilityStatus === "archived"
                                  ? "مؤرشف"
                                  : "مسودة"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/sessions/${sg.session.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Mobile expanded row */}
                        {isExpanded(sg.id) && (
                          <TableRow className="md:hidden bg-muted/30">
                            <TableCell colSpan={3}>
                              <div className="space-y-2 py-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {formatArabicDate(new Date(sg.session.date))}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    sg.session.visibilityStatus === "active"
                                      ? "bg-green-500/10 text-green-600 border-green-200"
                                      : sg.session.visibilityStatus === "archived"
                                        ? "bg-gray-500/10 text-gray-600 border-gray-200"
                                        : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                                  )}
                                >
                                  {sg.session.visibilityStatus === "active"
                                    ? "منشور"
                                    : sg.session.visibilityStatus === "archived"
                                      ? "مؤرشف"
                                      : "مسودة"}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Social Media */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                روابط التواصل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GuestSocialMedia
                guestId={guest.id}
                socialMediaLinks={
                  (guest.socialMediaLinks as Record<string, string>) || {}
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
