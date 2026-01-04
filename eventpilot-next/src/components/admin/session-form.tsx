"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  defaultSessionFormData,
  sessionFormSchema,
  type SessionFormData,
} from "@/lib/schemas/session";
import { cn } from "@/lib/utils";
import { parseFormDateToUTC, toSaudiTime } from "@/lib/timezone";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  QrCode,
  Save,
  Settings,
  Sparkles,
  Target,
  Timer,
  User,
  UserCheck,
  Users,
  UtensilsCrossed,
  // Wand2, // Commented out - used for slug field
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GuestSelector } from "./guest-selector";
import { Controller, useForm } from "react-hook-form";

// Re-export for backward compatibility
export type { SessionFormData };
export const defaultFormData = defaultSessionFormData;

// Utility to generate URL-friendly slug from Arabic/English text
function generateSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Templates for quick setup
const sessionTemplates = {
  standard: {
    name: "حدث عادي",
    description: "إعدادات افتراضية متوازنة",
    icon: Zap,
    data: {
      maxParticipants: "50",
      maxCompanions: "5",
      requiresApproval: false,
      inviteOnly: false,
      showCountdown: true,
      showParticipantCount: true,
      sendQrInEmail: true,
    },
  },
  vip: {
    name: "حدث VIP",
    description: "للمدعوين فقط مع موافقة مسبقة",
    icon: Crown,
    data: {
      maxParticipants: "30",
      maxCompanions: "2",
      requiresApproval: true,
      inviteOnly: true,
      showCountdown: true,
      showParticipantCount: false,
      sendQrInEmail: true,
    },
  },
  open: {
    name: "حدث مفتوح",
    description: "بدون قيود أو موافقات",
    icon: Globe,
    data: {
      maxParticipants: "100",
      maxCompanions: "10",
      requiresApproval: false,
      inviteOnly: false,
      showCountdown: true,
      showParticipantCount: true,
      sendQrInEmail: true,
    },
  },
};

// Wizard steps for create mode
const wizardSteps = [
  { id: "basic", title: "المعلومات الأساسية", icon: CalendarDays },
  { id: "guest", title: "الضيف", icon: User },
  { id: "settings", title: "الإعدادات", icon: Settings },
  { id: "review", title: "المراجعة", icon: Check },
];

interface SessionFormProps {
  mode: "create" | "edit";
  initialData?: Partial<SessionFormData>;
  initialSelectedGuests?: SelectedGuest[];
  onSubmit: (data: SessionFormData) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}

// Helper component for tooltips
function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex mr-1">
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Toggle card component for visual toggle grid
function ToggleCard({
  id,
  label,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 block",
        checked
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg transition-colors",
            checked
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </label>
  );
}

// Type for selected guests in the form
interface SelectedGuest {
  id: string;
  name: string;
  title: string | null;
  jobTitle: string | null;
  company: string | null;
  imageUrl: string | null;
}

