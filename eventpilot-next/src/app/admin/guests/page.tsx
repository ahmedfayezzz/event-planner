"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { GUEST_TITLES } from "@/lib/constants";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Plus,
  Pencil,
  Eye,
  Search,
  MoreHorizontal,
  Users,
  Globe,
  EyeOff,
  LayoutGrid,
  TableIcon,
  Building2,
  Briefcase,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresignedUrl } from "@/hooks/use-presigned-url";

interface GuestFormData {
  name: string;
  title: string;
  jobTitle: string;
  company: string;
  description: string;
  isPublic: boolean;
}

const initialFormData: GuestFormData = {
  name: "",
  title: "",
  jobTitle: "",
  company: "",
  description: "",
  isPublic: false,
};

// Component to display guest image with presigned URL
function GuestImage({
  imageUrl,
  name,
  size = "md",
}: {
  imageUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const { url, isLoading } = usePresignedUrl(imageUrl);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-full" />
      ) : (
        <>
          <AvatarImage src={url || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </>
      )}
    </Avatar>
  );
}

export default function AdminGuestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [publicFilter, setPublicFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<GuestFormData>(initialFormData);
  const { isExpanded, toggleRow } = useExpandableRows();

  const utils = api.useUtils();

  // Queries
  const { data: insights, isLoading: insightsLoading } =
    api.guest.getInsights.useQuery();

  const {
    data: guestsData,
    isLoading: guestsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.guest.getAll.useInfiniteQuery(
    {
      search: debouncedSearch || undefined,
      isPublic:
        publicFilter === "all"
          ? undefined
          : publicFilter === "public"
            ? true
            : false,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const guests = guestsData?.pages.flatMap((page) => page.guests) ?? [];

  // Mutations
  const createMutation = api.guest.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الضيف بنجاح");
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
      utils.guest.getAll.invalidate();
      utils.guest.getInsights.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إضافة الضيف");
    },
  });

  const handleCreateGuest = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      title: formData.title || null,
      jobTitle: formData.jobTitle || null,
      company: formData.company || null,
      description: formData.description || null,
      isPublic: formData.isPublic,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الضيوف</h1>
          <p className="text-muted-foreground">
            إدارة ضيوف الأحداث والمتحدثين
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة ضيف
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الضيوف</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{insights?.total ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ملفات عامة</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {insights?.public ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ملفات خاصة</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-600">
                {insights?.private ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={publicFilter} onValueChange={setPublicFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="public">عام</SelectItem>
                  <SelectItem value="private">خاص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest List */}
      {guestsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد ضيوف</h3>
            <p className="text-muted-foreground text-center mb-4">
              لم يتم إضافة أي ضيوف بعد. ابدأ بإضافة ضيف جديد.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة ضيف
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        // Grid View - Vertical cards with image on top
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {guests.map((guest) => (
            <Link key={guest.id} href={`/admin/guests/${guest.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <GuestImage
                    imageUrl={guest.imageUrl}
                    name={guest.name}
                    size="lg"
                  />
                  <div className="mt-4 w-full">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {guest.title && (
                          <span className="text-muted-foreground">
                            {guest.title}{" "}
                          </span>
                        )}
                        {guest.name}
                      </h3>
                    </div>
                    <div className="flex justify-center mb-2">
                      {guest.isPublic ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-600 border-green-200"
                        >
                          عام
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-500/10 text-gray-600 border-gray-200"
                        >
                          خاص
                        </Badge>
                      )}
                    </div>
                    {(guest.jobTitle || guest.company) && (
                      <p className="text-sm text-muted-foreground truncate">
                        {guest.jobTitle}
                        {guest.jobTitle && guest.company && " - "}
                        {guest.company}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {guest._count.sessionGuests} حدث
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        // Table View
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>الضيف</TableHead>
                <TableHead className="hidden md:table-cell">
                  المنصب والشركة
                </TableHead>
                <TableHead className="hidden md:table-cell">الحالة</TableHead>
                <TableHead className="hidden md:table-cell">الأحداث</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => (
                <React.Fragment key={guest.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="md:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(guest.id)}
                      >
                        {isExpanded(guest.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/guests/${guest.id}`}
                        className="flex items-center gap-3"
                      >
                        <GuestImage
                          imageUrl={guest.imageUrl}
                          name={guest.name}
                          size="sm"
                        />
                        <div>
                          <span className="font-medium">
                            {guest.title && (
                              <span className="text-muted-foreground">
                                {guest.title}{" "}
                              </span>
                            )}
                            {guest.name}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {guest.jobTitle && (
                          <span className="text-sm">{guest.jobTitle}</span>
                        )}
                        {guest.jobTitle && guest.company && (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {guest.company && (
                          <span className="text-sm text-muted-foreground">
                            {guest.company}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
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
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {guest._count.sessionGuests} حدث
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/guests/${guest.id}`}>
                              <Eye className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/guests/${guest.id}/edit`}>
                              <Pencil className="ml-2 h-4 w-4" />
                              تعديل
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/guest/${guest.id}?preview=true`}
                              target="_blank"
                            >
                              <ExternalLink className="ml-2 h-4 w-4" />
                              معاينة الملف العام
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* Mobile expanded row */}
                  {isExpanded(guest.id) && (
                    <TableRow className="md:hidden bg-muted/30">
                      <TableCell colSpan={3}>
                        <div className="space-y-2 py-2">
                          {(guest.jobTitle || guest.company) && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {guest.jobTitle}
                                {guest.jobTitle && guest.company && " - "}
                                {guest.company}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
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
                            <span className="text-muted-foreground">
                              • {guest._count.sessionGuests} حدث
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/guests/${guest.id}`}>
                                <Eye className="ml-1 h-3 w-3" />
                                عرض
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/guests/${guest.id}/edit`}>
                                <Pencil className="ml-1 h-3 w-3" />
                                تعديل
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              "تحميل المزيد"
            )}
          </Button>
        </div>
      )}

      {/* Add Guest Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>إضافة ضيف جديد</DialogTitle>
            <DialogDescription>
              أدخل معلومات الضيف. يمكنك إضافة المزيد من التفاصيل لاحقاً.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">اللقب</Label>
              <Select
                value={formData.title || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, title: value === "none" ? "" : value })
                }
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
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                أو اكتب لقب مخصص في حقل الاسم
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="اسم الضيف"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="jobTitle">المنصب</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, jobTitle: e.target.value })
                  }
                  placeholder="مثال: مدير تنفيذي"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">الشركة</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder="اسم الشركة"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">نبذة</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="نبذة عن الضيف..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">ملف عام</Label>
                <p className="text-xs text-muted-foreground">
                  السماح للزوار برؤية ملف الضيف
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublic: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData(initialFormData);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateGuest}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
