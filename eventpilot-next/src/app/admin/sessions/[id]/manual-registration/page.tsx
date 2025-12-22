"use client";

import React, { use, useState, useRef } from "react";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Search,
  Loader2,
  Users,
  UserPlus,
  FileSpreadsheet,
  Tag,
  Check,
  X,
  ChevronDown,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  position: string | null;
  role: string;
  labels: Array<{ id: string; name: string; color: string }>;
  isRegistered: boolean;
}

interface GuestEntry {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  position: string;
}

interface CSVRow {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  position?: string;
  error?: string;
}

export default function ManualRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("users");

  // Users tab state
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN">("all");

  // Guests tab state
  const [guests, setGuests] = useState<GuestEntry[]>([
    { id: crypto.randomUUID(), name: "", phone: "", email: "", companyName: "", position: "" },
  ]);

  // CSV tab state
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Send QR email option
  const [sendQrEmail, setSendQrEmail] = useState(true);

  // Queries
  const { data: session, isLoading: loadingSession } = api.session.getAdminDetails.useQuery(
    { id: sessionId },
    { enabled: !!sessionId }
  );

  const { data: users, isLoading: loadingUsers } = api.manualRegistration.getUsersForManualRegistration.useQuery(
    {
      sessionId,
      search: userSearch || undefined,
      labelIds: labelFilter.length > 0 ? labelFilter : undefined,
      roleFilter: roleFilter !== "all" ? roleFilter : undefined,
      limit: 500, // Support bulk selection
    },
    { enabled: activeTab === "users" }
  );

  const { data: labels } = api.manualRegistration.getLabels.useQuery();

  // Mutation
  const registerMutation = api.manualRegistration.manualRegister.useMutation({
    onSuccess: (data) => {
      toast.success(
        `تم تسجيل ${data.registered} شخص بنجاح${data.skipped > 0 ? ` (تم تخطي ${data.skipped} مسجلين مسبقاً)` : ""}`
      );
      if (data.emailsQueued > 0) {
        toast.info(`جاري إرسال ${data.emailsQueued} بريد إلكتروني`);
      }
      // Reset state
      setSelectedUserIds([]);
      setGuests([{ id: crypto.randomUUID(), name: "", phone: "", email: "", companyName: "", position: "" }]);
      setCsvData([]);
      // Invalidate queries
      utils.manualRegistration.getUsersForManualRegistration.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    },
  });

  // Handlers
  const toggleUser = (userId: string, isRegistered: boolean) => {
    if (isRegistered) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (!users) return;
    const selectableIds = users.filter((u) => !u.isRegistered).map((u) => u.id);
    const allSelected = selectableIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableIds);
    }
  };

  const toggleLabelFilter = (labelId: string) => {
    setLabelFilter((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  // Guest handlers
  const addGuestRow = () => {
    setGuests((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", phone: "", email: "", companyName: "", position: "" },
    ]);
  };

  const removeGuestRow = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof GuestEntry, value: string) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  // CSV handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      setCsvErrors(["الملف فارغ أو لا يحتوي على بيانات"]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === "name" || h === "الاسم");
    const phoneIdx = headers.findIndex((h) => h === "phone" || h === "الهاتف" || h === "رقم الهاتف");
    const emailIdx = headers.findIndex((h) => h === "email" || h === "البريد" || h === "الإيميل");
    const companyIdx = headers.findIndex((h) => h === "company" || h === "الشركة");
    const positionIdx = headers.findIndex((h) => h === "position" || h === "المنصب" || h === "الوظيفة");

    if (nameIdx === -1 || phoneIdx === -1) {
      setCsvErrors(["يجب أن يحتوي الملف على أعمدة: name (الاسم), phone (الهاتف)"]);
      return;
    }

    const errors: string[] = [];
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const name = values[nameIdx] || "";
      const phone = values[phoneIdx] || "";
      const email = emailIdx >= 0 ? values[emailIdx] : undefined;
      const company = companyIdx >= 0 ? values[companyIdx] : undefined;
      const position = positionIdx >= 0 ? values[positionIdx] : undefined;

      if (!name) {
        errors.push(`سطر ${i + 1}: الاسم مطلوب`);
        continue;
      }
      if (!phone) {
        errors.push(`سطر ${i + 1}: رقم الهاتف مطلوب`);
        continue;
      }

      rows.push({ name, phone, email, company, position });
    }

    setCsvData(rows);
    setCsvErrors(errors);
  };

  const clearCSV = () => {
    setCsvData([]);
    setCsvErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit handler
  const handleSubmit = () => {
    // Collect valid guests
    const validGuests = guests.filter((g) => g.name.trim() && g.phone.trim());

    // Collect CSV data
    const csvGuests = csvData.map((row) => ({
      name: row.name,
      phone: row.phone,
      email: row.email || "",
      companyName: row.company || "",
      position: row.position || "",
    }));

    const totalUsers = selectedUserIds.length;
    const totalGuests = validGuests.length + csvGuests.length;

    if (totalUsers === 0 && totalGuests === 0) {
      toast.error("الرجاء اختيار أعضاء أو إضافة زوار");
      return;
    }

    registerMutation.mutate({
      sessionId,
      userIds: selectedUserIds,
      newGuests: [
        ...validGuests.map((g) => ({
          name: g.name,
          phone: g.phone,
          email: g.email || undefined,
          companyName: g.companyName || undefined,
          position: g.position || undefined,
        })),
        ...csvGuests,
      ],
      sendQrEmail,
    });
  };

  // Summary counts
  const selectedUsersCount = selectedUserIds.length;
  const validGuestsCount = guests.filter((g) => g.name.trim() && g.phone.trim()).length;
  const csvCount = csvData.length;
  const totalCount = selectedUsersCount + validGuestsCount + csvCount;

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/sessions/${sessionId}`}>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">تسجيل يدوي للحضور</h1>
          <p className="text-muted-foreground">{session?.title}</p>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>إضافة حضور</CardTitle>
          <CardDescription>
            اختر أعضاء من النظام أو أضف زوار جدد للتسجيل في الحدث
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="users" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">اختيار أعضاء</span>
                <span className="sm:hidden">أعضاء</span>
                {selectedUsersCount > 0 && (
                  <Badge variant="secondary" className="mr-1 text-xs">
                    {selectedUsersCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="guests" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <UserPlus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">إضافة زوار</span>
                <span className="sm:hidden">زوار</span>
                {validGuestsCount > 0 && (
                  <Badge variant="secondary" className="mr-1 text-xs">
                    {validGuestsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">استيراد CSV</span>
                <span className="sm:hidden">CSV</span>
                {csvCount > 0 && (
                  <Badge variant="secondary" className="mr-1 text-xs">
                    {csvCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو البريد أو الهاتف..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
                {/* Role Filter */}
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as "all" | "USER" | "GUEST" | "ADMIN" | "SUPER_ADMIN")}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="USER">الأعضاء</SelectItem>
                    <SelectItem value="GUEST">الزوار</SelectItem>
                    <SelectItem value="ADMIN">المدراء</SelectItem>
                    <SelectItem value="SUPER_ADMIN">المدراء العامين</SelectItem>
                  </SelectContent>
                </Select>
                {/* Label Filter */}
                <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-between",
                        labelFilter.length > 0 && "border-primary"
                      )}
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
                            setLabelFilter([]);
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
                    <div className="border rounded-lg max-h-[300px] overflow-y-auto p-2">
                      {labels?.map((label) => {
                        const isSelected = labelFilter.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            onClick={() => toggleLabelFilter(label.id)}
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
                      {(!labels || labels.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">
                          لا توجد تصنيفات
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Users List */}
              <ScrollArea className="h-[350px] border rounded-md">
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {/* Select All */}
                    <div
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer border-b mb-2"
                      onClick={selectAllUsers}
                    >
                      <Checkbox
                        checked={
                          users.filter((u) => !u.isRegistered).length > 0 &&
                          users
                            .filter((u) => !u.isRegistered)
                            .every((u) => selectedUserIds.includes(u.id))
                        }
                      />
                      <span className="font-medium">تحديد الكل</span>
                      <span className="text-sm text-muted-foreground">
                        ({users.filter((u) => !u.isRegistered).length} متاح)
                      </span>
                    </div>

                    {users.map((user: UserWithStatus) => (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md hover:bg-muted",
                          user.isRegistered
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        )}
                        onClick={() => toggleUser(user.id, user.isRegistered)}
                      >
                        <Checkbox
                          checked={selectedUserIds.includes(user.id)}
                          disabled={user.isRegistered}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.isRegistered && (
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 text-xs"
                              >
                                مسجل
                              </Badge>
                            )}
                            {user.role === "GUEST" && (
                              <Badge variant="outline" className="text-xs">
                                زائر
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                            {user.companyName && ` • ${user.companyName}`}
                          </p>
                        </div>
                        {/* Labels */}
                        {user.labels.length > 0 && (
                          <div className="flex gap-1">
                            {user.labels.slice(0, 2).map((label) => (
                              <div
                                key={label.id}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: label.color }}
                                title={label.name}
                              />
                            ))}
                            {user.labels.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{user.labels.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {userSearch || labelFilter.length > 0
                      ? "لا توجد نتائج"
                      : "لا يوجد أعضاء"}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Guests Tab */}
            <TabsContent value="guests" className="space-y-4">
              <div className="space-y-3">
                {guests.map((guest, index) => (
                  <div
                    key={guest.id}
                    className="p-3 border rounded-lg space-y-3"
                  >
                    {/* Row 1: Name and Phone (required fields) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          الاسم *
                        </Label>
                        <Input
                          placeholder="الاسم"
                          value={guest.name}
                          onChange={(e) =>
                            updateGuest(guest.id, "name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          الهاتف *
                        </Label>
                        <div className="border rounded-md px-3 py-2">
                          <PhoneInput
                            international
                            defaultCountry="SA"
                            value={guest.phone}
                            onChange={(value) =>
                              updateGuest(guest.id, "phone", value || "")
                            }
                            className="phone-input-container"
                            placeholder="5XXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Row 2: Email, Company, Position (optional fields) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          البريد
                        </Label>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={guest.email}
                          onChange={(e) =>
                            updateGuest(guest.id, "email", e.target.value)
                          }
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          الشركة
                        </Label>
                        <Input
                          placeholder="الشركة"
                          value={guest.companyName}
                          onChange={(e) =>
                            updateGuest(guest.id, "companyName", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          المنصب
                        </Label>
                        <Input
                          placeholder="المنصب"
                          value={guest.position}
                          onChange={(e) =>
                            updateGuest(guest.id, "position", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    {/* Delete button */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuestRow(guest.id)}
                        disabled={guests.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 me-1" />
                        <span className="sm:inline hidden">حذف</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addGuestRow} className="w-full">
                <Plus className="h-4 w-4 me-2" />
                إضافة زائر آخر
              </Button>
            </TabsContent>

            {/* CSV Tab */}
            <TabsContent value="csv" className="space-y-4">
              {csvData.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">رفع ملف CSV</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    الأعمدة المطلوبة: name (الاسم), phone (الهاتف)
                    <br />
                    الأعمدة الاختيارية: email, company, position
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 me-2" />
                    اختر ملف
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      تم استيراد {csvData.length} سجل
                    </p>
                    <Button variant="outline" size="sm" onClick={clearCSV}>
                      <X className="h-4 w-4 me-2" />
                      إزالة
                    </Button>
                  </div>

                  {csvErrors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">أخطاء في الملف:</span>
                      </div>
                      <ul className="text-sm text-destructive space-y-1">
                        {csvErrors.slice(0, 5).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {csvErrors.length > 5 && (
                          <li>... و {csvErrors.length - 5} أخطاء أخرى</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <ScrollArea className="h-[250px] border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="p-2 text-right">الاسم</th>
                          <th className="p-2 text-right">الهاتف</th>
                          <th className="p-2 text-right">البريد</th>
                          <th className="p-2 text-right">الشركة</th>
                          <th className="p-2 text-right">المنصب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{row.name}</td>
                            <td className="p-2" dir="ltr">
                              {row.phone}
                            </td>
                            <td className="p-2" dir="ltr">
                              {row.email || "-"}
                            </td>
                            <td className="p-2">{row.company || "-"}</td>
                            <td className="p-2">{row.position || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Summary and Submit */}
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                <span>
                  المحدد:{" "}
                  <strong>
                    {selectedUsersCount} عضو
                    {validGuestsCount + csvCount > 0 &&
                      ` | ${validGuestsCount + csvCount} زائر جديد`}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendQrEmail"
                  checked={sendQrEmail}
                  onCheckedChange={(checked) => setSendQrEmail(checked === true)}
                />
                <Label htmlFor="sendQrEmail" className="text-sm cursor-pointer">
                  إرسال رمز QR بالبريد للزوار الجدد
                </Label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={totalCount === 0 || registerMutation.isPending}
              className="w-full"
              size="lg"
            >
              {registerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <UserPlus className="h-4 w-4 me-2" />
              )}
              تسجيل الحضور ({totalCount})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