// Session preview card
function SessionPreview({
  formData,
  selectedGuests,
}: {
  formData: SessionFormData;
  selectedGuests: SelectedGuest[];
}) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "التاريخ";
    // Parse the date string as Saudi timezone and convert back for display
    const utcDate = parseFormDateToUTC(dateStr, "12:00");
    const saudiDate = toSaudiTime(utcDate);
    return saudiDate?.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      numberingSystem: "latn",
    }) ?? "التاريخ";
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "الوقت";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "م" : "ص";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card className="sticky top-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Eye className="h-3 w-3" />
          معاينة الحدث
        </div>
        <CardTitle className="text-lg">
          {formData.title || "عنوان الحدث"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{formatDate(formData.date)}</span>
          <span className="text-muted-foreground">•</span>
          <Clock className="h-4 w-4 text-primary" />
          <span>{formatTime(formData.time)}</span>
        </div>

        {/* Location */}
        {formData.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{formData.location}</span>
          </div>
        )}

        {/* Guest */}
        {selectedGuests.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            <span>
              الضيوف:{" "}
              {selectedGuests.length === 1
                ? selectedGuests[0].name
                : `${selectedGuests[0].name} +${selectedGuests.length - 1}`}
            </span>
          </div>
        )}

        {/* Stats Preview */}
        <div className="flex gap-2 flex-wrap">
          {formData.showParticipantCount && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 ml-1" />
              0/{formData.maxParticipants}
            </Badge>
          )}
          {formData.inviteOnly && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-600 border-amber-200"
            >
              <Lock className="h-3 w-3 ml-1" />
              للمدعوين فقط
            </Badge>
          )}
          {formData.requiresApproval && (
            <Badge
              variant="outline"
              className="text-xs bg-blue-500/10 text-blue-600 border-blue-200"
            >
              <UserCheck className="h-3 w-3 ml-1" />
              موافقة مسبقة
            </Badge>
          )}
        </div>

        {/* Description Preview */}
        {formData.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {formData.description}
          </p>
        )}

        {/* Active Features */}
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div
            className={cn(
              "text-center p-2 rounded-lg",
              formData.showCountdown
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Timer className="h-4 w-4 mx-auto mb-1" />
            العد التنازلي
          </div>
          <div
            className={cn(
              "text-center p-2 rounded-lg",
              formData.sendQrInEmail
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            )}
          >
            <QrCode className="h-4 w-4 mx-auto mb-1" />
            QR بالبريد
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Error message component
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function SessionForm({
  mode,
  initialData,
  initialSelectedGuests,
  onSubmit,
  isPending,
  onCancel,
}: SessionFormProps) {
  const DRAFT_KEY = "session-form-draft";

  // Load draft from localStorage for create mode (but prioritize initialData if provided)
  const getInitialValues = (): SessionFormData => {
    // If initialData is provided (e.g., duplicating a session), use it directly
    if (initialData && Object.keys(initialData).length > 0) {
      return { ...defaultSessionFormData, ...initialData };
    }
    // Otherwise, check for saved draft in create mode
    if (mode === "create" && typeof window !== "undefined") {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          return { ...defaultSessionFormData, ...parsed.formData };
        } catch {
          // Invalid draft, ignore
        }
      }
    }
    return { ...defaultSessionFormData, ...initialData };
  };

  const getInitialHasGuest = (): boolean => {
    // If initialData is provided, check for guest info
    if (initialData && Object.keys(initialData).length > 0) {
      return !!(initialData?.guestIds && initialData.guestIds.length > 0);
    }
    // Otherwise, check for saved draft in create mode
    if (mode === "create" && typeof window !== "undefined") {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          return parsed.hasGuest ?? false;
        } catch {
          // Invalid draft, ignore
        }
      }
    }
    return !!(initialData?.guestIds && initialData.guestIds.length > 0);
  };

  const getInitialSelectedTemplate = (): string | null => {
    // Don't load template from draft if initialData is provided
    if (initialData && Object.keys(initialData).length > 0) {
      return null;
    }
    if (mode === "create" && typeof window !== "undefined") {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          return parsed.selectedTemplate ?? null;
        } catch {
          // Invalid draft, ignore
        }
      }
    }
    return null;
  };

  // React Hook Form setup
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: getInitialValues(),
    mode: "onChange",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;
  const formValues = watch();

  const [selectedGuests, setSelectedGuests] = useState<SelectedGuest[]>(
    initialSelectedGuests ?? []
  );
  // const [slugManuallyEdited, setSlugManuallyEdited] = useState(
  //   !!initialData?.slug
  // ); // Commented out - used for slug field
  const [currentStep, setCurrentStep] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    getInitialSelectedTemplate
  );

  // Fetch global settings for defaults
  const { data: settings } = api.settings.get.useQuery();

  // Load settings defaults when creating new session
  useEffect(() => {
    if (mode === "create" && settings && !initialData) {
      setValue("showSocialMediaFields", settings.showSocialMediaFields ?? true);
      setValue(
        "showRegistrationPurpose",
        settings.showRegistrationPurpose ?? true
      );
      setValue("showCateringInterest", settings.showCateringInterest ?? true);
    }
  }, [mode, settings, initialData, setValue]);

  // Auto-save draft every 30 seconds (create mode only)
  useEffect(() => {
    if (mode !== "create") return;

    const saveInterval = setInterval(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData: formValues,
          selectedGuests,
          selectedTemplate,
          savedAt: new Date().toISOString(),
        })
      );
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [mode, formValues, selectedGuests, selectedTemplate]);

  // Clear draft on successful submit
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const onFormSubmit = async (data: SessionFormData) => {
    // Set guestIds from selected guests
    const submitData = {
      ...data,
      guestIds: selectedGuests.map((g) => g.id),
    };

    await onSubmit(submitData);
    if (mode === "create") {
      clearDraft();
    }
  };

  const applyTemplate = (templateKey: keyof typeof sessionTemplates) => {
    const template = sessionTemplates[templateKey];
    Object.entries(template.data).forEach(([key, value]) => {
      setValue(key as keyof SessionFormData, value as never);
    });
    setSelectedTemplate(templateKey);
  };

  const nextStep = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isValid = await canProceed();
    if (isValid && currentStep < wizardSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const canProceed = async (): Promise<boolean> => {
    switch (currentStep) {
      case 0: // Basic info
        return await trigger(["title", "date", "time"]);
      case 1: // Guest (optional)
        return true;
      case 2: // Settings
        return true;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  // Handle title change to auto-generate slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setValue("title", newTitle);
    // if (!slugManuallyEdited) {
    //   setValue("slug", generateSlug(newTitle));
    // }
  };

  // Render wizard step content
  const renderWizardStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Templates */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                ابدأ من قالب
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(sessionTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      applyTemplate(key as keyof typeof sessionTemplates)
                    }
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-right",
                      selectedTemplate === key
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          selectedTemplate === key
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <template.icon className="h-4 w-4" />
                      </div>
                      <p className="font-medium text-sm flex-1">
                        {template.name}
                      </p>
                      {selectedTemplate === key && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Basic Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">عنوان الحدث *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  onChange={handleTitleChange}
                  placeholder="مثال: ثلوثية الأعمال - الموسم الثاني"
                  disabled={isPending}
                />
                <FieldError message={errors.title?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">التاريخ *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date")}
                  disabled={isPending}
                />
                <FieldError message={errors.date?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">الوقت *</Label>
                <Input
                  id="time"
                  type="time"
                  {...register("time")}
                  disabled={isPending}
                />
                <FieldError message={errors.time?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">المكان</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="مثال: فندق الريتز كارلتون - الرياض"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationUrl">رابط الموقع</Label>
                <Input
                  id="locationUrl"
                  {...register("locationUrl")}
                  placeholder="رابط خرائط Google"
                  dir="ltr"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  rows={4}
                  {...register("description")}
                  placeholder="اكتب وصفاً جذاباً للحدث..."
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1 mb-4">
                <Label className="text-sm font-medium">ضيوف الحدث</Label>
                <p className="text-xs text-muted-foreground">
                  اختر ضيوف الحدث من القائمة أو أنشئ ضيف جديد
                </p>
              </div>
              <GuestSelector
                selectedGuests={selectedGuests}
                onChange={setSelectedGuests}
                disabled={isPending}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Limits */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">
                  الحد الأقصى للمشاركين
                  <HelpTooltip text="أقصى عدد يمكن تسجيله في الحدث" />
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  {...register("maxParticipants")}
                  disabled={isPending}
                />
                <FieldError message={errors.maxParticipants?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCompanions">
                  الحد الأقصى للمرافقين
                  <HelpTooltip text="عدد المرافقين المسموح لكل مشارك" />
                </Label>
                <Input
                  id="maxCompanions"
                  type="number"
                  min="0"
                  {...register("maxCompanions")}
                  disabled={isPending}
                />
                <FieldError message={errors.maxCompanions?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">موعد إغلاق التسجيل</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  {...register("registrationDeadline")}
                  disabled={isPending}
                />
              </div>
            </div>

            <Separator />

            {/* Toggle Grid - Registration Options */}
            <div className="space-y-3">
              <Label>إعدادات التسجيل</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <Controller
                  name="requiresApproval"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="requiresApproval"
                      label="موافقة مسبقة"
                      description="يتطلب موافقة المشرف قبل تأكيد التسجيل"
                      icon={UserCheck}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="inviteOnly"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="inviteOnly"
                      label="للمدعوين فقط"
                      description="فقط من لديه دعوة يمكنه التسجيل"
                      icon={Lock}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="sendQrInEmail"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="sendQrInEmail"
                      label="إرسال QR بالبريد"
                      description="إرسال رمز QR للحضور في البريد الإلكتروني"
                      icon={QrCode}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
              </div>
            </div>

            {formValues.inviteOnly && (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                <Label htmlFor="inviteMessage">رسالة الدعوة</Label>
                <Textarea
                  id="inviteMessage"
                  rows={2}
                  {...register("inviteMessage")}
                  placeholder="رسالة تظهر للمدعوين..."
                  disabled={isPending}
                />
              </div>
            )}

            <Separator />

            {/* Toggle Grid - Display Options */}
            <div className="space-y-3">
              <Label>إعدادات العرض</Label>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Controller
                  name="showCountdown"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showCountdown"
                      label="العد التنازلي"
                      description="عرض عداد تنازلي للحدث"
                      icon={Timer}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="showParticipantCount"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showParticipantCount"
                      label="عدد المسجلين"
                      description="إظهار عدد المسجلين للزوار"
                      icon={Users}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="showGuestProfile"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showGuestProfile"
                      label="ملف الضيف"
                      description="عرض معلومات الضيف"
                      icon={User}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="showSocialMediaFields"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showSocialMediaFields"
                      label="وسائل التواصل"
                      description="إظهار حقول التواصل الاجتماعي"
                      icon={MessageSquare}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="showRegistrationPurpose"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showRegistrationPurpose"
                      label="الهدف من التسجيل"
                      description="السؤال عن هدف المستخدم"
                      icon={Target}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Controller
                  name="showCateringInterest"
                  control={control}
                  render={({ field }) => (
                    <ToggleCard
                      id="showCateringInterest"
                      label="الرغبة في الضيافة"
                      description="السؤال عن رغبة تقديم الضيافة"
                      icon={UtensilsCrossed}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
              </div>
            </div>

            {/* Custom Message - Commented out for now */}
            {/* <Separator />
            <div className="space-y-2">
              <Label htmlFor="customConfirmationMessage">
                رسالة التأكيد المخصصة
                <HelpTooltip text="رسالة تظهر للمستخدم بعد التسجيل الناجح" />
              </Label>
              <Textarea
                id="customConfirmationMessage"
                rows={3}
                {...register("customConfirmationMessage")}
                placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
                disabled={isPending}
              />
            </div> */}

            {/* Advanced - Slug - Commented out for now */}
            {/* <div className="space-y-2">
              <Label htmlFor="slug">
                الرابط المخصص
                <HelpTooltip text="رابط مخصص للحدث يُولّد تلقائياً من العنوان" />
              </Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  {...register("slug")}
                  onChange={(e) => {
                    setValue("slug", e.target.value);
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
                    setValue("slug", generateSlug(formValues.title));
                    setSlugManuallyEdited(false);
                  }}
                  disabled={isPending || !formValues.title}
                  title="توليد من العنوان"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div> */}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">جاهز للإنشاء!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                راجع المعاينة على اليسار ثم اضغط &quot;إنشاء الحدث&quot;
              </p>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص الحدث</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العنوان</span>
                  <span className="font-medium">{formValues.title || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span>{formValues.date || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الوقت</span>
                  <span>{formValues.time || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المكان</span>
                  <span>{formValues.location || "-"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحد الأقصى</span>
                  <span>{formValues.maxParticipants} مشارك</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المرافقين</span>
                  <span>{formValues.maxCompanions} لكل مشارك</span>
                </div>
                {selectedGuests.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الضيوف</span>
                    <span>
                      {selectedGuests.length === 1
                        ? selectedGuests[0].name
                        : `${selectedGuests.length} ضيوف`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  // Create mode - Wizard
  if (mode === "create") {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onFormSubmit)}>
              {/* Wizard Steps */}
              <div className="mb-8">
                <div className="flex items-center">
                  {wizardSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center flex-1 last:flex-none"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          index <= currentStep && setCurrentStep(index)
                        }
                        disabled={index > currentStep}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                            index === currentStep
                              ? "bg-primary border-primary text-primary-foreground"
                              : index < currentStep
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-muted border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {index < currentStep ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <step.icon className="h-5 w-5" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium hidden sm:block",
                            index === currentStep
                              ? "text-primary"
                              : index < currentStep
                              ? "text-green-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </span>
                      </button>
                      {index < wizardSteps.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 mx-3",
                            index < currentStep
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Saved Indicator */}
              {draftSaved && (
                <div className="flex items-center gap-2 text-xs text-green-600 mb-4 animate-in fade-in-0">
                  <Save className="h-3 w-3" />
                  تم حفظ المسودة
                </div>
              )}

              {/* Step Content */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const StepIcon = wizardSteps[currentStep].icon;
                      return <StepIcon className="h-5 w-5" />;
                    })()}
                    {wizardSteps[currentStep].title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderWizardStep()}</CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? onCancel : prevStep}
                  disabled={isPending}
                >
                  <ChevronRight className="h-4 w-4 ml-2" />
                  {currentStep === 0 ? "إلغاء" : "السابق"}
                </Button>

                {currentStep < wizardSteps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={(e) => nextStep(e)}
                    disabled={isPending}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4 mr-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جارٍ الإنشاء...
                      </>
                    ) : (
                      "إنشاء الحدث"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="hidden lg:block">
            <SessionPreview formData={formValues} selectedGuests={selectedGuests} />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Edit mode - Accordion (existing behavior with improvements)
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
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
                      <h3 className="font-semibold text-base">
                        المعلومات الأساسية
                      </h3>
                      <p className="text-xs text-muted-foreground font-normal">
                        البيانات الأساسية للحدث
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    {/* Session Number - Disabled in edit mode */}
                    {/* <div className="space-y-2">
                      <Label htmlFor="sessionNumber">رقم الحدث</Label>
                      <Input
                        id="sessionNumber"
                        type="number"
                        min="1"
                        {...register("sessionNumber")}
                        disabled={isPending}
                      />
                    </div> */}
                    <div className="space-y-2">
                      <Label htmlFor="title">عنوان الحدث *</Label>
                      <Input
                        id="title"
                        {...register("title")}
                        disabled={isPending}
                      />
                      <FieldError message={errors.title?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">التاريخ *</Label>
                      <Input
                        id="date"
                        type="date"
                        {...register("date")}
                        disabled={isPending}
                      />
                      <FieldError message={errors.date?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">الوقت *</Label>
                      <Input
                        id="time"
                        type="time"
                        {...register("time")}
                        disabled={isPending}
                      />
                      <FieldError message={errors.time?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">الحالة</Label>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
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
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">المكان</Label>
                      <Input
                        id="location"
                        {...register("location")}
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locationUrl">رابط الموقع</Label>
                      <Input
                        id="locationUrl"
                        {...register("locationUrl")}
                        placeholder="رابط خرائط Google"
                        dir="ltr"
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">الوصف</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        {...register("description")}
                        disabled={isPending}
                      />
                    </div>
                    {/* Slug - Commented out for now */}
                    {/* <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="slug">الرابط المخصص</Label>
                      <div className="flex gap-2">
                        <Input
                          id="slug"
                          {...register("slug")}
                          onChange={(e) => {
                            setValue("slug", e.target.value);
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
                            setValue("slug", generateSlug(formValues.title));
                            setSlugManuallyEdited(false);
                          }}
                          disabled={isPending || !formValues.title}
                          title="توليد من العنوان"
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div> */}
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
                      <h3 className="font-semibold text-base">ضيف الحدث</h3>
                      <p className="text-xs text-muted-foreground font-normal">
                        معلومات ضيف الحدث (اختياري)
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    <GuestSelector
                      selectedGuests={selectedGuests}
                      onChange={setSelectedGuests}
                      disabled={isPending}
                    />
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
                      <h3 className="font-semibold text-base">
                        إعدادات التسجيل
                      </h3>
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
                        <Label htmlFor="maxParticipants">
                          الحد الأقصى للمشاركين
                        </Label>
                        <Input
                          id="maxParticipants"
                          type="number"
                          min="1"
                          {...register("maxParticipants")}
                          disabled={isPending}
                        />
                        <FieldError message={errors.maxParticipants?.message} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxCompanions">
                          الحد الأقصى للمرافقين
                        </Label>
                        <Input
                          id="maxCompanions"
                          type="number"
                          min="0"
                          {...register("maxCompanions")}
                          disabled={isPending}
                        />
                        <FieldError message={errors.maxCompanions?.message} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="registrationDeadline">
                          موعد إغلاق التسجيل
                        </Label>
                        <Input
                          id="registrationDeadline"
                          type="datetime-local"
                          {...register("registrationDeadline")}
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Toggle Cards for Edit Mode */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <Controller
                        name="requiresApproval"
                        control={control}
                        render={({ field }) => (
                          <ToggleCard
                            id="requiresApproval-edit"
                            label="موافقة مسبقة"
                            description="يتطلب موافقة المشرف"
                            icon={UserCheck}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                        )}
                      />
                      <Controller
                        name="inviteOnly"
                        control={control}
                        render={({ field }) => (
                          <ToggleCard
                            id="inviteOnly-edit"
                            label="للمدعوين فقط"
                            description="فقط من لديه دعوة"
                            icon={Lock}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                        )}
                      />
                      <Controller
                        name="sendQrInEmail"
                        control={control}
                        render={({ field }) => (
                          <ToggleCard
                            id="sendQrInEmail-edit"
                            label="إرسال QR بالبريد"
                            description="إرسال رمز QR في البريد"
                            icon={QrCode}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                        )}
                      />
                    </div>

                    {formValues.inviteOnly && (
                      <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        <Label htmlFor="inviteMessage">رسالة الدعوة</Label>
                        <Textarea
                          id="inviteMessage"
                          rows={2}
                          {...register("inviteMessage")}
                          disabled={isPending}
                        />
                      </div>
                    )}
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
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-2">
                    <Controller
                      name="showCountdown"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showCountdown-edit"
                          label="العد التنازلي"
                          icon={Timer}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                    <Controller
                      name="showParticipantCount"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showParticipantCount-edit"
                          label="عدد المسجلين"
                          icon={Users}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                    <Controller
                      name="showGuestProfile"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showGuestProfile-edit"
                          label="ملف الضيف"
                          icon={User}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                    <Controller
                      name="showSocialMediaFields"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showSocialMediaFields-edit"
                          label="وسائل التواصل"
                          icon={MessageSquare}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                    <Controller
                      name="showRegistrationPurpose"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showRegistrationPurpose-edit"
                          label="الهدف من التسجيل"
                          icon={Target}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                    <Controller
                      name="showCateringInterest"
                      control={control}
                      render={({ field }) => (
                        <ToggleCard
                          id="showCateringInterest-edit"
                          label="الرغبة في الضيافة"
                          icon={UtensilsCrossed}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Custom Message Section - Commented out for now */}
              {/* <AccordionItem
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
                      {...register("customConfirmationMessage")}
                      placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
                      disabled={isPending}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem> */}
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
                    جارٍ الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:block">
          <SessionPreview formData={formValues} selectedGuests={selectedGuests} />
        </div>
      </div>
    </TooltipProvider>
  );
}
