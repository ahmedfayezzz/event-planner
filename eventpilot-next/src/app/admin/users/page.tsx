"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserLabelManager } from "@/components/admin/user-label-manager";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
  Tag,
  Check,
  X,
  Plus,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  companyName?: string | null;
  position?: string | null;
  registrationCount: number;
  attendanceCount: number;
  labels: Array<{ id: string; name: string; color: string }>;
}

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelSearchValue, setLabelSearchValue] = useState("");

  const debouncedSearch = useDebounce(search, 300);

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
      role: "USER", // Only fetch regular users
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
                            color: "#3b82f6",
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
                    <TableHead>الشركة</TableHead>
                    <TableHead>التصنيفات</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التسجيلات</TableHead>
                    <TableHead>الحضور</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user: UserItem) => (
                    <TableRow
                      key={user.id}
                      className={!user.isActive ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          <p
                            className="text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {user.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{user.companyName || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.position || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>{user.registrationCount}</TableCell>
                      <TableCell>{user.attendanceCount}</TableCell>
                      <TableCell>
                        {formatArabicDate(new Date(user.createdAt))}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Promote to admin - only for SUPER_ADMIN */}
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: user.id,
                                      role: "ADMIN",
                                    })
                                  }
                                >
                                  <Shield className="me-2 h-4 w-4" />
                                  ترقية لمدير
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                toggleActiveMutation.mutate({ userId: user.id })
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
