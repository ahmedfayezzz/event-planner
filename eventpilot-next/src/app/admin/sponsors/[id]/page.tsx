"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { cn, formatArabicDate, getWhatsAppUrl } from "@/lib/utils";
import {
  getSponsorTypeLabel,
  getSponsorshipTypeLabel,
  SPONSORSHIP_TYPES,
  SPONSOR_TYPES,
} from "@/lib/constants";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Search,
  Share2,
  Tag,
  Trash2,
  Unlink,
  Upload,
  User,
  UserCircle,
  UserPlus,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { SponsorLabelManager } from "@/components/admin/sponsor-label-manager";
import {
  SponsorSocialMedia,
  SponsorSocialMediaIcons,
} from "@/components/admin/sponsor-social-media";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// Sponsor form data interface
interface SponsorFormData {
  name: string;
  email: string;
  phone: string;
  type: "person" | "company";
  sponsorshipTypes: string[];
  sponsorshipOtherText: string;
  logoUrl: string;
  logoBackground: string; // Can be preset value or custom hex color
}

const initialFormData: SponsorFormData = {
  name: "",
  email: "",
  phone: "",
  type: "person",
  sponsorshipTypes: [],
  sponsorshipOtherText: "",
  logoUrl: "",
  logoBackground: "transparent",
};

const LOGO_BACKGROUND_PRESETS = [
  { value: "transparent", label: "شفاف", color: "bg-transparent border-2 border-dashed" },
  { value: "dark", label: "داكن", color: "bg-gray-900" },
  { value: "light", label: "فاتح", color: "bg-white border" },
  { value: "primary", label: "رئيسي", color: "bg-primary" },
] as const;

// Helper to check if a value is a preset or custom color
const isPresetBackground = (value: string) =>
  LOGO_BACKGROUND_PRESETS.some(p => p.value === value);

// Helper to check if value is a valid hex color
const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

