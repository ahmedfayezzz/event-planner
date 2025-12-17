"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  User,
  Mail,
  Briefcase,
  Instagram,
  Twitter,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

export default function UserProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const utils = api.useUtils();

  // Fetch full profile data from database
  const { data: profile, isLoading: profileLoading } =
    api.user.getMyProfile.useQuery(undefined, {
      enabled: status === "authenticated",
    });

  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الملف الشخصي");
    },
  });

  // Avatar upload mutations
  const uploadAvatarMutation = api.upload.uploadUserAvatar.useMutation();
  const confirmAvatarMutation = api.upload.confirmUserAvatar.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصورة الشخصية");
      utils.user.getMyProfile.invalidate();
    },
  });
  const removeAvatarMutation = api.upload.removeUserAvatar.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الصورة الشخصية");
      utils.user.getMyProfile.invalidate();
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const { uploadUrl, publicUrl } = await uploadAvatarMutation.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
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

      // Step 3: Confirm upload
      await confirmAvatarMutation.mutateAsync({ imageUrl: publicUrl });
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
    try {
      await removeAvatarMutation.mutateAsync();
    } catch (error) {
      console.error("Remove avatar failed:", error);
      toast.error("فشل حذف الصورة الشخصية");
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    jobTitle: "",
    company: "",
    instagram: "",
    twitter: "",
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        bio: profile.goal || "",
        jobTitle: profile.position || "",
        company: profile.companyName || "",
        instagram: profile.instagram || "",
        twitter: profile.twitter || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    updateProfileMutation.mutate({
      name: formData.name,
      position: formData.jobTitle,
      companyName: formData.company,
      instagram: formData.instagram || undefined,
      twitter: formData.twitter || undefined,
      goal: formData.bio || undefined,
    });
  };

  if (status === "loading" || profileLoading) {
    return <div className="container py-20 text-center">جارٍ التحميل...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/user/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-primary text-white pt-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              asChild
            >
              <Link href="/user/registrations">
                <ArrowRight className="ml-2 h-5 w-5" />
                العودة لتسجيلاتي
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">إعدادات الحساب</h1>
          <p className="text-white/80 mt-2">
            قم بتحديث معلوماتك الشخصية والمهنية
          </p>
        </div>
      </div>

      <div className="container -mt-20 relative z-20">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Sidebar / Profile Card */}
          <div className="md:col-span-1">
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary to-primary/80"></div>
              <CardContent className="pt-0 relative">
                <div className="absolute -top-16 right-1/2 translate-x-1/2">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                      <UserAvatar
                        avatarUrl={profile?.avatarUrl}
                        name={session?.user?.name}
                        size="xl"
                        className="h-full w-full text-4xl"
                      />
                    </div>
                    {/* Upload overlay */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      ) : (
                        <Camera className="h-8 w-8 text-white" />
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
                </div>
                <div className="mt-20 text-center space-y-2">
                  <h2 className="text-xl font-bold">{session?.user?.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {session?.user?.email}
                  </p>
                  {profile?.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={removeAvatarMutation.isPending}
                      className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                    >
                      {removeAvatarMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      حذف الصورة
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="md:col-span-2">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>المعلومات الشخصية</CardTitle>
                <CardDescription>
                  هذه المعلومات ستظهر في ملفك الشخصي العام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="pr-10 bg-muted/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك</Label>
                  <Textarea
                    id="bio"
                    placeholder="اكتب نبذة مختصرة عن خبراتك واهتماماتك..."
                    className="min-h-[100px]"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                    <div className="relative">
                      <Briefcase className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="jobTitle"
                        placeholder="مثال: مدير تسويق"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, jobTitle: e.target.value })
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">الجهة / الشركة</Label>
                    <Input
                      id="company"
                      placeholder="اسم الشركة أو المشروع"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="instagram"
                        placeholder="@username"
                        value={formData.instagram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instagram: e.target.value,
                          })
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter (X)</Label>
                    <div className="relative">
                      <Twitter className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="twitter"
                        placeholder="@username"
                        value={formData.twitter}
                        onChange={(e) =>
                          setFormData({ ...formData, twitter: e.target.value })
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {updateProfileMutation.isPending ? (
                      "جارٍ الحفظ..."
                    ) : (
                      <>
                        <Save className="ml-2 h-4 w-4" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
