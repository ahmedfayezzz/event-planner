"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GUEST_TITLES } from "@/lib/constants";
import {
  ArrowRight,
  Loader2,
  User,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

interface GuestFormData {
  name: string;
  title: string;
  jobTitle: string;
  company: string;
  description: string;
  imageUrl: string;
  isPublic: boolean;
}

const initialFormData: GuestFormData = {
  name: "",
  title: "",
  jobTitle: "",
  company: "",
  description: "",
  imageUrl: "",
  isPublic: false,
};

// Component to display guest image with presigned URL
function GuestEditImage({
  imageUrl,
  name,
  onRemove,
}: {
  imageUrl: string | null;
  name: string;
  onRemove: () => void;
}) {
  const { url, isLoading } = usePresignedUrl(imageUrl);

  if (!imageUrl) {
    return (
      <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-32 w-32">
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-lg" />
      ) : (
        <img
          src={url || undefined}
          alt={name}
          className="h-full w-full rounded-lg object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -left-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function GuestEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState<GuestFormData>(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [useCustomTitle, setUseCustomTitle] = useState(false);

  const utils = api.useUtils();

  // Fetch guest data
  const { data: guest, isLoading } = api.guest.getById.useQuery({ id });

  // Get presigned URL for upload
  const getUploadUrl = api.upload.getPresignedUrl.useMutation();

  // Initialize form data when guest loads
  useEffect(() => {
    if (guest) {
      const isPresetTitle = GUEST_TITLES.some((t) => t.value === guest.title);
      setFormData({
        name: guest.name,
        title: isPresetTitle ? (guest.title ?? "") : "",
        jobTitle: guest.jobTitle ?? "",
        company: guest.company ?? "",
        description: guest.description ?? "",
        imageUrl: guest.imageUrl ?? "",
        isPublic: guest.isPublic,
      });
      if (guest.title && !isPresetTitle) {
        setUseCustomTitle(true);
        setCustomTitle(guest.title);
      }
    }
  }, [guest]);

  // Update mutation
  const updateMutation = api.guest.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الضيف بنجاح");
      utils.guest.getById.invalidate({ id });
      utils.guest.getAll.invalidate();
      router.push(`/admin/guests/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث بيانات الضيف");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setIsUploading(true);

    try {
      // Get presigned URL
      const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
        imageType: "avatar",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: id,
      });

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("فشل رفع الصورة");
      }

      // Set the public URL as the image URL
      setFormData((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast.success("تم رفع الصورة بنجاح");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("فشل رفع الصورة");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }

    const finalTitle = useCustomTitle ? customTitle : formData.title;

    updateMutation.mutate({
      id,
      name: formData.name,
      title: finalTitle || null,
      jobTitle: formData.jobTitle || null,
      company: formData.company || null,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      isPublic: formData.isPublic,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-96" />
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
            <Link href={`/admin/guests/${id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">تعديل الضيف</h1>
            <p className="text-muted-foreground">{guest.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/guests/${id}`}>إلغاء</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الضيف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-3">
            <Label>صورة الضيف</Label>
            <div className="flex items-center gap-4">
              <GuestEditImage
                imageUrl={formData.imageUrl}
                name={formData.name}
                onRemove={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-4 w-4" />
                      {formData.imageUrl ? "تغيير الصورة" : "رفع صورة"}
                    </>
                  )}
                </Label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG أو WEBP (حد أقصى 5 ميجابايت)
                </p>
              </div>
            </div>
          </div>

          {/* Title and Name */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">اللقب</Label>
              <div className="space-y-2">
                <Select
                  value={useCustomTitle ? "custom" : (formData.title || "none")}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setUseCustomTitle(true);
                    } else if (value === "none") {
                      setUseCustomTitle(false);
                      setFormData((prev) => ({ ...prev, title: "" }));
                    } else {
                      setUseCustomTitle(false);
                      setFormData((prev) => ({ ...prev, title: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اللقب (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون لقب</SelectItem>
                    {GUEST_TITLES.map((title) => (
                      <SelectItem key={title.value} value={title.value}>
                        {title.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">لقب مخصص...</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomTitle && (
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="أدخل اللقب المخصص"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="اسم الضيف"
              />
            </div>
          </div>

          {/* Job Title and Company */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">المنصب</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))
                }
                placeholder="مثال: مدير تنفيذي"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">الشركة</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company: e.target.value }))
                }
                placeholder="اسم الشركة"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">نبذة</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="نبذة عن الضيف..."
              rows={4}
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">ملف عام</Label>
              <p className="text-sm text-muted-foreground">
                السماح للزوار برؤية ملف الضيف والوصول إليه من صفحة الحدث
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isPublic: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