export default function SponsorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isExpanded, toggleRow } = useExpandableRows();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddToEventDialogOpen, setIsAddToEventDialogOpen] = useState(false);
  const [isLinkUserDialogOpen, setIsLinkUserDialogOpen] = useState(false);
  const [isUnlinkUserDialogOpen, setIsUnlinkUserDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);

  // Add to Event dialog state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [selectedSponsorshipType, setSelectedSponsorshipType] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

  // Link to User dialog state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Fetch sponsor data
  const { data: sponsor, isLoading } = api.sponsor.getById.useQuery({ id });

  // Fetch available sessions for Add to Event dialog
  const { data: availableSessions } = api.sponsor.getAvailableSessions.useQuery(
    {
      search: sessionSearchQuery || undefined,
      sponsorId: id,
      limit: 20,
    },
    { enabled: isAddToEventDialogOpen }
  );

  // Update mutation
  const updateSponsor = api.sponsor.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الراعي بنجاح");
      utils.sponsor.getById.invalidate({ id });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الراعي");
    },
  });

  // Delete mutation
  const deleteSponsor = api.sponsor.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الراعي بنجاح");
      router.push("/admin/sponsors");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الراعي");
    },
  });

  // Unlink sponsorship mutation
  const unlinkSponsorship = api.sponsor.unlinkFromSession.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الربط بنجاح");
      utils.sponsor.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء الربط");
    },
  });

  // Add to event mutation
  const addToEvent = api.sponsor.linkToSession.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الرعاية بنجاح");
      utils.sponsor.getById.invalidate({ id });
      utils.sponsor.getAvailableSessions.invalidate();
      resetAddToEventForm();
      setIsAddToEventDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الرعاية");
    },
  });

  // Search users for linking
  const { data: searchedUsers, isLoading: isSearchingUsers } =
    api.sponsor.searchUsersForLinking.useQuery(
      { search: userSearchQuery, limit: 10 },
      { enabled: isLinkUserDialogOpen && userSearchQuery.length >= 2 }
    );

  // Link to user mutation
  const linkToUser = api.sponsor.linkToUser.useMutation({
    onSuccess: () => {
      toast.success("تم ربط الراعي بالمستخدم بنجاح");
      utils.sponsor.getById.invalidate({ id });
      resetLinkUserForm();
      setIsLinkUserDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء ربط الراعي");
    },
  });

  // Unlink from user mutation
  const unlinkFromUser = api.sponsor.unlinkFromUser.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء ربط الراعي بالمستخدم بنجاح");
      utils.sponsor.getById.invalidate({ id });
      setIsUnlinkUserDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء الربط");
    },
  });

  const resetAddToEventForm = () => {
    setSelectedSessionId(null);
    setSelectedSponsorshipType("");
    setEventNotes("");
    setSessionSearchQuery("");
  };

  const resetLinkUserForm = () => {
    setUserSearchQuery("");
    setSelectedUserId(null);
  };

  const handleLinkToUser = () => {
    if (!selectedUserId) {
      toast.error("يرجى اختيار مستخدم");
      return;
    }
    linkToUser.mutate({
      sponsorId: id,
      userId: selectedUserId,
    });
  };

  const handleAddToEvent = () => {
    if (!selectedSessionId) {
      toast.error("يرجى اختيار حدث");
      return;
    }
    if (!selectedSponsorshipType) {
      toast.error("يرجى اختيار نوع الرعاية");
      return;
    }

    addToEvent.mutate({
      sessionId: selectedSessionId,
      sponsorId: id,
      sponsorshipType: selectedSponsorshipType,
      isSelfSponsored: false,
      notes: eventNotes || undefined,
    });
  };

  const handleOpenEditDialog = () => {
    if (!sponsor) return;
    setFormData({
      name: sponsor.name,
      email: sponsor.email || "",
      phone: sponsor.phone || "",
      type: sponsor.type as "person" | "company",
      sponsorshipTypes: sponsor.sponsorshipTypes,
      sponsorshipOtherText: sponsor.sponsorshipOtherText || "",
      logoUrl: sponsor.logoUrl || "",
      logoBackground: sponsor.logoBackground || "transparent",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSponsor = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (
      formData.sponsorshipTypes.includes("other") &&
      !formData.sponsorshipOtherText.trim()
    ) {
      toast.error("يرجى تحديد نوع الرعاية الأخرى");
      return;
    }

    updateSponsor.mutate({
      id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      type: formData.type,
      sponsorshipTypes: formData.sponsorshipTypes,
      sponsorshipOtherText: formData.sponsorshipOtherText || null,
      logoUrl: formData.logoUrl || null,
      logoBackground: formData.logoBackground,
    });
  };

  const handleDelete = () => {
    deleteSponsor.mutate({ id });
  };

  const handleWhatsApp = (phone: string) => {
    const url = getWhatsAppUrl(phone, "");
    window.open(url, "_blank");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!sponsor) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <UtensilsCrossed className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">الراعي غير موجود</h1>
        <p className="text-muted-foreground mb-4">
          لم يتم العثور على الراعي المطلوب
        </p>
        <Button asChild>
          <Link href="/admin/sponsors">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرعاة
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/admin/sponsors">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <SponsorLogo
              logoUrl={sponsor.logoUrl}
              name={sponsor.name}
              type={sponsor.type}
              logoBackground={sponsor.logoBackground}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{sponsor.name}</h1>
                <Badge
                  variant={sponsor.type === "company" ? "default" : "secondary"}
                  className="gap-1"
                >
                  {sponsor.type === "company" ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {getSponsorTypeLabel(sponsor.type)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    sponsor.isActive
                      ? "bg-green-500/10 text-green-600 border-green-200"
                      : "bg-red-500/10 text-red-600 border-red-200"
                  )}
                >
                  {sponsor.isActive ? "نشط" : "معطل"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                انضم في {formatArabicDate(sponsor.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mr-12 md:mr-0">
          <Button variant="outline" onClick={handleOpenEditDialog}>
            <Pencil className="ml-2 h-4 w-4" />
            تعديل
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الرعايات
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sponsor.eventSponsorships.length}
            </div>
            <p className="text-xs text-muted-foreground">فعالية تمت رعايتها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أنواع الرعاية</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sponsor.sponsorshipTypes.length}
            </div>
            <p className="text-xs text-muted-foreground">نوع رعاية متاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مرتبط بعضو</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {sponsor.user ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">
                    نعم
                  </span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold text-muted-foreground">
                    لا
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {sponsor.user ? sponsor.user.name : "راعي مستقل"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              تاريخ الانضمام
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatArabicDate(sponsor.createdAt)}
            </div>
            <p className="text-xs text-muted-foreground">
              آخر تحديث: {formatArabicDate(sponsor.updatedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Labels Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                التصنيفات
              </CardTitle>
              <SponsorLabelManager
                sponsorId={sponsor.id}
                sponsorLabels={sponsor.labels ?? []}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Pencil className="h-3 w-3 me-1" />
                    تعديل
                  </Button>
                }
                onUpdate={() => utils.sponsor.getById.invalidate({ id })}
              />
            </CardHeader>
            <CardContent>
              {sponsor.labels && sponsor.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sponsor.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{
                        backgroundColor: label.color + "20",
                        color: label.color,
                        borderColor: label.color + "40",
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد تصنيفات</p>
              )}
            </CardContent>
          </Card>
          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات التواصل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {sponsor.email ? (
                  <a
                    href={`mailto:${sponsor.email}`}
                    className="text-sm hover:underline"
                    dir="ltr"
                  >
                    {sponsor.email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {sponsor.phone ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${sponsor.phone}`}
                      className="text-sm hover:underline"
                      dir="ltr"
                    >
                      {sponsor.phone}
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleWhatsApp(sponsor.phone!)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* Social Media Links */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    التواصل الاجتماعي
                  </p>
                  <SponsorSocialMedia
                    sponsorId={sponsor.id}
                    socialMediaLinks={
                      sponsor.socialMediaLinks as Record<string, string> | null
                    }
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="h-3 w-3 me-1" />
                        تعديل
                      </Button>
                    }
                    onUpdate={() => utils.sponsor.getById.invalidate({ id })}
                  />
                </div>
                <SponsorSocialMediaIcons
                  socialMediaLinks={
                    sponsor.socialMediaLinks as Record<string, string> | null
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Sponsor Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                تفاصيل الراعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sponsor.logoUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">الشعار</p>
                  <SponsorLogo
                    logoUrl={sponsor.logoUrl}
                    name={sponsor.name}
                    type={sponsor.type}
                    logoBackground={sponsor.logoBackground}
                    size="xl"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">نوع الراعي</p>
                <Badge
                  variant={sponsor.type === "company" ? "default" : "secondary"}
                  className="gap-1"
                >
                  {sponsor.type === "company" ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {getSponsorTypeLabel(sponsor.type)}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  أنواع الرعاية المتاحة
                </p>
                <div className="flex flex-wrap gap-1">
                  {sponsor.sponsorshipTypes.length > 0 ? (
                    sponsor.sponsorshipTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {getSponsorshipTypeLabel(type)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {sponsor.sponsorshipOtherText && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1">
                    تفاصيل أخرى
                  </p>
                  <p className="text-sm">{sponsor.sponsorshipOtherText}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <SponsorAttachmentsCard
            sponsorId={sponsor.id}
            onUpdate={() => utils.sponsor.getById.invalidate({ id })}
          />

          {/* Linked User Card */}
          {sponsor.user && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                  المستخدم المرتبط
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={() => setIsUnlinkUserDialogOpen(true)}
                  title="إلغاء الربط"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/admin/users/${sponsor.user.id}`}
                  className="block hover:bg-blue-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <p className="font-medium hover:underline">
                    {sponsor.user.name}
                  </p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {sponsor.user.email}
                  </p>
                  {sponsor.user.phone && (
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {sponsor.user.phone}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {sponsor.user.role}
                  </Badge>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleOpenEditDialog}>
                  <Pencil className="ml-2 h-4 w-4" />
                  تعديل البيانات
                </Button>
                {sponsor.phone && (
                  <Button
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleWhatsApp(sponsor.phone!)}
                  >
                    <MessageCircle className="ml-2 h-4 w-4" />
                    واتساب
                  </Button>
                )}
                {sponsor.email && (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${sponsor.email}`}>
                      <Mail className="ml-2 h-4 w-4" />
                      بريد إلكتروني
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsAddToEventDialogOpen(true)}
                >
                  <CalendarPlus className="ml-2 h-4 w-4" />
                  إضافة إلى حدث
                </Button>
                {sponsor.user ? (
                  <Button
                    variant="outline"
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => setIsUnlinkUserDialogOpen(true)}
                  >
                    <Unlink className="ml-2 h-4 w-4" />
                    إلغاء ربط المستخدم
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsLinkUserDialogOpen(true)}
                  >
                    <UserPlus className="ml-2 h-4 w-4" />
                    ربط بمستخدم
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <SponsorNotesCard
            sponsorId={sponsor.id}
            noteCount={sponsor._count?.notes ?? 0}
            onUpdate={() => utils.sponsor.getById.invalidate({ id })}
          />

          {/* Sponsorship History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل الرعايات</CardTitle>
              <CardDescription>
                {sponsor.eventSponsorships.length} رعاية مسجلة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sponsor.eventSponsorships.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>لا توجد رعايات مسجلة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحدث</TableHead>
                      <TableHead className="hidden md:table-cell">
                        التاريخ
                      </TableHead>
                      <TableHead>نوع الرعاية</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        رعاية ذاتية
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        ملاحظات
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        إجراءات
                      </TableHead>
                      <TableHead className="md:hidden w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsor.eventSponsorships.map((sponsorship) => {
                      const expanded = isExpanded(sponsorship.id);
                      return (
                        <React.Fragment key={sponsorship.id}>
                          <TableRow>
                            <TableCell>
                              <Link
                                href={`/admin/sessions/${sponsorship.session.id}`}
                                className="font-medium hover:underline"
                              >
                                {sponsorship.session.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                #{sponsorship.session.sessionNumber}
                              </p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {formatArabicDate(sponsorship.session.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-primary/10 text-primary border-primary/20"
                              >
                                {getSponsorshipTypeLabel(
                                  sponsorship.sponsorshipType
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {sponsorship.isSelfSponsored ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                                {sponsorship.notes || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  title="عرض الحدث"
                                >
                                  <Link
                                    href={`/admin/sessions/${sponsorship.session.id}`}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    unlinkSponsorship.mutate({
                                      id: sponsorship.id,
                                    })
                                  }
                                  disabled={unlinkSponsorship.isPending}
                                  title="إلغاء الربط"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="md:hidden">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRow(sponsorship.id)}
                              >
                                {expanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {/* Mobile expanded row */}
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
                                  <div className="p-4 bg-muted/30 border-b space-y-3">
                                    <div className="text-sm space-y-2">
                                      <div>
                                        <span className="text-muted-foreground">
                                          التاريخ:
                                        </span>
                                        <span className="mr-1">
                                          {formatArabicDate(
                                            sponsorship.session.date
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          رعاية ذاتية:
                                        </span>
                                        <span className="mr-1">
                                          {sponsorship.isSelfSponsored
                                            ? "نعم"
                                            : "لا"}
                                        </span>
                                      </div>
                                      {sponsorship.notes && (
                                        <div>
                                          <span className="text-muted-foreground">
                                            ملاحظات:
                                          </span>
                                          <span className="mr-1">
                                            {sponsorship.notes}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <Link
                                          href={`/admin/sessions/${sponsorship.session.id}`}
                                        >
                                          <ExternalLink className="ml-1 h-3 w-3" />
                                          عرض الحدث
                                        </Link>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                          unlinkSponsorship.mutate({
                                            id: sponsorship.id,
                                          })
                                        }
                                        disabled={unlinkSponsorship.isPending}
                                      >
                                        <X className="ml-1 h-3 w-3" />
                                        إلغاء الربط
                                      </Button>
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الراعي</DialogTitle>
            <DialogDescription>قم بتعديل بيانات الراعي</DialogDescription>
          </DialogHeader>

          <SponsorForm
            formData={formData}
            setFormData={setFormData}
            isPending={updateSponsor.isPending}
            onSubmit={handleUpdateSponsor}
            onCancel={() => setIsEditDialogOpen(false)}
            submitLabel="حفظ التعديلات"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الراعي؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء تنشيط الراعي &quot;{sponsor.name}&quot;. يمكن استعادته
              لاحقاً.
              {sponsor.eventSponsorships.length > 0 && (
                <span className="block mt-2 text-amber-600">
                  تنبيه: هذا الراعي مرتبط بـ {sponsor.eventSponsorships.length}{" "}
                  رعاية.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSponsor.isPending}
            >
              {deleteSponsor.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Event Dialog */}
      <Dialog
        open={isAddToEventDialogOpen}
        onOpenChange={(open) => {
          setIsAddToEventDialogOpen(open);
          if (!open) resetAddToEventForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة راعي إلى حدث</DialogTitle>
            <DialogDescription>
              اختر الحدث ونوع الرعاية لإضافة {sponsor.name} كراعي
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Session Selection */}
            <div className="space-y-2">
              <Label>الحدث *</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن حدث..."
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>

              {availableSessions && availableSessions.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                        selectedSessionId === session.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {session.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            #{session.sessionNumber} •{" "}
                            {formatArabicDate(session.date)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex-shrink-0",
                            session.status === "active" &&
                              "bg-green-500/10 text-green-600 border-green-200",
                            session.status === "upcoming" &&
                              "bg-blue-500/10 text-blue-600 border-blue-200",
                            session.status === "completed" &&
                              "bg-gray-500/10 text-gray-600 border-gray-200"
                          )}
                        >
                          {session.status === "active"
                            ? "نشط"
                            : session.status === "upcoming"
                            ? "قادم"
                            : session.status === "completed"
                            ? "مكتمل"
                            : session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {availableSessions && availableSessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد أحداث متاحة
                </p>
              )}

              {selectedSessionId && availableSessions && (
                <p className="text-sm text-primary">
                  تم اختيار:{" "}
                  {
                    availableSessions.find((s) => s.id === selectedSessionId)
                      ?.title
                  }
                </p>
              )}
            </div>

            {/* Sponsorship Type Selection */}
            <div className="space-y-2">
              <Label>نوع الرعاية *</Label>
              <Select
                value={selectedSponsorshipType}
                onValueChange={setSelectedSponsorshipType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الرعاية" />
                </SelectTrigger>
                <SelectContent>
                  {SPONSORSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetAddToEventForm();
                setIsAddToEventDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleAddToEvent} disabled={addToEvent.isPending}>
              {addToEvent.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ الإضافة...
                </>
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to User Dialog */}
      <Dialog
        open={isLinkUserDialogOpen}
        onOpenChange={(open) => {
          setIsLinkUserDialogOpen(open);
          if (!open) resetLinkUserForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ربط الراعي بمستخدم</DialogTitle>
            <DialogDescription>
              ابحث عن مستخدم (عضو أو ضيف) لربط الراعي {sponsor.name} به
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>بحث عن مستخدم</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            {/* Search Results */}
            {userSearchQuery.length >= 2 && (
              <div className="space-y-2">
                {isSearchingUsers ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : searchedUsers && searchedUsers.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {searchedUsers.map((user) => (
                      <div
                        key={user.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                          selectedUserId === user.id && "bg-primary/10"
                        )}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p
                              className="text-sm text-muted-foreground"
                              dir="ltr"
                            >
                              {user.email}
                            </p>
                            {user.phone && (
                              <p
                                className="text-xs text-muted-foreground"
                                dir="ltr"
                              >
                                {user.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-left flex-shrink-0">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.sponsorCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.sponsorCount} راعي مرتبط
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد نتائج
                  </p>
                )}
              </div>
            )}

            {userSearchQuery.length < 2 && userSearchQuery.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                أدخل حرفين على الأقل للبحث
              </p>
            )}

            {selectedUserId && searchedUsers && (
              <p className="text-sm text-primary">
                تم اختيار:{" "}
                {searchedUsers.find((u) => u.id === selectedUserId)?.name}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetLinkUserForm();
                setIsLinkUserDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleLinkToUser}
              disabled={linkToUser.isPending || !selectedUserId}
            >
              {linkToUser.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ الربط...
                </>
              ) : (
                <>
                  <UserPlus className="ml-2 h-4 w-4" />
                  ربط
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink User Confirmation Dialog */}
      <AlertDialog
        open={isUnlinkUserDialogOpen}
        onOpenChange={setIsUnlinkUserDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء ربط المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء ربط الراعي &quot;{sponsor.name}&quot;
              بالمستخدم &quot;{sponsor.user?.name}&quot;؟
              <br />
              <span className="text-muted-foreground">
                يمكنك إعادة ربط الراعي بمستخدم آخر لاحقاً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unlinkFromUser.mutate({ sponsorId: id })}
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={unlinkFromUser.isPending}
            >
              {unlinkFromUser.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ الإلغاء...
                </>
              ) : (
                "تأكيد الإلغاء"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sponsor Logo component with presigned URL support
function SponsorLogo({
  logoUrl,
  name,
  type,
  logoBackground = "transparent",
  size = "md",
}: {
  logoUrl: string | null;
  name: string;
  type: string;
  logoBackground?: string;
  size?: "md" | "lg" | "xl";
}) {
  const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

  const sizeClasses = {
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const iconSizes = {
    md: "h-4 w-4",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  // Background style classes
  const bgClasses: Record<string, string> = {
    transparent: "bg-muted",
    dark: "bg-gray-900",
    light: "bg-white",
    primary: "bg-primary",
  };

  const isCustomColor = isHexColor(logoBackground);
  const bgClass = isCustomColor ? "" : (bgClasses[logoBackground] || bgClasses.transparent);

  if (logoUrl && presignedUrl) {
    return (
      <div
        className={cn(
          "relative rounded-lg overflow-hidden border flex-shrink-0",
          sizeClasses[size],
          bgClass
        )}
        style={isCustomColor ? { backgroundColor: logoBackground } : undefined}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <img
            src={presignedUrl}
            alt={name}
            className="h-full w-full object-contain"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted flex items-center justify-center flex-shrink-0",
        sizeClasses[size]
      )}
    >
      {type === "company" ? (
        <Building2 className={cn("text-muted-foreground", iconSizes[size])} />
      ) : (
        <User className={cn("text-muted-foreground", iconSizes[size])} />
      )}
    </div>
  );
}

// Background style mapping for logo preview
const LOGO_BG_CLASSES: Record<string, string> = {
  transparent: "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]",
  dark: "bg-gray-900",
  light: "bg-white",
  primary: "bg-primary",
};

// Logo preview component with presigned URL support for form
function LogoPreview({
  logoUrl,
  logoBackground = "transparent",
  onRemove,
  disabled,
}: {
  logoUrl: string;
  logoBackground?: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

  // Determine background style
  const isCustomColor = isHexColor(logoBackground);
  const bgClass = isCustomColor ? "" : (LOGO_BG_CLASSES[logoBackground] || LOGO_BG_CLASSES.transparent);

  return (
    <div
      className={cn("relative w-20 h-20 rounded-lg border overflow-hidden", bgClass)}
      style={isCustomColor ? { backgroundColor: logoBackground } : undefined}
    >
      {isLoading ? (
        <Skeleton className="w-full h-full" />
      ) : (
        <img
          src={presignedUrl}
          alt="شعار الراعي"
          className="w-full h-full object-contain"
        />
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 h-6 w-6"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Sponsor Form component (reused from sponsors page)
function SponsorForm({
  formData,
  setFormData,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  formData: SponsorFormData;
  setFormData: React.Dispatch<React.SetStateAction<SponsorFormData>>;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WebP, SVG"
      );
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("حجم الملف يتجاوز الحد المسموح (2 ميجابايت)");
      return;
    }

    setIsUploading(true);

    try {
      const tempId = `temp-${Date.now()}`;
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        imageType: "sponsorLogo",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: tempId,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("فشل رفع الصورة");
      }

      setFormData({ ...formData, logoUrl: publicUrl });
      toast.success("تم رفع الشعار بنجاح");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("حدث خطأ أثناء رفع الشعار");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logoUrl: "" });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Logo Upload Section */}
        <div className="space-y-2">
          <Label>الشعار (اختياري)</Label>
          <div className="flex items-start gap-4">
            <div className="relative">
              {formData.logoUrl ? (
                <LogoPreview
                  logoUrl={formData.logoUrl}
                  logoBackground={formData.logoBackground}
                  onRemove={handleRemoveLogo}
                  disabled={isPending}
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploading || isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Upload className="me-2 h-4 w-4" />
                    {formData.logoUrl ? "تغيير الشعار" : "رفع شعار"}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP أو SVG (حد أقصى 2 ميجابايت)
              </p>
            </div>
          </div>
          {formData.logoUrl && (
            <div className="space-y-2">
              <Label>خلفية الشعار</Label>
              <p className="text-xs text-muted-foreground mb-2">
                اختر خلفية مناسبة للشعارات ذات الخلفية الشفافة
              </p>
              <div className="flex flex-wrap gap-2">
                {LOGO_BACKGROUND_PRESETS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, logoBackground: option.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      formData.logoBackground === option.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded", option.color)} />
                    <span className="text-xs">{option.label}</span>
                  </button>
                ))}
                {/* Custom color option */}
                <div className="flex flex-col items-center gap-1 p-2">
                  <label
                    className={cn(
                      "relative w-8 h-8 rounded cursor-pointer overflow-hidden border-2",
                      !isPresetBackground(formData.logoBackground)
                        ? "ring-2 ring-primary ring-offset-2"
                        : "border-dashed border-muted-foreground/50 hover:border-primary"
                    )}
                  >
                    <input
                      type="color"
                      value={isHexColor(formData.logoBackground) ? formData.logoBackground : "#ffffff"}
                      onChange={(e) => setFormData({ ...formData, logoBackground: e.target.value })}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div
                      className="w-full h-full"
                      style={{
                        background: isHexColor(formData.logoBackground)
                          ? formData.logoBackground
                          : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                      }}
                    />
                  </label>
                  <span className="text-xs">مخصص</span>
                </div>
              </div>
              {isHexColor(formData.logoBackground) && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: formData.logoBackground }}
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {formData.logoBackground}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sponsorName">الاسم *</Label>
            <Input
              id="sponsorName"
              placeholder="اسم الراعي"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorType">نوع الراعي *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "person" | "company") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger id="sponsorType">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                {SPONSOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sponsorPhone">رقم الهاتف (اختياري)</Label>
            <PhoneInput
              id="sponsorPhone"
              international
              defaultCountry="SA"
              value={formData.phone}
              onChange={(value) =>
                setFormData({ ...formData, phone: value || "" })
              }
              className="phone-input-container flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring md:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorEmail">البريد الإلكتروني (اختياري)</Label>
            <Input
              id="sponsorEmail"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>أنواع الرعاية *</Label>
          <div className="grid gap-2 grid-cols-2">
            {SPONSORSHIP_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={`sponsorship-${type.value}`}
                  checked={formData.sponsorshipTypes.includes(type.value)}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...formData.sponsorshipTypes, type.value]
                      : formData.sponsorshipTypes.filter(
                          (t) => t !== type.value
                        );
                    setFormData({ ...formData, sponsorshipTypes: types });
                  }}
                />
                <Label
                  htmlFor={`sponsorship-${type.value}`}
                  className="cursor-pointer text-sm"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {formData.sponsorshipTypes.includes("other") && (
          <div className="space-y-2">
            <Label htmlFor="sponsorOtherText">حدد نوع الرعاية الأخرى *</Label>
            <Textarea
              id="sponsorOtherText"
              placeholder="اكتب تفاصيل نوع الرعاية..."
              value={formData.sponsorshipOtherText}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sponsorshipOtherText: e.target.value,
                })
              }
              rows={3}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              جارٍ الحفظ...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

// Inline Notes Card component with scrollable notes list
function SponsorNotesCard({
  sponsorId,
  noteCount,
  onUpdate,
}: {
  sponsorId: string;
  noteCount: number;
  onUpdate: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const utils = api.useUtils();

  // Fetch notes for this sponsor
  const { data: notes, isLoading } = api.sponsor.getNotes.useQuery(
    { sponsorId },
    { enabled: !!sponsorId }
  );

  const addNoteMutation = api.sponsor.addNote.useMutation({
    onSuccess: () => {
      setNewNote("");
      utils.sponsor.getNotes.invalidate({ sponsorId });
      onUpdate();
      toast.success("تم إضافة الملاحظة");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteNoteMutation = api.sponsor.deleteNote.useMutation({
    onSuccess: () => {
      utils.sponsor.getNotes.invalidate({ sponsorId });
      onUpdate();
      toast.success("تم حذف الملاحظة");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      sponsorId,
      content: newNote.trim(),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            الملاحظات
            {noteCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {noteCount}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>ملاحظات داخلية عن الراعي</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new note input */}
        <div className="flex gap-2">
          <Input
            placeholder="أضف ملاحظة جديدة..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            disabled={addNoteMutation.isPending}
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addNoteMutation.isPending}
            size="icon"
          >
            {addNoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Notes list */}
        <div className="max-h-64 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : notes && notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-muted/50 rounded-lg space-y-2 group"
              >
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{note.createdBy.name}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() =>
                      deleteNoteMutation.mutate({ noteId: note.id })
                    }
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد ملاحظات</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Attachment type for preview
interface AttachmentData {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

// Sponsor Attachments Card component
function SponsorAttachmentsCard({
  sponsorId,
  onUpdate,
}: {
  sponsorId: string;
  onUpdate: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentData | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  // Fetch attachments
  const { data: attachments, isLoading } = api.sponsor.getAttachments.useQuery(
    { sponsorId },
    { enabled: !!sponsorId }
  );

  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();

  const addAttachmentMutation = api.sponsor.addAttachment.useMutation({
    onSuccess: () => {
      utils.sponsor.getAttachments.invalidate({ sponsorId });
      onUpdate();
      toast.success("تم إضافة المرفق بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المرفق");
    },
  });

  const removeAttachmentMutation = api.sponsor.removeAttachment.useMutation({
    onSuccess: () => {
      utils.sponsor.getAttachments.invalidate({ sponsorId });
      onUpdate();
      toast.success("تم حذف المرفق بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المرفق");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("حجم الملف يتجاوز الحد المسموح (10 ميجابايت)");
      return;
    }

    setIsUploading(true);

    try {
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        imageType: "sponsorAttachment",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: sponsorId,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("فشل رفع الملف");
      }

      // Add attachment metadata to sponsor
      await addAttachmentMutation.mutateAsync({
        sponsorId,
        filename: file.name,
        url: publicUrl,
        contentType: file.type,
        size: file.size,
      });
    } catch (error) {
      console.error("Attachment upload error:", error);
      toast.error("حدث خطأ أثناء رفع الملف");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    if (contentType === "application/pdf") {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (
      contentType.includes("spreadsheet") ||
      contentType.includes("excel")
    ) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    if (contentType.includes("word") || contentType.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          المرفقات
          {attachments && attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {attachments.length}
            </Badge>
          )}
        </CardTitle>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 me-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 me-1" />
            )}
            {isUploading ? "جاري الرفع..." : "إضافة"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                onRemove={() =>
                  removeAttachmentMutation.mutate({
                    sponsorId,
                    attachmentId: attachment.id,
                  })
                }
                onPreview={() => setPreviewAttachment(attachment)}
                isRemoving={removeAttachmentMutation.isPending}
                getFileIcon={getFileIcon}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد مرفقات</p>
            <p className="text-xs mt-1">
              PDF, Word, Excel, صور (حد أقصى 10 ميجابايت)
            </p>
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        getFileIcon={getFileIcon}
        formatFileSize={formatFileSize}
      />
    </Card>
  );
}

// Attachment Preview Dialog component
function AttachmentPreviewDialog({
  attachment,
  onClose,
  getFileIcon,
  formatFileSize,
}: {
  attachment: AttachmentData | null;
  onClose: () => void;
  getFileIcon: (contentType: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
}) {
  const { url: presignedUrl, isLoading: isUrlLoading } = usePresignedUrl(attachment?.url ?? null);

  if (!attachment) return null;

  const isImage = attachment.contentType.startsWith("image/");
  const isPdf = attachment.contentType === "application/pdf";
  const canPreviewInline = isImage || isPdf;

  // For non-previewable files, open in new tab
  const handleOpenExternal = () => {
    if (presignedUrl) {
      window.open(presignedUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={!!attachment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] flex flex-col",
        canPreviewInline ? "p-0" : "p-6"
      )}>
        {canPreviewInline ? (
          <>
            {/* Header for inline preview */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(attachment.contentType)}
                <div className="min-w-0">
                  <p className="font-medium truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={presignedUrl || attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.filename}
                  >
                    <Download className="h-4 w-4 me-2" />
                    تنزيل
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  فتح في نافذة جديدة
                </Button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto min-h-0 bg-muted/10">
              {isUrlLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isImage ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={presignedUrl || attachment.url}
                    alt={attachment.filename}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={presignedUrl || attachment.url}
                  className="w-full h-[70vh] border-0"
                  title={attachment.filename}
                />
              ) : null}
            </div>
          </>
        ) : (
          /* Non-previewable file dialog */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {getFileIcon(attachment.contentType)}
                <span className="truncate">{attachment.filename}</span>
              </DialogTitle>
              <DialogDescription>
                {formatFileSize(attachment.size)} • لا يمكن معاينة هذا النوع من الملفات مباشرة
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                هذا النوع من الملفات لا يدعم المعاينة المباشرة
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button asChild>
                  <a
                    href={presignedUrl || attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.filename}
                  >
                    <Download className="h-4 w-4 me-2" />
                    تنزيل الملف
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  فتح في نافذة جديدة
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Attachment Item component with presigned URL support
function AttachmentItem({
  attachment,
  onRemove,
  onPreview,
  isRemoving,
  getFileIcon,
  formatFileSize,
}: {
  attachment: AttachmentData;
  onRemove: () => void;
  onPreview: () => void;
  isRemoving: boolean;
  getFileIcon: (contentType: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
}) {
  const { url: presignedUrl } = usePresignedUrl(attachment.url);

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer"
      onClick={onPreview}
    >
      <div className="flex-shrink-0">{getFileIcon(attachment.contentType)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={attachment.filename}>
          {attachment.filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title="معاينة"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          asChild
          title="تنزيل"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={presignedUrl || attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.filename}
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isRemoving}
          title="حذف"
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
