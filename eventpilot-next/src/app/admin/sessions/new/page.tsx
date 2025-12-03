"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function NewSessionPage() {
  const router = useRouter();
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

  const createMutation = api.session.create.useMutation({
    onSuccess: (session) => {
      toast.success("تم إنشاء الجلسة بنجاح");
      router.push(`/admin/sessions/${session.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الجلسة");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dateTime = new Date(`${formData.date}T${formData.time}`);

    await createMutation.mutateAsync({
      sessionNumber: parseInt(formData.sessionNumber),
      title: formData.title,
      description: formData.description || undefined,
      date: dateTime,
      location: formData.location || undefined,
      guestName: formData.guestName || undefined,
      guestProfile: formData.guestProfile || undefined,
      maxParticipants: parseInt(formData.maxParticipants),
      maxCompanions: parseInt(formData.maxCompanions),
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
        : undefined,
      customConfirmationMessage: formData.customConfirmationMessage || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/sessions">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">جلسة جديدة</h1>
          <p className="text-muted-foreground">
            إنشاء جلسة جديدة لثلوثية الأعمال
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
            <CardDescription>
              البيانات الأساسية للجلسة
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionNumber">رقم الجلسة *</Label>
              <Input
                id="sessionNumber"
                type="number"
                min="1"
                value={formData.sessionNumber}
                onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الجلسة *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">الوقت *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">المكان</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="slug">الرابط المخصص (اختياري)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="session-123"
                dir="ltr"
                disabled={createMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Guest Info */}
        <Card>
          <CardHeader>
            <CardTitle>ضيف الجلسة</CardTitle>
            <CardDescription>
              معلومات ضيف الجلسة (اختياري)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guestName">اسم الضيف</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestProfile">نبذة عن الضيف</Label>
              <Input
                id="guestProfile"
                value={formData.guestProfile}
                onChange={(e) => setFormData({ ...formData, guestProfile: e.target.value })}
                disabled={createMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التسجيل</CardTitle>
            <CardDescription>
              تحكم في كيفية تسجيل الحضور
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  disabled={createMutation.isPending}
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
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">موعد إغلاق التسجيل</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  disabled={createMutation.isPending}
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
                  disabled={createMutation.isPending}
                />
                <Label htmlFor="requiresApproval">
                  يتطلب موافقة على التسجيل
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="inviteOnly"
                  checked={formData.inviteOnly}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, inviteOnly: checked === true })
                  }
                  disabled={createMutation.isPending}
                />
                <Label htmlFor="inviteOnly">
                  للمدعوين فقط
                </Label>
              </div>
              {formData.inviteOnly && (
                <div className="space-y-2 mr-6">
                  <Label htmlFor="inviteMessage">رسالة الدعوة</Label>
                  <Textarea
                    id="inviteMessage"
                    rows={2}
                    value={formData.inviteMessage}
                    onChange={(e) => setFormData({ ...formData, inviteMessage: e.target.value })}
                    disabled={createMutation.isPending}
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
                  disabled={createMutation.isPending}
                />
                <Label htmlFor="sendQrInEmail">
                  إرسال رمز QR في البريد
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات العرض</CardTitle>
            <CardDescription>
              تحكم في ما يظهر للزوار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showCountdown"
                checked={formData.showCountdown}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showCountdown: checked === true })
                }
                disabled={createMutation.isPending}
              />
              <Label htmlFor="showCountdown">
                عرض العد التنازلي
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showParticipantCount"
                checked={formData.showParticipantCount}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showParticipantCount: checked === true })
                }
                disabled={createMutation.isPending}
              />
              <Label htmlFor="showParticipantCount">
                عرض عدد المسجلين
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="showGuestProfile"
                checked={formData.showGuestProfile}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showGuestProfile: checked === true })
                }
                disabled={createMutation.isPending}
              />
              <Label htmlFor="showGuestProfile">
                عرض ملف الضيف
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="embedEnabled"
                checked={formData.embedEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, embedEnabled: checked === true })
                }
                disabled={createMutation.isPending}
              />
              <Label htmlFor="embedEnabled">
                تفعيل التضمين
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="enableMiniView"
                checked={formData.enableMiniView}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enableMiniView: checked === true })
                }
                disabled={createMutation.isPending}
              />
              <Label htmlFor="enableMiniView">
                تفعيل العرض المصغر
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Custom Message */}
        <Card>
          <CardHeader>
            <CardTitle>رسالة التأكيد المخصصة</CardTitle>
            <CardDescription>
              رسالة تظهر بعد التسجيل الناجح
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="customConfirmationMessage"
              rows={3}
              value={formData.customConfirmationMessage}
              onChange={(e) => setFormData({ ...formData, customConfirmationMessage: e.target.value })}
              placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
              disabled={createMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={createMutation.isPending}
          >
            <Link href="/admin/sessions">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء الجلسة"}
          </Button>
        </div>
      </form>
    </div>
  );
}
