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
  ExternalLink,
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Search,
  Trash2,
  Upload,
  User,
  UserCircle,
  UtensilsCrossed,
  X,
} from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Sponsor form data interface
interface SponsorFormData {
  name: string;
  email: string;
  phone: string;
  type: "person" | "company";
  sponsorshipTypes: string[];
  sponsorshipOtherText: string;
  logoUrl: string;
}

const initialFormData: SponsorFormData = {
  name: "",
  email: "",
  phone: "",
  type: "person",
  sponsorshipTypes: [],
  sponsorshipOtherText: "",
  logoUrl: "",
};

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
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);

  // Add to Event dialog state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSponsorshipType, setSelectedSponsorshipType] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

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

  const resetAddToEventForm = () => {
    setSelectedSessionId(null);
    setSelectedSponsorshipType("");
    setEventNotes("");
    setSessionSearchQuery("");
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
    });
  };

  const handleDelete = () => {
    deleteSponsor.mutate({ id });
  };

  const handleWhatsApp = (phone: string, name: string, sponsorshipTypes: string[]) => {
    const typesText = sponsorshipTypes.length > 0
      ? sponsorshipTypes.map(getSponsorshipTypeLabel).join(" و ")
      : "الثلوثية";
    const message = `مرحباً ${name}،\n\nنشكرك على عرضك لرعاية (${typesText}) للثلوثية.\n\nنود التواصل معك...`;
    const url = getWhatsAppUrl(phone, message);
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
            <CardTitle className="text-sm font-medium">تاريخ الانضمام</CardTitle>
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
                      onClick={() =>
                        handleWhatsApp(sponsor.phone!, sponsor.name, sponsor.sponsorshipTypes)
                      }
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
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
                    size="xl"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  نوع الراعي
                </p>
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

          {/* Linked User Card */}
          {sponsor.user && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                  المستخدم المرتبط
                </CardTitle>
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
                    onClick={() => handleWhatsApp(sponsor.phone!, sponsor.name, sponsor.sponsorshipTypes)}
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
              </div>
            </CardContent>
          </Card>

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
            <DialogDescription>
              قم بتعديل بيانات الراعي
            </DialogDescription>
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
                          <p className="font-medium truncate">{session.title}</p>
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
                  {availableSessions.find((s) => s.id === selectedSessionId)?.title}
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
    </div>
  );
}

// Sponsor Logo component with presigned URL support
function SponsorLogo({
  logoUrl,
  name,
  type,
  size = "md",
}: {
  logoUrl: string | null;
  name: string;
  type: string;
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

  if (logoUrl && presignedUrl) {
    return (
      <div
        className={cn(
          "relative rounded-lg overflow-hidden border bg-muted flex-shrink-0",
          sizeClasses[size]
        )}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <img
            src={presignedUrl}
            alt={name}
            className="h-full w-full object-cover"
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

// Logo preview component with presigned URL support for form
function LogoPreview({
  logoUrl,
  onRemove,
  disabled,
}: {
  logoUrl: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

  return (
    <div className="relative w-20 h-20 rounded-lg border overflow-hidden bg-muted">
      {isLoading ? (
        <Skeleton className="w-full h-full" />
      ) : (
        <img
          src={presignedUrl}
          alt="شعار الراعي"
          className="w-full h-full object-cover"
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
      toast.error("نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WebP, SVG");
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
