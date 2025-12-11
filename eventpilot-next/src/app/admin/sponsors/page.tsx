"use client";

import React, { useState } from "react";
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
import { formatArabicDate, getWhatsAppUrl } from "@/lib/utils";
import { HOSTING_TYPES, getHostingTypeLabel } from "@/lib/constants";
import {
  UtensilsCrossed,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  UserCheck,
  Plus,
  MessageCircle,
} from "lucide-react";

interface HostItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  hostingTypes: string[];
  createdAt: Date;
  isGuest: boolean;
}

export default function AdminSponsorsPage() {
  const [hostingTypeFilter, setHostingTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { isExpanded, toggleRow } = useExpandableRows();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    hostingTypes: [] as string[],
  });

  const utils = api.useUtils();

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.admin.getHosts.useInfiniteQuery(
    {
      hostingType: hostingTypeFilter !== "all" ? hostingTypeFilter : undefined,
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const createHost = api.admin.createHost.useMutation({
    onSuccess: (data) => {
      if (data.isNew) {
        toast.success("تم إضافة الراعي بنجاح");
      } else {
        toast.success("تم تحديث بيانات الراعي الموجود");
      }
      utils.admin.getHosts.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الراعي");
    },
  });

  const allHosts: HostItem[] =
    data?.pages.flatMap((page) => [...page.users, ...page.guestHosts]) ?? [];

  const { refetch: fetchCsv } = api.admin.exportHosts.useQuery(undefined, {
    enabled: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      companyName: "",
      hostingTypes: [],
    });
  };

  const handleAddHost = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }
    if (formData.hostingTypes.length === 0) {
      toast.error("يجب اختيار نوع ضيافة واحد على الأقل");
      return;
    }

    createHost.mutate({
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone,
      companyName: formData.companyName || undefined,
      hostingTypes: formData.hostingTypes,
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

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `مرحباً ${name}،\n\nنشكرك على تطوعك لتقديم الضيافة في ثلوثية الأعمال.\n\nنود التواصل معك لتنسيق تفاصيل الضيافة.`;
    const url = getWhatsAppUrl(phone, message);
    window.open(url, "_blank");
  };

  // Show skeleton only on initial load
  const showTableSkeleton = isLoading && allHosts.length === 0;
  // Show inline loading indicator when filtering
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الرعاة</h1>
          <p className="text-muted-foreground">
            قائمة المتطوعين لتقديم الضيافة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
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
              <Select
                value={hostingTypeFilter}
                onValueChange={setHostingTypeFilter}
              >
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue placeholder="نوع الضيافة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {HOSTING_TYPES.map((type) => (
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

      {/* Hosts Table */}
      <Card>
        <CardContent className="p-0">
          {showTableSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : allHosts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد رعاة</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
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
                    <TableHead className="hidden lg:table-cell">الشركة</TableHead>
                    <TableHead>أنواع الضيافة</TableHead>
                    <TableHead className="hidden md:table-cell">النوع</TableHead>
                    <TableHead className="hidden lg:table-cell">تاريخ التسجيل</TableHead>
                    <TableHead className="hidden md:table-cell text-left">إجراءات</TableHead>
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allHosts.map((host) => {
                    const expanded = isExpanded(host.id);
                    return (
                      <React.Fragment key={host.id}>
                        <TableRow>
                          <TableCell>
                            <p className="font-medium">{host.name || "-"}</p>
                          </TableCell>
                          <TableCell dir="ltr" className="hidden md:table-cell">
                            <div>
                              {host.email && !host.email.includes("@placeholder.local") ? (
                                <a
                                  href={`mailto:${host.email}`}
                                  className="text-sm hover:underline underline"
                                >
                                  {host.email}
                                </a>
                              ) : (
                                <p className="text-sm">-</p>
                              )}
                              {host.phone ? (
                                <a
                                  href={`tel:${host.phone}`}
                                  className="text-xs text-muted-foreground hover:underline underline block"
                                >
                                  {host.phone}
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">-</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{host.companyName || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {host.hostingTypes.map((type) => (
                                <Badge
                                  key={type}
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/20"
                                >
                                  {getHostingTypeLabel(type)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={host.isGuest ? "secondary" : "default"}
                              className="gap-1"
                            >
                              {host.isGuest ? (
                                <>
                                  <User className="h-3 w-3" />
                                  زائر
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  عضو
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatArabicDate(new Date(host.createdAt))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {host.phone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  handleWhatsApp(host.phone!, host.name || "")
                                }
                                title="إرسال رسالة واتساب"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="md:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(host.id)}
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
                                    <div dir="ltr">
                                      <span className="text-muted-foreground">البريد:</span>
                                      <span className="mr-1">
                                        {host.email && !host.email.includes("@placeholder.local")
                                          ? host.email
                                          : "-"}
                                      </span>
                                    </div>
                                    <div dir="ltr">
                                      <span className="text-muted-foreground">الهاتف:</span>
                                      <span className="mr-1">{host.phone || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">الشركة:</span>
                                      <span className="mr-1">{host.companyName || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">النوع:</span>
                                      <span className="mr-1">
                                        <Badge
                                          variant={host.isGuest ? "secondary" : "default"}
                                          className="gap-1"
                                        >
                                          {host.isGuest ? "زائر" : "عضو"}
                                        </Badge>
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">تاريخ التسجيل:</span>
                                      <span className="mr-1">{formatArabicDate(new Date(host.createdAt))}</span>
                                    </div>
                                  </div>
                                  {host.phone && (
                                    <div className="pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() =>
                                          handleWhatsApp(host.phone!, host.name || "")
                                        }
                                      >
                                        <MessageCircle className="ml-1 h-3 w-3" />
                                        واتساب
                                      </Button>
                                    </div>
                                  )}
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

      {/* Add Host Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة راعي جديد</DialogTitle>
            <DialogDescription>
              أضف راعي جديد يدوياً لقائمة المتطوعين للضيافة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hostName">الاسم *</Label>
                <Input
                  id="hostName"
                  placeholder="اسم الراعي"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostPhone">رقم الهاتف *</Label>
                <Input
                  id="hostPhone"
                  placeholder="05XXXXXXXX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hostEmail">البريد الإلكتروني (اختياري)</Label>
                <Input
                  id="hostEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostCompany">الشركة (اختياري)</Label>
                <Input
                  id="hostCompany"
                  placeholder="اسم الشركة"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>أنواع الضيافة *</Label>
              <div className="grid gap-2 grid-cols-2">
                {HOSTING_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`add-hosting-${type.value}`}
                      checked={formData.hostingTypes.includes(type.value)}
                      onCheckedChange={(checked) => {
                        const types = checked
                          ? [...formData.hostingTypes, type.value]
                          : formData.hostingTypes.filter(
                              (t) => t !== type.value
                            );
                        setFormData({ ...formData, hostingTypes: types });
                      }}
                    />
                    <Label
                      htmlFor={`add-hosting-${type.value}`}
                      className="cursor-pointer text-sm"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleAddHost} disabled={createHost.isPending}>
              {createHost.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جارٍ الإضافة...
                </>
              ) : (
                "إضافة الراعي"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
