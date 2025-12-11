"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  Search,
  UtensilsCrossed,
  Coffee,
  Cake,
  MoreHorizontal,
  Phone,
  Building2,
  User,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";

const HOSTING_TYPES = [
  { value: "dinner", label: "عشاء", icon: UtensilsCrossed },
  { value: "beverage", label: "مشروبات", icon: Coffee },
  { value: "dessert", label: "حلويات", icon: Cake },
  { value: "other", label: "أخرى", icon: MoreHorizontal },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CateringPage({ params }: PageProps) {
  const { id } = use(params);
  const { isExpanded, toggleRow } = useExpandableRows();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [selectedHostingType, setSelectedHostingType] = useState("");
  const [isSelfCatering, setIsSelfCatering] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data, isLoading, error } = api.catering.getSessionCatering.useQuery({
    sessionId: id,
  });

  const { data: potentialHosts } = api.catering.getPotentialHosts.useQuery({
    search: searchQuery,
    hostingType: selectedHostingType || undefined,
    limit: 20,
  });

  const addCatering = api.catering.addCatering.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الضيافة بنجاح");
      utils.catering.getSessionCatering.invalidate({ sessionId: id });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة الضيافة");
    },
  });

  const updateCatering = api.catering.updateCatering.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الضيافة بنجاح");
      utils.catering.getSessionCatering.invalidate({ sessionId: id });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الضيافة");
    },
  });

  const deleteCatering = api.catering.deleteCatering.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الضيافة بنجاح");
      utils.catering.getSessionCatering.invalidate({ sessionId: id });
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الضيافة");
    },
  });

  const resetForm = () => {
    setSelectedHostId(null);
    setSelectedHostingType("");
    setIsSelfCatering(false);
    setNotes("");
    setEditingId(null);
    setSearchQuery("");
  };

  const handleAdd = () => {
    if (!selectedHostingType) {
      toast.error("يرجى اختيار نوع الضيافة");
      return;
    }

    if (!isSelfCatering && !selectedHostId) {
      toast.error("يرجى اختيار راعي أو تحديد الضيافة ذاتية");
      return;
    }

    addCatering.mutate({
      sessionId: id,
      hostId: isSelfCatering ? undefined : selectedHostId || undefined,
      hostingType: selectedHostingType,
      isSelfCatering,
      notes: notes || undefined,
    });
  };

  const handleEdit = () => {
    if (!editingId || !selectedHostingType) {
      toast.error("يرجى اختيار نوع الضيافة");
      return;
    }

    updateCatering.mutate({
      id: editingId,
      hostId: isSelfCatering ? null : selectedHostId,
      hostingType: selectedHostingType,
      isSelfCatering,
      notes: notes || null,
    });
  };

  const openEditDialog = (catering: {
    id: string;
    hostId: string | null;
    hostingType: string;
    isSelfCatering: boolean;
    notes: string | null;
  }) => {
    setEditingId(catering.id);
    setSelectedHostId(catering.hostId);
    setSelectedHostingType(catering.hostingType);
    setIsSelfCatering(catering.isSelfCatering);
    setNotes(catering.notes || "");
    setIsEditDialogOpen(true);
  };

  const getHostingTypeLabel = (value: string) => {
    return HOSTING_TYPES.find((t) => t.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  const { session, caterings } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الضيافة</h1>
          <p className="text-muted-foreground">
            {session.title} - {formatArabicDate(new Date(session.date))}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة ضيافة
        </Button>
      </div>

      {/* Catering List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الضيافة</CardTitle>
          <CardDescription>{caterings.length} عنصر ضيافة مسجل</CardDescription>
        </CardHeader>
        <CardContent>
          {caterings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد عناصر ضيافة مسجلة لهذا الحدث</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة ضيافة
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نوع الضيافة</TableHead>
                  <TableHead>الراعي</TableHead>
                  <TableHead className="hidden md:table-cell">الهاتف</TableHead>
                  <TableHead className="hidden lg:table-cell">الشركة</TableHead>
                  <TableHead className="hidden lg:table-cell">ملاحظات</TableHead>
                  <TableHead className="hidden md:table-cell text-left">إجراءات</TableHead>
                  <TableHead className="md:hidden w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caterings.map((catering) => {
                  const expanded = isExpanded(catering.id);
                  return (
                    <React.Fragment key={catering.id}>
                      <TableRow>
                        <TableCell>
                          <Badge variant="secondary">
                            {getHostingTypeLabel(catering.hostingType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {catering.isSelfCatering ? (
                            <span className="text-muted-foreground">
                              ضيافة ذاتية
                            </span>
                          ) : catering.host ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {catering.host.name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">غير محدد</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {catering.host?.phone ? (
                            <a
                              href={`tel:${catering.host.phone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {catering.host.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {catering.host?.companyName ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {catering.host.companyName}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {catering.notes ? (
                            <span className="text-sm text-muted-foreground">
                              {catering.notes}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(catering)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(catering.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="md:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(catering.id)}
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
                                  {catering.host?.phone && (
                                    <div>
                                      <span className="text-muted-foreground">الهاتف:</span>
                                      <a
                                        href={`tel:${catering.host.phone}`}
                                        className="mr-1 text-primary hover:underline"
                                        dir="ltr"
                                      >
                                        {catering.host.phone}
                                      </a>
                                    </div>
                                  )}
                                  {catering.host?.companyName && (
                                    <div>
                                      <span className="text-muted-foreground">الشركة:</span>
                                      <span className="mr-1">{catering.host.companyName}</span>
                                    </div>
                                  )}
                                  {catering.notes && (
                                    <div>
                                      <span className="text-muted-foreground">ملاحظات:</span>
                                      <span className="mr-1">{catering.notes}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(catering)}
                                  >
                                    <Edit className="h-3 w-3 ml-1" />
                                    تعديل
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(catering.id)}
                                  >
                                    <Trash2 className="h-3 w-3 ml-1" />
                                    حذف
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

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة ضيافة</DialogTitle>
            <DialogDescription>
              أضف عنصر ضيافة جديد لهذا الحدث
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الضيافة *</Label>
              <Select
                value={selectedHostingType}
                onValueChange={setSelectedHostingType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الضيافة" />
                </SelectTrigger>
                <SelectContent>
                  {HOSTING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="selfCatering"
                checked={isSelfCatering}
                onCheckedChange={(checked) =>
                  setIsSelfCatering(checked === true)
                }
              />
              <Label htmlFor="selfCatering" className="cursor-pointer">
                ضيافة ذاتية (بدون راعي خارجي)
              </Label>
            </div>

            {!isSelfCatering && (
              <div className="space-y-2">
                <Label>اختيار الراعي</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن راعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>

                {potentialHosts && potentialHosts.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {potentialHosts.map((host) => (
                      <div
                        key={host.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedHostId === host.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedHostId(host.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{host.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {host.companyName || host.email}
                            </p>
                          </div>
                          {host.isGuest && (
                            <Badge variant="outline" className="text-xs">
                              زائر
                            </Badge>
                          )}
                        </div>
                        {host.hostingTypes && host.hostingTypes.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {host.hostingTypes.map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="text-xs"
                              >
                                {getHostingTypeLabel(t)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedHostId && potentialHosts && (
                  <p className="text-sm text-primary">
                    تم اختيار:{" "}
                    {potentialHosts.find((h) => h.id === selectedHostId)?.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
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
            <Button onClick={handleAdd} disabled={addCatering.isPending}>
              {addCatering.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل الضيافة</DialogTitle>
            <DialogDescription>تعديل عنصر الضيافة</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الضيافة *</Label>
              <Select
                value={selectedHostingType}
                onValueChange={setSelectedHostingType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الضيافة" />
                </SelectTrigger>
                <SelectContent>
                  {HOSTING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="selfCateringEdit"
                checked={isSelfCatering}
                onCheckedChange={(checked) =>
                  setIsSelfCatering(checked === true)
                }
              />
              <Label htmlFor="selfCateringEdit" className="cursor-pointer">
                ضيافة ذاتية (بدون راعي خارجي)
              </Label>
            </div>

            {!isSelfCatering && (
              <div className="space-y-2">
                <Label>اختيار الراعي</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن راعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>

                {potentialHosts && potentialHosts.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {potentialHosts.map((host) => (
                      <div
                        key={host.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedHostId === host.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedHostId(host.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{host.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {host.companyName || host.email}
                            </p>
                          </div>
                          {host.isGuest && (
                            <Badge variant="outline" className="text-xs">
                              زائر
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedHostId && potentialHosts && (
                  <p className="text-sm text-primary">
                    تم اختيار:{" "}
                    {potentialHosts.find((h) => h.id === selectedHostId)?.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditDialogOpen(false);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleEdit} disabled={updateCatering.isPending}>
              {updateCatering.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف عنصر الضيافة هذا نهائياً
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteId && deleteCatering.mutate({ id: deleteId })
              }
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
