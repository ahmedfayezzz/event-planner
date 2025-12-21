"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatArabicDate, getWhatsAppUrl } from "@/lib/utils";
import {
  SPONSORSHIP_TYPES,
  SPONSOR_TYPES,
  SPONSOR_STATUSES,
  getSponsorshipTypeLabel,
  getSponsorTypeLabel,
  getSponsorStatusLabel,
  getSponsorStatusColor,
} from "@/lib/constants";
import {
  UtensilsCrossed,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Plus,
  MessageCircle,
  Pencil,
  Link2,
  UserCircle,
  Info,
  Upload,
  X,
  ImageIcon,
  Eye,
  CalendarPlus,
  Calendar,
  Search,
  UserPlus,
  Unlink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { usePresignedUrl } from "@/hooks/use-presigned-url";

interface SponsorFormData {
  name: string;
  email: string;
  phone: string;
  type: "person" | "company";
  status: "new" | "contacted" | "sponsored" | "interested_again" | "interested_permanent";
  sponsorshipTypes: string[];
  sponsorshipOtherText: string;
  logoUrl: string;
}

const initialFormData: SponsorFormData = {
  name: "",
  email: "",
  phone: "",
  type: "person",
  status: "new",
  sponsorshipTypes: [],
  sponsorshipOtherText: "",
  logoUrl: "",
};

export default function AdminSponsorsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sponsorshipTypeFilter, setSponsorshipTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddToEventDialogOpen, setIsAddToEventDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<string | null>(null);
  const [selectedSponsorForEvent, setSelectedSponsorForEvent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { isExpanded, toggleRow } = useExpandableRows();
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);

  // Add to Event dialog state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSponsorshipType, setSelectedSponsorshipType] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

  // Link to User dialog state
  const [isLinkUserDialogOpen, setIsLinkUserDialogOpen] = useState(false);
  const [selectedSponsorForUser, setSelectedSponsorForUser] = useState<{
    id: string;
    name: string;
    currentUserId: string | null;
  } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Unlink from User confirmation dialog state
  const [isUnlinkUserDialogOpen, setIsUnlinkUserDialogOpen] = useState(false);
  const [sponsorToUnlink, setSponsorToUnlink] = useState<{
    id: string;
    name: string;
    userName: string;
  } | null>(null);

  const utils = api.useUtils();

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.sponsor.getAll.useInfiniteQuery(
    {
      type: typeFilter !== "all" ? (typeFilter as "person" | "company") : undefined,
      status: statusFilter !== "all" ? (statusFilter as "new" | "contacted" | "sponsored" | "interested_again" | "interested_permanent") : undefined,
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const createSponsor = api.sponsor.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الراعي بنجاح");
      utils.sponsor.getAll.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الراعي");
    },
  });

  const updateSponsor = api.sponsor.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الراعي بنجاح");
      utils.sponsor.getAll.invalidate();
      setIsEditDialogOpen(false);
      setEditingSponsor(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الراعي");
    },
  });

  const updateStatus = api.sponsor.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الراعي بنجاح");
      utils.sponsor.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الحالة");
    },
  });

  // Fetch available sessions for Add to Event dialog
  const { data: availableSessions } = api.sponsor.getAvailableSessions.useQuery(
    {
      search: sessionSearchQuery || undefined,
      sponsorId: selectedSponsorForEvent?.id,
      limit: 20,
    },
    { enabled: isAddToEventDialogOpen && !!selectedSponsorForEvent }
  );

  // Add to event mutation
  const addToEvent = api.sponsor.linkToSession.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الرعاية بنجاح");
      utils.sponsor.getAll.invalidate();
      utils.sponsor.getAvailableSessions.invalidate();
      resetAddToEventForm();
      setIsAddToEventDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الرعاية");
    },
  });

  // Search users for linking
  const { data: searchedUsers, isLoading: isSearchingUsers } = api.sponsor.searchUsersForLinking.useQuery(
    { search: userSearchQuery, limit: 10 },
    { enabled: isLinkUserDialogOpen && userSearchQuery.length >= 2 }
  );

  // Link to user mutation
  const linkToUser = api.sponsor.linkToUser.useMutation({
    onSuccess: () => {
      toast.success("تم ربط الراعي بالمستخدم بنجاح");
      utils.sponsor.getAll.invalidate();
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
      utils.sponsor.getAll.invalidate();
      setIsUnlinkUserDialogOpen(false);
      setSponsorToUnlink(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء الربط");
    },
  });

  const allSponsors = data?.pages.flatMap((page) => page.sponsors) ?? [];

  // Filter by sponsorship type on client side
  const filteredSponsors = sponsorshipTypeFilter === "all"
    ? allSponsors
    : allSponsors.filter((s) => s.sponsorshipTypes.includes(sponsorshipTypeFilter));

  const { refetch: fetchCsv } = api.sponsor.export.useQuery(undefined, {
    enabled: false,
  });

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const resetAddToEventForm = () => {
    setSelectedSessionId(null);
    setSelectedSponsorshipType("");
    setEventNotes("");
    setSessionSearchQuery("");
    setSelectedSponsorForEvent(null);
  };

  const resetLinkUserForm = () => {
    setUserSearchQuery("");
    setSelectedUserId(null);
    setSelectedSponsorForUser(null);
  };

  const handleOpenAddToEventDialog = (sponsor: { id: string; name: string }) => {
    setSelectedSponsorForEvent(sponsor);
    setIsAddToEventDialogOpen(true);
  };

  const handleOpenLinkUserDialog = (sponsor: { id: string; name: string; userId: string | null }) => {
    setSelectedSponsorForUser({
      id: sponsor.id,
      name: sponsor.name,
      currentUserId: sponsor.userId,
    });
    setIsLinkUserDialogOpen(true);
  };

  const handleLinkToUser = () => {
    if (!selectedSponsorForUser || !selectedUserId) {
      toast.error("يرجى اختيار مستخدم");
      return;
    }

    linkToUser.mutate({
      sponsorId: selectedSponsorForUser.id,
      userId: selectedUserId,
    });
  };

  const handleOpenUnlinkDialog = (sponsor: { id: string; name: string; userName: string }) => {
    setSponsorToUnlink(sponsor);
    setIsUnlinkUserDialogOpen(true);
  };

  const handleConfirmUnlink = () => {
    if (!sponsorToUnlink) return;
    unlinkFromUser.mutate({ sponsorId: sponsorToUnlink.id });
  };

  const handleAddToEvent = () => {
    if (!selectedSponsorForEvent) return;
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
      sponsorId: selectedSponsorForEvent.id,
      sponsorshipType: selectedSponsorshipType,
      isSelfSponsored: false,
      notes: eventNotes || undefined,
    });
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setEditingSponsor(null);
    setIsAddDialogOpen(true);
  };

  const handleAddSponsor = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (formData.sponsorshipTypes.length === 0) {
      toast.error("يجب اختيار نوع رعاية واحد على الأقل");
      return;
    }
    if (formData.sponsorshipTypes.includes("other") && !formData.sponsorshipOtherText.trim()) {
      toast.error("يرجى تحديد نوع الرعاية الأخرى");
      return;
    }

    createSponsor.mutate({
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      type: formData.type,
      status: formData.status,
      sponsorshipTypes: formData.sponsorshipTypes,
      sponsorshipOtherText: formData.sponsorshipOtherText || undefined,
      logoUrl: formData.logoUrl || undefined,
    });
  };

  const handleUpdateSponsor = () => {
    if (!editingSponsor) return;
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (formData.sponsorshipTypes.includes("other") && !formData.sponsorshipOtherText.trim()) {
      toast.error("يرجى تحديد نوع الرعاية الأخرى");
      return;
    }

    updateSponsor.mutate({
      id: editingSponsor,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      type: formData.type,
      status: formData.status,
      sponsorshipTypes: formData.sponsorshipTypes,
      sponsorshipOtherText: formData.sponsorshipOtherText || null,
      logoUrl: formData.logoUrl || null,
    });
  };

  const handleEditClick = (sponsor: typeof allSponsors[0]) => {
    setEditingSponsor(sponsor.id);
    setFormData({
      name: sponsor.name,
      email: sponsor.email || "",
      phone: sponsor.phone || "",
      type: sponsor.type as "person" | "company",
      status: (sponsor.status as "new" | "contacted" | "sponsored" | "interested_again" | "interested_permanent") || "new",
      sponsorshipTypes: sponsor.sponsorshipTypes,
      sponsorshipOtherText: sponsor.sponsorshipOtherText || "",
      logoUrl: sponsor.logoUrl || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleStatusChange = (sponsorId: string, newStatus: string) => {
    updateStatus.mutate({
      id: sponsorId,
      status: newStatus as "new" | "contacted" | "sponsored" | "interested_again" | "interested_permanent",
    });
  };

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `sponsors-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success(`تم تصدير ${result.data.count} راعي`);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const url = getWhatsAppUrl(phone, "");
    window.open(url, "_blank");
  };

  // Show skeleton only on initial load
  const showTableSkeleton = isLoading && allSponsors.length === 0;
  // Show inline loading indicator when filtering
  const showInlineLoading = isFetching && !isLoading;

  const SponsorTypeIcon = ({ type }: { type: string }) => {
    if (type === "company") {
      return <Building2 className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  // Component to display sponsor logo with presigned URL support
  const SponsorLogo = ({ logoUrl, name, type }: { logoUrl: string | null; name: string; type: string }) => {
    const { url: presignedUrl, isLoading } = usePresignedUrl(logoUrl);

    if (logoUrl && presignedUrl) {
      return (
        <div className="relative h-10 w-10 rounded-full overflow-hidden border bg-muted flex-shrink-0">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <img
              src={presignedUrl}
              alt={name}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback to icon on error
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement?.classList.add("fallback");
              }}
            />
          )}
          <div className="hidden fallback:flex h-full w-full items-center justify-center">
            <SponsorTypeIcon type={type} />
          </div>
        </div>
      );
    }

    return (
      <Avatar className="h-10 w-10">
        <AvatarFallback>
          <SponsorTypeIcon type={type} />
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الرعاة</h1>
          <p className="text-muted-foreground">
            قائمة الرعاة المتطوعين لتقديم الرعاية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAddDialog}>
            <Plus className="me-2 h-4 w-4" />
            إضافة راعي
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="me-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="نوع الراعي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {SPONSOR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {SPONSOR_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={sponsorshipTypeFilter}
                onValueChange={setSponsorshipTypeFilter}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="نوع الرعاية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع أنواع الرعاية</SelectItem>
                  {SPONSORSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsors Table */}
      <Card>
        <CardContent className="p-0">
          {showTableSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSponsors.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد رعاة</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleOpenAddDialog}
              >
                <Plus className="me-2 h-4 w-4" />
                إضافة راعي
              </Button>
            </div>
          ) : (
            <>
              {/* Inline loading indicator */}
              {showInlineLoading && (
                <div className="flex items-center justify-center gap-2 py-2 bg-muted/50 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحميل...
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الراعي</TableHead>
                    <TableHead className="hidden md:table-cell">التواصل</TableHead>
                    <TableHead>أنواع الرعاية</TableHead>
                    <TableHead className="hidden sm:table-cell">الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">النوع</TableHead>
                    <TableHead className="hidden lg:table-cell">مرتبط بعضو</TableHead>
                    <TableHead className="hidden lg:table-cell">الفعاليات</TableHead>
                    <TableHead className="hidden md:table-cell text-left">إجراءات</TableHead>
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSponsors.map((sponsor) => {
                    const expanded = isExpanded(sponsor.id);
                    return (
                      <React.Fragment key={sponsor.id}>
                        <TableRow>
                          <TableCell className="p-0">
                            <Link
                              href={`/admin/sponsors/${sponsor.id}`}
                              className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                            >
                              <SponsorLogo
                                logoUrl={sponsor.logoUrl}
                                name={sponsor.name}
                                type={sponsor.type}
                              />
                              <div>
                                <p className="font-medium hover:underline">
                                  {sponsor.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {getSponsorTypeLabel(sponsor.type)}
                                </p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell dir="ltr" className="hidden md:table-cell">
                            <div>
                              {sponsor.email ? (
                                <a
                                  href={`mailto:${sponsor.email}`}
                                  className="text-sm hover:underline underline"
                                >
                                  {sponsor.email}
                                </a>
                              ) : (
                                <p className="text-sm">-</p>
                              )}
                              {sponsor.phone ? (
                                <a
                                  href={`tel:${sponsor.phone}`}
                                  className="text-xs text-muted-foreground hover:underline underline block"
                                >
                                  {sponsor.phone}
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">-</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sponsor.sponsorshipTypes.map((type) => (
                                <TooltipProvider key={type}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "bg-primary/10 text-primary border-primary/20",
                                          type === "other" && sponsor.sponsorshipOtherText && "cursor-help"
                                        )}
                                      >
                                        {getSponsorshipTypeLabel(type)}
                                        {type === "other" && sponsor.sponsorshipOtherText && (
                                          <Info className="h-3 w-3 mr-1" />
                                        )}
                                      </Badge>
                                    </TooltipTrigger>
                                    {type === "other" && sponsor.sponsorshipOtherText && (
                                      <TooltipContent>
                                        <p>{sponsor.sponsorshipOtherText}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Select
                              value={sponsor.status}
                              onValueChange={(value) => handleStatusChange(sponsor.id, value)}
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="h-8 w-auto min-w-[120px]">
                                <Badge
                                  variant="outline"
                                  className={cn("font-normal", getSponsorStatusColor(sponsor.status))}
                                >
                                  {getSponsorStatusLabel(sponsor.status)}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {SPONSOR_STATUSES.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    <Badge
                                      variant="outline"
                                      className={cn("font-normal", getSponsorStatusColor(status.value))}
                                    >
                                      {status.label}
                                    </Badge>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={sponsor.type === "company" ? "default" : "secondary"}
                              className="gap-1"
                            >
                              <SponsorTypeIcon type={sponsor.type} />
                              {getSponsorTypeLabel(sponsor.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {sponsor.user ? (
                              <div className="flex items-center gap-1 text-sm">
                                <UserCircle className="h-4 w-4 text-green-600" />
                                <span>{sponsor.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {sponsor.eventSponsorships.length > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help">
                                      <Link2 className="h-3 w-3 me-1" />
                                      {sponsor.eventSponsorships.length} فعالية
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <ul className="text-sm space-y-1">
                                      {sponsor.eventSponsorships.map((es) => (
                                        <li key={es.id}>
                                          {es.session.title} - {getSponsorshipTypeLabel(es.sponsorshipType)}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="عرض"
                              >
                                <Link href={`/admin/sponsors/${sponsor.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(sponsor)}
                                title="تعديل"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleOpenAddToEventDialog({
                                    id: sponsor.id,
                                    name: sponsor.name,
                                  })
                                }
                                title="إضافة إلى حدث"
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                              {sponsor.user ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenUnlinkDialog({
                                    id: sponsor.id,
                                    name: sponsor.name,
                                    userName: sponsor.user!.name,
                                  })}
                                  title="إلغاء ربط المستخدم"
                                >
                                  <Unlink className="h-4 w-4 text-orange-500" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleOpenLinkUserDialog({
                                      id: sponsor.id,
                                      name: sponsor.name,
                                      userId: sponsor.userId,
                                    })
                                  }
                                  title="ربط بمستخدم"
                                >
                                  <UserPlus className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {sponsor.phone && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleWhatsApp(sponsor.phone!)}
                                  title="إرسال رسالة واتساب"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(sponsor.id)}
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
                          <td colSpan={4} className="p-0">
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
                                    <div dir="ltr">
                                      <span className="text-muted-foreground">البريد:</span>
                                      <span className="mr-1">{sponsor.email || "-"}</span>
                                    </div>
                                    <div dir="ltr">
                                      <span className="text-muted-foreground">الهاتف:</span>
                                      <span className="mr-1">{sponsor.phone || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">النوع:</span>
                                      <span className="mr-1">
                                        <Badge
                                          variant={sponsor.type === "company" ? "default" : "secondary"}
                                          className="gap-1"
                                        >
                                          {getSponsorTypeLabel(sponsor.type)}
                                        </Badge>
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">الحالة:</span>
                                      <span className="mr-1">
                                        <Badge
                                          variant="outline"
                                          className={cn("font-normal", getSponsorStatusColor(sponsor.status))}
                                        >
                                          {getSponsorStatusLabel(sponsor.status)}
                                        </Badge>
                                      </span>
                                    </div>
                                    {sponsor.user && (
                                      <div>
                                        <span className="text-muted-foreground">مرتبط بعضو:</span>
                                        <span className="mr-1">{sponsor.user.name}</span>
                                      </div>
                                    )}
                                    {sponsor.eventSponsorships.length > 0 && (
                                      <div>
                                        <span className="text-muted-foreground">الفعاليات:</span>
                                        <span className="mr-1">
                                          {sponsor.eventSponsorships.length} فعالية
                                        </span>
                                      </div>
                                    )}
                                    {sponsor.sponsorshipOtherText && (
                                      <div>
                                        <span className="text-muted-foreground">تفاصيل أخرى:</span>
                                        <span className="mr-1">{sponsor.sponsorshipOtherText}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="pt-2 flex gap-2 flex-wrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                    >
                                      <Link href={`/admin/sponsors/${sponsor.id}`}>
                                        <Eye className="ml-1 h-3 w-3" />
                                        عرض
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditClick(sponsor)}
                                    >
                                      <Pencil className="ml-1 h-3 w-3" />
                                      تعديل
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenAddToEventDialog({
                                          id: sponsor.id,
                                          name: sponsor.name,
                                        })
                                      }
                                    >
                                      <CalendarPlus className="ml-1 h-3 w-3" />
                                      إضافة إلى حدث
                                    </Button>
                                    {sponsor.user ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-orange-500 hover:text-orange-600"
                                        onClick={() => handleOpenUnlinkDialog({
                                          id: sponsor.id,
                                          name: sponsor.name,
                                          userName: sponsor.user!.name,
                                        })}
                                      >
                                        <Unlink className="ml-1 h-3 w-3" />
                                        إلغاء الربط
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-500 hover:text-blue-600"
                                        onClick={() =>
                                          handleOpenLinkUserDialog({
                                            id: sponsor.id,
                                            name: sponsor.name,
                                            userId: sponsor.userId,
                                          })
                                        }
                                      >
                                        <UserPlus className="ml-1 h-3 w-3" />
                                        ربط بمستخدم
                                      </Button>
                                    )}
                                    {sponsor.phone && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() => handleWhatsApp(sponsor.phone!)}
                                      >
                                        <MessageCircle className="ml-1 h-3 w-3" />
                                        واتساب
                                      </Button>
                                    )}
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

              {/* Load More Button */}
              {hasNextPage && (
                <div className="p-4 text-center border-t">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="me-2 h-4 w-4" />
                    )}
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Sponsor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة راعي جديد</DialogTitle>
            <DialogDescription>
              أضف راعي جديد لقائمة الرعاة
            </DialogDescription>
          </DialogHeader>

          <SponsorForm
            formData={formData}
            setFormData={setFormData}
            isPending={createSponsor.isPending}
            onSubmit={handleAddSponsor}
            onCancel={() => {
              resetForm();
              setIsAddDialogOpen(false);
            }}
            submitLabel="إضافة الراعي"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sponsor Dialog */}
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
            onCancel={() => {
              resetForm();
              setEditingSponsor(null);
              setIsEditDialogOpen(false);
            }}
            submitLabel="حفظ التعديلات"
          />
        </DialogContent>
      </Dialog>

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
              اختر الحدث ونوع الرعاية لإضافة {selectedSponsorForEvent?.name} كراعي
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
            <DialogTitle>ربط راعي بمستخدم</DialogTitle>
            <DialogDescription>
              ابحث عن مستخدم لربطه بـ {selectedSponsorForUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>البحث عن مستخدم *</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>

              {/* Search Results */}
              {userSearchQuery.length >= 2 && (
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {isSearchingUsers ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      جاري البحث...
                    </div>
                  ) : searchedUsers && searchedUsers.length > 0 ? (
                    searchedUsers.map((user) => (
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
                            <UserCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {user.role === "ADMIN" || user.role === "SUPER_ADMIN"
                                ? "مشرف"
                                : user.role === "GUEST"
                                ? "زائر"
                                : "عضو"}
                            </Badge>
                            {user.sponsorCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.sponsorCount} راعي مرتبط
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              )}

              {selectedUserId && searchedUsers && (
                <p className="text-sm text-primary">
                  تم اختيار: {searchedUsers.find((u) => u.id === selectedUserId)?.name}
                </p>
              )}
            </div>
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
                "ربط"
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
              هل أنت متأكد من إلغاء ربط الراعي &quot;{sponsorToUnlink?.name}&quot; بالمستخدم &quot;{sponsorToUnlink?.userName}&quot;؟
              <br />
              <span className="text-muted-foreground">
                يمكنك إعادة ربط الراعي بمستخدم آخر لاحقاً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSponsorToUnlink(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnlink}
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

// Logo preview component with presigned URL support
function LogoPreview({ logoUrl, onRemove, disabled }: {
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

// Separate form component for reuse
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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WebP, SVG");
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("حجم الملف يتجاوز الحد المسموح (2 ميجابايت)");
      return;
    }

    setIsUploading(true);

    try {
      // Generate a temporary ID for new sponsors, use timestamp
      const tempId = `temp-${Date.now()}`;

      // Get presigned URL
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        imageType: "sponsorLogo",
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        entityId: tempId,
      });

      // Upload directly to S3
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

      // Update form with the public URL
      setFormData({ ...formData, logoUrl: publicUrl });
      toast.success("تم رفع الشعار بنجاح");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("حدث خطأ أثناء رفع الشعار");
    } finally {
      setIsUploading(false);
      // Reset file input
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
            {/* Logo Preview */}
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

            {/* Upload Button */}
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

        <div className="space-y-2">
          <Label htmlFor="sponsorStatus">الحالة</Label>
          <Select
            value={formData.status}
            onValueChange={(value: "new" | "contacted" | "sponsored" | "interested_again" | "interested_permanent") =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger id="sponsorStatus">
              <SelectValue placeholder="اختر الحالة" />
            </SelectTrigger>
            <SelectContent>
              {SPONSOR_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <Badge
                    variant="outline"
                    className={cn("font-normal", getSponsorStatusColor(status.value))}
                  >
                    {status.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Show "Other" text area when "other" is selected */}
        {formData.sponsorshipTypes.includes("other") && (
          <div className="space-y-2">
            <Label htmlFor="sponsorOtherText">حدد نوع الرعاية الأخرى *</Label>
            <Textarea
              id="sponsorOtherText"
              placeholder="اكتب تفاصيل نوع الرعاية..."
              value={formData.sponsorshipOtherText}
              onChange={(e) =>
                setFormData({ ...formData, sponsorshipOtherText: e.target.value })
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
