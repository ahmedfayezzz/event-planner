"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, Users, QrCode, Download } from "lucide-react";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: session, isLoading } = api.session.getById.useQuery({ id });

  const [formData, setFormData] = useState({
    sessionNumber: "",
    title: "",
    description: "",
    date: "",
    time: "18:00",
    location: "",
    guestName: "",
    guestProfile: "",
    maxParticipants: "50",
    maxCompanions: "5",
    status: "open" as "open" | "closed" | "completed",
    requiresApproval: false,
    showParticipantCount: true,
    showCountdown: true,
    showGuestProfile: true,
    inviteOnly: false,
    inviteMessage: "",
    embedEnabled: true,
    enableMiniView: false,
    sendQrInEmail: true,
    slug: "",
    registrationDeadline: "",
    customConfirmationMessage: "",
  });

  useEffect(() => {
    if (session) {
      const date = new Date(session.date);
      setFormData({
        sessionNumber: session.sessionNumber.toString(),
        title: session.title,
        description: session.description || "",
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().slice(0, 5),
        location: session.location || "",
        guestName: session.guestName || "",
        guestProfile: session.guestProfile || "",
        maxParticipants: session.maxParticipants.toString(),
        maxCompanions: session.maxCompanions.toString(),
        status: session.status as "open" | "closed" | "completed",
        requiresApproval: session.requiresApproval,
        showParticipantCount: session.showParticipantCount,
        showCountdown: session.showCountdown,
        showGuestProfile: session.showGuestProfile,
        inviteOnly: session.inviteOnly,
        inviteMessage: session.inviteMessage || "",
        embedEnabled: session.embedEnabled,
        enableMiniView: session.enableMiniView,
        sendQrInEmail: session.sendQrInEmail,
        slug: session.slug || "",
        registrationDeadline: session.registrationDeadline
          ? new Date(session.registrationDeadline).toISOString().slice(0, 16)
          : "",
        customConfirmationMessage: session.customConfirmationMessage || "",
      });
    }
  }, [session]);

  const updateMutation = api.session.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الجلسة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الجلسة");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dateTime = new Date(`${formData.date}T${formData.time}`);

    await updateMutation.mutateAsync({
      id,
      sessionNumber: parseInt(formData.sessionNumber),
      title: formData.title,
      description: formData.description || undefined,
      date: dateTime,
      location: formData.location || undefined,
      guestName: formData.guestName || undefined,
      guestProfile: formData.guestProfile || undefined,
      maxParticipants: parseInt(formData.maxParticipants),
      maxCompanions: parseInt(formData.maxCompanions),
      status: formData.status,
      requiresApproval: formData.requiresApproval,
      showParticipantCount: formData.showParticipantCount,
      showCountdown: formData.showCountdown,
      showGuestProfile: formData.showGuestProfile,
      inviteOnly: formData.inviteOnly,
      inviteMessage: formData.inviteMessage || undefined,
      embedEnabled: formData.embedEnabled,
      enableMiniView: formData.enableMiniView,
      sendQrInEmail: formData.sendQrInEmail,
      slug: formData.slug || undefined,
      registrationDeadline: formData.registrationDeadline
        ? new Date(formData.registrationDeadline)
        : null,
      customConfirmationMessage: formData.customConfirmationMessage || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الجلسة غير موجودة</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للجلسات</Link>
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
            <Link href="/admin/sessions">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground">
              التجمع رقم {session.sessionNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/sessions/${id}/attendees`}>
              <Users className="ml-2 h-4 w-4" />
              المسجلين
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/checkin/${id}`}>
              <QrCode className="ml-2 h-4 w-4" />
              تسجيل الحضور
            </Link>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionNumber">رقم الجلسة</Label>
              <Input
                id="sessionNumber"
                type="number"
                min="1"
                value={formData.sessionNumber}
                onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الجلسة</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">الوقت</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "open" | "closed" | "completed") =>
                  setFormData({ ...formData, status: value })
                }
                disabled={updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                  <SelectItem value="completed">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">المكان</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="slug">الرابط المخصص</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                dir="ltr"
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Guest Info */}
        <Card>
          <CardHeader>
            <CardTitle>ضيف الجلسة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guestName">اسم الضيف</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestProfile">نبذة عن الضيف</Label>
              <Input
                id="guestProfile"
                value={formData.guestProfile}
                onChange={(e) => setFormData({ ...formData, guestProfile: e.target.value })}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التسجيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCompanions">الحد الأقصى للمرافقين</Label>
                <Input
                  id="maxCompanions"
                  type="number"
                  min="0"
                  value={formData.maxCompanions}
                  onChange={(e) => setFormData({ ...formData, maxCompanions: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">موعد إغلاق التسجيل</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiresApproval: checked === true })
                  }
                  disabled={updateMutation.isPending}
                />
                <Label htmlFor="requiresApproval">يتطلب موافقة على التسجيل</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="inviteOnly"
                  checked={formData.inviteOnly}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, inviteOnly: checked === true })
                  }
                  disabled={updateMutation.isPending}
                />
                <Label htmlFor="inviteOnly">للمدعوين فقط</Label>
              </div>
              {formData.inviteOnly && (
                <div className="space-y-2 mr-6">
                  <Label htmlFor="inviteMessage">رسالة الدعوة</Label>
                  <Textarea
                    id="inviteMessage"
                    rows={2}
                    value={formData.inviteMessage}
                    onChange={(e) => setFormData({ ...formData, inviteMessage: e.target.value })}
                    disabled={updateMutation.isPending}
                  />
                </div>
              )}
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="sendQrInEmail"
                  checked={formData.sendQrInEmail}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sendQrInEmail: checked === true })
                  }
                  disabled={updateMutation.isPending}
                />
                <Label htmlFor="sendQrInEmail">إرسال رمز QR في البريد</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات العرض</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showCountdown"
                checked={formData.showCountdown}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showCountdown: checked === true })
                }
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="showCountdown">عرض العد التنازلي</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showParticipantCount"
                checked={formData.showParticipantCount}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showParticipantCount: checked === true })
                }
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="showParticipantCount">عرض عدد المسجلين</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showGuestProfile"
                checked={formData.showGuestProfile}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showGuestProfile: checked === true })
                }
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="showGuestProfile">عرض ملف الضيف</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="embedEnabled"
                checked={formData.embedEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, embedEnabled: checked === true })
                }
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="embedEnabled">تفعيل التضمين</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="enableMiniView"
                checked={formData.enableMiniView}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enableMiniView: checked === true })
                }
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="enableMiniView">تفعيل العرض المصغر</Label>
            </div>
          </CardContent>
        </Card>

        {/* Custom Message */}
        <Card>
          <CardHeader>
            <CardTitle>رسالة التأكيد المخصصة</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="customConfirmationMessage"
              rows={3}
              value={formData.customConfirmationMessage}
              onChange={(e) => setFormData({ ...formData, customConfirmationMessage: e.target.value })}
              placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
              disabled={updateMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={updateMutation.isPending}
          >
            <Link href="/admin/sessions">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </form>
    </div>
  );
}
