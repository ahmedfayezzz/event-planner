"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  User,
  Settings,
  Eye,
  MessageSquare,
  Loader2,
  Wand2,
} from "lucide-react";

// Utility to generate URL-friendly slug from Arabic/English text
function generateSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, "") // Keep Arabic, English, numbers, hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

export interface SessionFormData {
  sessionNumber: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  guestName: string;
  guestProfile: string;
  maxParticipants: string;
  maxCompanions: string;
  status: "open" | "closed" | "completed";
  requiresApproval: boolean;
  showParticipantCount: boolean;
  showCountdown: boolean;
  showGuestProfile: boolean;
  inviteOnly: boolean;
  inviteMessage: string;
  embedEnabled: boolean;
  enableMiniView: boolean;
  sendQrInEmail: boolean;
  slug: string;
  registrationDeadline: string;
  customConfirmationMessage: string;
}

export const defaultFormData: SessionFormData = {
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
  status: "open",
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
};

interface SessionFormProps {
  mode: "create" | "edit";
  initialData?: Partial<SessionFormData>;
  onSubmit: (data: SessionFormData) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}

export function SessionForm({
  mode,
  initialData,
  onSubmit,
  isPending,
  onCancel,
}: SessionFormProps) {
  const [formData, setFormData] = useState<SessionFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [hasGuest, setHasGuest] = useState(
    !!(initialData?.guestName || initialData?.guestProfile)
  );
  // Track if slug was manually edited
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear guest data if guest is disabled
    const submitData = hasGuest
      ? formData
      : { ...formData, guestName: "", guestProfile: "" };

    await onSubmit(submitData);
  };

  const updateField = <K extends keyof SessionFormData>(
    field: K,
    value: SessionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={["basic", "registration", "display"]}
        className="space-y-4"
      >
        {/* Basic Info Section */}
        <AccordionItem
          value="basic"
          className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-base">المعلومات الأساسية</h3>
                <p className="text-xs text-muted-foreground font-normal">
                  البيانات الأساسية للجلسة
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              {mode === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="sessionNumber">رقم الجلسة</Label>
                  <Input
                    id="sessionNumber"
                    type="number"
                    min="1"
                    value={formData.sessionNumber}
                    onChange={(e) => updateField("sessionNumber", e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              )}
              <div className={`space-y-2 ${mode === "create" ? "md:col-span-2" : ""}`}>
                <Label htmlFor="title">عنوان الجلسة *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    updateField("title", newTitle);
                    // Auto-generate slug if not manually edited (create mode only)
                    if (mode === "create" && !slugManuallyEdited) {
                      updateField("slug", generateSlug(newTitle));
                    }
                  }}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">التاريخ *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">الوقت *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              {mode === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="status">الحالة</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "open" | "closed" | "completed") =>
                      updateField("status", value)
                    }
                    disabled={isPending}
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
              )}
              <div className={`space-y-2 ${mode === "edit" ? "" : "md:col-span-2"}`}>
                <Label htmlFor="location">المكان</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="slug">الرابط المخصص (اختياري)</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => {
                      updateField("slug", e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="session-123"
                    dir="ltr"
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      updateField("slug", generateSlug(formData.title));
                      setSlugManuallyEdited(false);
                    }}
                    disabled={isPending || !formData.title}
                    title="توليد من العنوان"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  سيتم استخدامه في رابط الجلسة. يُولّد تلقائياً من العنوان.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Guest Info Section */}
        <AccordionItem
          value="guest"
          className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-base">ضيف الجلسة</h3>
                <p className="text-xs text-muted-foreground font-normal">
                  معلومات ضيف الجلسة (اختياري)
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="space-y-0.5">
                  <Label htmlFor="hasGuest" className="text-sm font-medium">
                    إضافة ضيف للجلسة
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    تفعيل هذا الخيار لإضافة معلومات ضيف الجلسة
                  </p>
                </div>
                <Switch
                  id="hasGuest"
                  checked={hasGuest}
                  onCheckedChange={setHasGuest}
                  disabled={isPending}
                />
              </div>

              {hasGuest && (
                <div className="grid gap-4 md:grid-cols-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="guestName">اسم الضيف</Label>
                    <Input
                      id="guestName"
                      value={formData.guestName}
                      onChange={(e) => updateField("guestName", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestProfile">نبذة عن الضيف</Label>
                    <Input
                      id="guestProfile"
                      value={formData.guestProfile}
                      onChange={(e) =>
                        updateField("guestProfile", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Registration Settings Section */}
        <AccordionItem
          value="registration"
          className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-base">إعدادات التسجيل</h3>
                <p className="text-xs text-muted-foreground font-normal">
                  تحكم في كيفية تسجيل الحضور
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      updateField("maxParticipants", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCompanions">الحد الأقصى للمرافقين</Label>
                  <Input
                    id="maxCompanions"
                    type="number"
                    min="0"
                    value={formData.maxCompanions}
                    onChange={(e) =>
                      updateField("maxCompanions", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationDeadline">
                    موعد إغلاق التسجيل
                  </Label>
                  <Input
                    id="registrationDeadline"
                    type="datetime-local"
                    value={formData.registrationDeadline}
                    onChange={(e) =>
                      updateField("registrationDeadline", e.target.value)
                    }
                    disabled={isPending}
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
                      updateField("requiresApproval", checked === true)
                    }
                    disabled={isPending}
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
                      updateField("inviteOnly", checked === true)
                    }
                    disabled={isPending}
                  />
                  <Label htmlFor="inviteOnly">للمدعوين فقط</Label>
                </div>
                {formData.inviteOnly && (
                  <div className="space-y-2 mr-6 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <Label htmlFor="inviteMessage">رسالة الدعوة</Label>
                    <Textarea
                      id="inviteMessage"
                      rows={2}
                      value={formData.inviteMessage}
                      onChange={(e) =>
                        updateField("inviteMessage", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="sendQrInEmail"
                    checked={formData.sendQrInEmail}
                    onCheckedChange={(checked) =>
                      updateField("sendQrInEmail", checked === true)
                    }
                    disabled={isPending}
                  />
                  <Label htmlFor="sendQrInEmail">إرسال رمز QR في البريد</Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Display Settings Section */}
        <AccordionItem
          value="display"
          className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-base">إعدادات العرض</h3>
                <p className="text-xs text-muted-foreground font-normal">
                  تحكم في ما يظهر للزوار
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="showCountdown"
                  checked={formData.showCountdown}
                  onCheckedChange={(checked) =>
                    updateField("showCountdown", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="showCountdown">عرض العد التنازلي</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="showParticipantCount"
                  checked={formData.showParticipantCount}
                  onCheckedChange={(checked) =>
                    updateField("showParticipantCount", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="showParticipantCount">عرض عدد المسجلين</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="showGuestProfile"
                  checked={formData.showGuestProfile}
                  onCheckedChange={(checked) =>
                    updateField("showGuestProfile", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="showGuestProfile">عرض ملف الضيف</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="embedEnabled"
                  checked={formData.embedEnabled}
                  onCheckedChange={(checked) =>
                    updateField("embedEnabled", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="embedEnabled">تفعيل التضمين</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="enableMiniView"
                  checked={formData.enableMiniView}
                  onCheckedChange={(checked) =>
                    updateField("enableMiniView", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="enableMiniView">تفعيل العرض المصغر</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Custom Message Section */}
        <AccordionItem
          value="message"
          className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-base">رسالة التأكيد</h3>
                <p className="text-xs text-muted-foreground font-normal">
                  رسالة مخصصة تظهر بعد التسجيل الناجح
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="pt-2">
              <Textarea
                id="customConfirmationMessage"
                rows={3}
                value={formData.customConfirmationMessage}
                onChange={(e) =>
                  updateField("customConfirmationMessage", e.target.value)
                }
                placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
                disabled={isPending}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          إلغاء
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "جارٍ الإنشاء..." : "جارٍ الحفظ..."}
            </>
          ) : mode === "create" ? (
            "إنشاء الجلسة"
          ) : (
            "حفظ التغييرات"
          )}
        </Button>
      </div>
    </form>
  );
}
