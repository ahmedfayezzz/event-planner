"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserLabelManager } from "@/components/admin/user-label-manager";
import { UserNotes } from "@/components/admin/user-notes";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";
import { formatArabicDate, getWhatsAppUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PERMISSION_LABELS, type PermissionKey } from "@/lib/permissions";
import {
  Search,
  Users,
  MoreVertical,
  Shield,
  UserX,
  UserCheck,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  X,
  Plus,
  Eye,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  StickyNote,
  MessageCircle,
  Pencil,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  isManuallyCreated?: boolean;
  createdAt: Date;
  companyName?: string | null;
  position?: string | null;
  registrationCount: number;
  attendanceCount: number;
  labels: Array<{ id: string; name: string; color: string }>;
  noteCount: number;
}

const PAGE_SIZE = 20;

// All available permissions
const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard",
  "sessions",
  "users",
  "hosts",
  "analytics",
  "checkin",
  "settings",
];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const currentUserId = session?.user?.id;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelSearchValue, setLabelSearchValue] = useState("");
  const { isExpanded, toggleRow } = useExpandableRows();
  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "deactivate";
    userId: string;
    userName: string;
  } | null>(null);

  // Promotion dialog state
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionUser, setPromotionUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [promotionPermissions, setPromotionPermissions] =
    useState<PermissionKey[]>(ALL_PERMISSIONS);

  // Edit user dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    position: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch user stats
  const { data: userStats } = api.admin.getUserStats.useQuery();

  // Fetch all labels for filtering
  const { data: allLabels, refetch: refetchLabels } = api.label.getAll.useQuery();

  // Filter labels for dialog
  const filteredLabelsForDialog = allLabels?.filter((label) =>
    label.name.toLowerCase().includes(labelSearchValue.toLowerCase())
  ) ?? [];

  // Check if search value exactly matches an existing label
  const labelExactMatch = allLabels?.some(
    (label) => label.name.toLowerCase() === labelSearchValue.toLowerCase().trim()
  );

  // Create label mutation
  const createLabelMutation = api.label.create.useMutation({
    onSuccess: async (newLabel) => {
      await refetchLabels();
      handleToggleLabelFilter(newLabel.id);
      setLabelSearchValue("");
      toast.success("تم إنشاء التصنيف بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.admin.getUsers.useInfiniteQuery(
    {
      search: debouncedSearch || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined, // Filter by role (USER, GUEST, or all)
      isActive: statusFilter !== "all" ? statusFilter === "active" : undefined,
      labelIds: labelFilter.length > 0 ? labelFilter : undefined,
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const allUsers = data?.pages.flatMap((page) => page.users) ?? [];

  const toggleActiveMutation = api.admin.toggleUserActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateRoleMutation = api.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("تم ترقية المستخدم لمدير");
      refetch();
      setPromotionDialogOpen(false);
      setPromotionUser(null);
      setPromotionPermissions(ALL_PERMISSIONS);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateManualUserMutation = api.admin.updateManualUser.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم");
      refetch();
      setEditDialogOpen(false);
      setEditUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const { refetch: fetchCsv } = api.admin.exportUsers.useQuery(
    { includeInactive: statusFilter !== "active" },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success(`تم تصدير ${result.data.count} مستخدم`);
    }
  };

  const handleToggleLabelFilter = (labelId: string) => {
    setLabelFilter((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const clearLabelFilter = () => {
    setLabelFilter([]);
  };

  // Handle confirmed action
  const handleConfirmedAction = () => {
    if (!confirmAction) return;
    toggleActiveMutation.mutate({ userId: confirmAction.userId });
    setConfirmAction(null);
  };

  // Open promotion dialog
  const openPromotionDialog = (userId: string, userName: string) => {
    setPromotionUser({ id: userId, name: userName });
    setPromotionPermissions(ALL_PERMISSIONS);
    setPromotionDialogOpen(true);
  };

  // Toggle promotion permission
  const handlePromotionPermissionToggle = (permission: PermissionKey) => {
    setPromotionPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  // Handle promotion submit
  const handlePromotionSubmit = () => {
    if (!promotionUser) return;
    updateRoleMutation.mutate({
      userId: promotionUser.id,
      role: "ADMIN",
      permissions: promotionPermissions,
    });
  };

  // Open edit dialog
  const openEditDialog = (user: UserItem) => {
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName || "",
      position: user.position || "",
    });
    setEditDialogOpen(true);
  };

  // Handle edit submit
  const handleEditSubmit = () => {
    if (!editUser) return;
    updateManualUserMutation.mutate({
      userId: editUser.id,
      name: editUser.name,
      email: editUser.email || undefined,
      phone: editUser.phone,
      companyName: editUser.companyName || undefined,
      position: editUser.position || undefined,
    });
  };

  // Show skeleton only on initial load
  const showTableSkeleton = isLoading && allUsers.length === 0;
  // Show inline loading indicator when filtering/searching
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأعضاء</h1>
          <p className="text-muted-foreground">إدارة حسابات الأعضاء المسجلين</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="me-2 h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {userStats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإجمالي</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أعضاء</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{userStats.totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">زوار</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{userStats.totalGuests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نشط</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{userStats.activeMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معطل</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{userStats.inactiveMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">يدوي</CardTitle>
              <Plus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{userStats.manuallyCreated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="نوع العضو" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="USER">أعضاء</SelectItem>
                <SelectItem value="GUEST">زوار</SelectItem>
                <SelectItem value="ADMIN">مدراء</SelectItem>
                <SelectItem value="SUPER_ADMIN">مدراء عامين</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
            {/* Label Filter - Dialog */}
            <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full sm:w-48 justify-between", labelFilter.length > 0 && "border-primary")}
                >
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {labelFilter.length > 0
                      ? `${labelFilter.length} تصنيف`
                      : "التصنيفات"}
                  </span>
                  {labelFilter.length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearLabelFilter();
                      }}
                      className="hover:bg-muted rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : (
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>تصفية حسب التصنيف</DialogTitle>
                  <DialogDescription>
                    اختر تصنيف واحد أو أكثر للتصفية
                  </DialogDescription>
                </DialogHeader>
                <div className="border rounded-lg">
                  <div className="flex items-center border-b px-3">
                    <input
                      placeholder="بحث عن تصنيف..."
                      value={labelSearchValue}
                      onChange={(e) => setLabelSearchValue(e.target.value)}
                      className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-1">
                    {filteredLabelsForDialog.length === 0 && !labelSearchValue.trim() && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        لا توجد تصنيفات
                      </div>
                    )}
                    {filteredLabelsForDialog.map((label) => {
                      const isSelected = labelFilter.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabelFilter(label.id)}
                          className="w-full flex items-center gap-2 px-2 py-2.5 rounded hover:bg-accent text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-right">{label.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {label._count.users}
                          </Badge>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                    {/* Show create option when searching and no exact match */}
                    {labelSearchValue.trim() && !labelExactMatch && (
                      <button
                        onClick={() => {
                          createLabelMutation.mutate({
                            name: labelSearchValue.trim(),
                            color: "#001421",
                          });
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2.5 rounded hover:bg-accent text-sm text-primary border-t mt-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>إنشاء &quot;{labelSearchValue.trim()}&quot;</span>
                      </button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {showTableSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : allUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد أعضاء</p>
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
                    <TableHead>العضو</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="hidden md:table-cell">الشركة</TableHead>
                    <TableHead className="hidden lg:table-cell">التصنيفات</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">التسجيلات</TableHead>
                    <TableHead className="hidden md:table-cell">الحضور</TableHead>
                    <TableHead className="hidden lg:table-cell">تاريخ الانضمام</TableHead>
                    <TableHead className="hidden md:table-cell"></TableHead>
                    {/* Mobile expand button */}
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user: UserItem) => {
                    const expanded = isExpanded(user.id);
                    return (
                      <React.Fragment key={user.id}>
                        <TableRow
                          className={cn(
                            !user.isActive && user.role !== "GUEST" && "opacity-60",
                            expanded && "md:border-b border-b-0"
                          )}
                        >
                            <TableCell>
                              <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <UserAvatar
                                  avatarUrl={user.avatarUrl}
                                  name={user.name}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium hover:underline">{user.name}</p>
                                  {/* Show email/phone on desktop only */}
                                  <p className="text-sm text-muted-foreground hidden md:block">
                                    {user.email}
                                  </p>
                                  <p
                                    className="text-xs text-muted-foreground hidden md:block"
                                    dir="ltr"
                                  >
                                    {user.phone}
                                  </p>
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={
                                    user.role === "USER"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                      : user.role === "GUEST"
                                      ? "bg-orange-500/10 text-orange-600 border-orange-200"
                                      : user.role === "ADMIN"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                      : "bg-red-500/10 text-red-600 border-red-200"
                                  }
                                >
                                  {user.role === "USER" ? "عضو" : user.role === "GUEST" ? "زائر" : user.role === "ADMIN" ? "مدير" : "مدير عام"}
                                </Badge>
                                {user.isManuallyCreated && (
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                                    يدوي
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div>
                                <p>{user.companyName || "-"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.position || ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <UserLabelManager
                                userId={user.id}
                                userLabels={user.labels}
                                onUpdate={refetch}
                                trigger={
                                  <button className="flex flex-wrap gap-1 items-center hover:bg-muted/50 p-1.5 rounded transition-colors">
                                    {user.labels.length === 0 ? (
                                      <Badge variant="outline" className="gap-1">
                                        <Tag className="h-3 w-3" />
                                        إضافة
                                      </Badge>
                                    ) : (
                                      user.labels.map((label) => (
                                        <Badge
                                          key={label.id}
                                          variant="outline"
                                          className="text-xs"
                                          style={{
                                            backgroundColor: label.color + "20",
                                            color: label.color,
                                            borderColor: label.color + "40",
                                          }}
                                        >
                                          {label.name}
                                        </Badge>
                                      ))
                                    )}
                                  </button>
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {user.role !== "GUEST" ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    user.isActive
                                      ? "bg-green-500/10 text-green-600 border-green-200"
                                      : "bg-red-500/10 text-red-600 border-red-200"
                                  }
                                >
                                  {user.isActive ? "نشط" : "معطل"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{user.registrationCount}</TableCell>
                            <TableCell className="hidden md:table-cell">{user.attendanceCount}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {formatArabicDate(new Date(user.createdAt))}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1">
                                {/* WhatsApp button */}
                                {user.phone && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => window.open(getWhatsAppUrl(user.phone, ""), "_blank")}
                                    title="إرسال رسالة واتساب"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Notes indicator */}
                                <UserNotes
                                  userId={user.id}
                                  noteCount={user.noteCount}
                                  onUpdate={() => refetch()}
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="relative"
                                      title="الملاحظات"
                                    >
                                      <StickyNote className="h-4 w-4" />
                                      {user.noteCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                          {user.noteCount}
                                        </span>
                                      )}
                                    </Button>
                                  }
                                />
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title="المزيد">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/users/${user.id}`}>
                                      <Eye className="me-2 h-4 w-4" />
                                      عرض الملف
                                    </Link>
                                  </DropdownMenuItem>
                                  {/* Edit option for manually created users only */}
                                  {user.isManuallyCreated && (
                                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                      <Pencil className="me-2 h-4 w-4" />
                                      تعديل البيانات
                                    </DropdownMenuItem>
                                  )}
                                  {/* Hide actions for current user */}
                                  {user.id !== currentUserId && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {/* Promote to admin - only for SUPER_ADMIN and non-admin users */}
                                      {isSuperAdmin && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openPromotionDialog(user.id, user.name)
                                            }
                                          >
                                            <Shield className="me-2 h-4 w-4" />
                                            ترقية لمدير
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      {/* Hide activate/deactivate for SUPER_ADMIN users */}
                                      {user.role !== "SUPER_ADMIN" && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setConfirmAction({
                                              type: user.isActive ? "deactivate" : "activate",
                                              userId: user.id,
                                              userName: user.name,
                                            })
                                          }
                                          className={
                                            user.isActive ? "text-red-600" : "text-green-600"
                                          }
                                        >
                                          {user.isActive ? (
                                            <>
                                              <UserX className="me-2 h-4 w-4" />
                                              تعطيل الحساب
                                            </>
                                          ) : (
                                            <>
                                              <UserCheck className="me-2 h-4 w-4" />
                                              تفعيل الحساب
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </TableCell>
                            {/* Mobile expand button */}
                            <TableCell className="md:hidden">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRow(user.id)}
                              >
                                {expanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {/* Mobile expanded content */}
                          <tr className="md:hidden">
                            <td colSpan={4} className="p-0">
                              <div
                                className={cn(
                                  "grid transition-all duration-300 ease-in-out",
                                  expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                )}
                              >
                                <div className="overflow-hidden">
                                  <div className="p-4 bg-muted/30 border-b">
                                {/* Avatar in mobile view */}
                                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                                  <UserAvatar
                                    avatarUrl={user.avatarUrl}
                                    name={user.name}
                                    size="lg"
                                  />
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span dir="ltr">{user.phone}</span>
                                  </div>
                                  {user.companyName && (
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span>{user.companyName}</span>
                                    </div>
                                  )}
                                  {user.position && (
                                    <div className="flex items-center gap-2">
                                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span>{user.position}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{formatArabicDate(new Date(user.createdAt))}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground">التسجيلات: {user.registrationCount}</span>
                                    <span className="text-muted-foreground">الحضور: {user.attendanceCount}</span>
                                  </div>
                                  <div className="flex items-center gap-2 col-span-2">
                                    <span className="text-muted-foreground">النوع:</span>
                                    <div className="flex items-center gap-1">
                                      <Badge
                                        variant="outline"
                                        className={
                                          user.role === "USER"
                                            ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                            : user.role === "GUEST"
                                            ? "bg-orange-500/10 text-orange-600 border-orange-200"
                                            : user.role === "ADMIN"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                            : "bg-red-500/10 text-red-600 border-red-200"
                                        }
                                      >
                                        {user.role === "USER" ? "عضو" : user.role === "GUEST" ? "زائر" : user.role === "ADMIN" ? "مدير" : "مدير عام"}
                                      </Badge>
                                      {user.isManuallyCreated && (
                                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                                          يدوي
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Labels */}
                                <div className="mt-3 pt-3 border-t">
                                  <UserLabelManager
                                    userId={user.id}
                                    userLabels={user.labels}
                                    onUpdate={refetch}
                                    trigger={
                                      <button className="flex flex-wrap gap-1 items-center hover:bg-muted/50 p-1.5 rounded transition-colors">
                                        <Tag className="h-4 w-4 text-muted-foreground me-1" />
                                        {user.labels.length === 0 ? (
                                          <span className="text-sm text-muted-foreground">إضافة تصنيف</span>
                                        ) : (
                                          user.labels.map((label) => (
                                            <Badge
                                              key={label.id}
                                              variant="outline"
                                              className="text-xs"
                                              style={{
                                                backgroundColor: label.color + "20",
                                                color: label.color,
                                                borderColor: label.color + "40",
                                              }}
                                            >
                                              {label.name}
                                            </Badge>
                                          ))
                                        )}
                                      </button>
                                    }
                                  />
                                </div>
                                {/* Actions */}
                                <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/users/${user.id}`}>
                                      <Eye className="me-2 h-4 w-4" />
                                      عرض الملف
                                    </Link>
                                  </Button>
                                  {/* Edit for manually created users */}
                                  {user.isManuallyCreated && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditDialog(user)}
                                    >
                                      <Pencil className="me-2 h-4 w-4" />
                                      تعديل
                                    </Button>
                                  )}
                                  {/* WhatsApp */}
                                  {user.phone && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => window.open(getWhatsAppUrl(user.phone, ""), "_blank")}
                                    >
                                      <MessageCircle className="me-2 h-4 w-4" />
                                      واتساب
                                    </Button>
                                  )}
                                  {/* Notes */}
                                  <UserNotes
                                    userId={user.id}
                                    noteCount={user.noteCount}
                                    onUpdate={() => refetch()}
                                    trigger={
                                      <Button variant="outline" size="sm" className="relative">
                                        <StickyNote className="me-2 h-4 w-4" />
                                        ملاحظات
                                        {user.noteCount > 0 && (
                                          <span className="ms-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                                            {user.noteCount}
                                          </span>
                                        )}
                                      </Button>
                                    }
                                  />
                                  {user.id !== currentUserId && (
                                    <>
                                      {isSuperAdmin && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            openPromotionDialog(user.id, user.name)
                                          }
                                        >
                                          <Shield className="me-2 h-4 w-4" />
                                          ترقية لمدير
                                        </Button>
                                      )}
                                      {user.role !== "SUPER_ADMIN" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setConfirmAction({
                                              type: user.isActive ? "deactivate" : "activate",
                                              userId: user.id,
                                              userName: user.name,
                                            })
                                          }
                                          className={user.isActive ? "text-red-600" : "text-green-600"}
                                        >
                                          {user.isActive ? (
                                            <>
                                              <UserX className="me-2 h-4 w-4" />
                                              تعطيل
                                            </>
                                          ) : (
                                            <>
                                              <UserCheck className="me-2 h-4 w-4" />
                                              تفعيل
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "deactivate" && "تأكيد تعطيل الحساب"}
              {confirmAction?.type === "activate" && "تأكيد تفعيل الحساب"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "deactivate" &&
                `هل أنت متأكد من تعطيل حساب "${confirmAction.userName}"؟ لن يتمكن من تسجيل الدخول.`}
              {confirmAction?.type === "activate" &&
                `هل أنت متأكد من تفعيل حساب "${confirmAction?.userName}"؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "deactivate"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promotion Dialog */}
      <Dialog
        open={promotionDialogOpen}
        onOpenChange={(open) => {
          setPromotionDialogOpen(open);
          if (!open) {
            setPromotionUser(null);
            setPromotionPermissions(ALL_PERMISSIONS);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ترقية لمدير: {promotionUser?.name}</DialogTitle>
            <DialogDescription>
              اختر الصلاحيات التي تريد منحها لهذا المدير
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {promotionPermissions.length} من {ALL_PERMISSIONS.length} صلاحيات
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPromotionPermissions(ALL_PERMISSIONS)}
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPromotionPermissions([])}
                >
                  إلغاء الكل
                </Button>
              </div>
            </div>
            {ALL_PERMISSIONS.map((permission) => (
              <div
                key={permission}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <Label htmlFor={`promo-${permission}`} className="cursor-pointer flex-1">
                  {PERMISSION_LABELS[permission]}
                </Label>
                <Switch
                  id={`promo-${permission}`}
                  checked={promotionPermissions.includes(permission)}
                  onCheckedChange={() => handlePromotionPermissionToggle(permission)}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPromotionDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handlePromotionSubmit}
              disabled={updateRoleMutation.isPending || promotionPermissions.length === 0}
            >
              {updateRoleMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="me-2 h-4 w-4" />
              )}
              ترقية لمدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditUser(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              تعديل بيانات المستخدم المضاف يدوياً
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم *</Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                  }
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف *</Label>
                <Input
                  id="edit-phone"
                  value={editUser.phone}
                  onChange={(e) =>
                    setEditUser({ ...editUser, phone: e.target.value })
                  }
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                  }
                  placeholder="example@domain.com"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">الشركة</Label>
                <Input
                  id="edit-company"
                  value={editUser.companyName}
                  onChange={(e) =>
                    setEditUser({ ...editUser, companyName: e.target.value })
                  }
                  placeholder="اسم الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">المنصب</Label>
                <Input
                  id="edit-position"
                  value={editUser.position}
                  onChange={(e) =>
                    setEditUser({ ...editUser, position: e.target.value })
                  }
                  placeholder="المسمى الوظيفي"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                updateManualUserMutation.isPending ||
                !editUser?.name ||
                !editUser?.phone
              }
            >
              {updateManualUserMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="me-2 h-4 w-4" />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
