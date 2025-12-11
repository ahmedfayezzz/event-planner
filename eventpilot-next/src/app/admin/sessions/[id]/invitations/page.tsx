"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn, formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  Mail,
  Phone,
  Search,
  Send,
  Loader2,
  RefreshCw,
  Ban,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  MailCheck,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  X,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  position: string | null;
  isRegistered: boolean;
  isInvited: boolean;
}

export default function InvitationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const utils = api.useUtils();
  const { isExpanded, toggleRow } = useExpandableRows();

  // Shared state
  const [activeTab, setActiveTab] = useState("email");

  // Email tab state
  const [emailSearch, setEmailSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  // WhatsApp tab state
  const [whatsappSearch, setWhatsappSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<
    { phone: string; name?: string }[]
  >([]);
  const [manualPhones, setManualPhones] = useState<string[]>([""]);
  const [manualOpen, setManualOpen] = useState(false);

  // Helper functions for manual phone inputs
  const addPhoneInput = () => {
    setManualPhones([...manualPhones, ""]);
  };

  const removePhoneInput = (index: number) => {
    setManualPhones(manualPhones.filter((_, i) => i !== index));
  };

  const updatePhoneInput = (index: number, value: string) => {
    const updated = [...manualPhones];
    updated[index] = value;
    setManualPhones(updated);
  };
  const [whatsappLinks, setWhatsappLinks] = useState<
    { phone: string; name?: string; link: string }[]
  >([]);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Manage tab state
  const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "expired" | "used" | "invalidated">("all");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "invalidateSingle" | "invalidateBulk" | "resendBulk";
    inviteId?: string;
    count?: number;
  } | null>(null);

  // Queries
  const { data: session, isLoading: loadingSession } = api.session.getById.useQuery(
    { id: sessionId },
    { enabled: !!sessionId }
  );

  const { data: emailUsers, isLoading: loadingEmailUsers } = api.invitation.getUsersForInvite.useQuery(
    { sessionId, search: emailSearch || undefined, limit: 50 },
    { enabled: activeTab === "email" }
  );

  const { data: whatsappUsers, isLoading: loadingWhatsappUsers } = api.invitation.getUsersForInvite.useQuery(
    { sessionId, search: whatsappSearch || undefined, hasPhone: true, limit: 50 },
    { enabled: activeTab === "whatsapp" }
  );

  const { data: invitesData, isLoading: loadingInvites } = api.invitation.getSessionInvites.useQuery(
    { sessionId, status: statusFilter, search: inviteSearch || undefined },
    { enabled: activeTab === "manage" }
  );

  // Mutations
  const sendInvitesMutation = api.invitation.sendInvites.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال ${data.summary.success} دعوة بنجاح`);
      if (data.summary.failed > 0) {
        toast.error(`فشل إرسال ${data.summary.failed} دعوة`);
      }
      setSelectedEmails([]);
      setCustomMessage("");
      utils.invitation.getUsersForInvite.invalidate({ sessionId });
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال الدعوات");
    },
  });

  const generateWhatsAppMutation = api.invitation.generateWhatsAppLinks.useMutation({
    onSuccess: (data) => {
      setWhatsappLinks(data.links);
      toast.success(`تم إنشاء ${data.links.length} رابط`);
      setSelectedContacts([]);
      setManualPhones([""]);
      utils.invitation.getUsersForInvite.invalidate({ sessionId });
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الروابط");
    },
  });

  const resendMutation = api.invitation.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة إرسال الدعوة");
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إعادة الإرسال");
    },
  });

  const bulkResendMutation = api.invitation.bulkResend.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إعادة إرسال ${data.summary.success} دعوة`);
      if (data.summary.failed > 0) {
        toast.error(`فشل إعادة إرسال ${data.summary.failed} دعوة`);
      }
      setSelectedInvites([]);
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إعادة الإرسال");
    },
  });

  const invalidateMutation = api.invitation.invalidateInvite.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الدعوة");
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إلغاء الدعوة");
    },
  });

  const bulkInvalidateMutation = api.invitation.bulkInvalidate.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إلغاء ${data.count} دعوة`);
      setSelectedInvites([]);
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إلغاء الدعوات");
    },
  });

  // Handlers
  const handleSendInvites = () => {
    if (selectedEmails.length === 0) {
      toast.error("الرجاء اختيار مستخدمين للدعوة");
      return;
    }
    sendInvitesMutation.mutate({
      sessionId,
      emails: selectedEmails,
      customMessage: customMessage || undefined,
    });
  };

  const handleGenerateWhatsApp = () => {
    // PhoneInput returns E.164 format like +966500000000
    // Remove + prefix for consistency with existing API
    const contactsFromManual = manualPhones
      .filter((p) => p.trim())
      .map((p) => ({
        phone: p.startsWith("+") ? p.substring(1) : p,
      }));
    const allContacts = [...selectedContacts, ...contactsFromManual];

    if (allContacts.length === 0) {
      toast.error("الرجاء اختيار مستخدمين أو إدخال أرقام الهواتف");
      return;
    }

    generateWhatsAppMutation.mutate({ sessionId, contacts: allContacts });
  };

  const handleCopyLink = async (phone: string, link: string) => {
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
      toast.success("تم نسخ الرابط");
    }
  };

  const handleCopyAllLinks = async () => {
    const allLinks = whatsappLinks.map((l) => l.link).join("\n");
    const success = await copyToClipboard(allLinks);
    if (success) {
      toast.success("تم نسخ جميع الروابط");
    }
  };

  const toggleEmail = (email: string, isRegistered: boolean) => {
    if (isRegistered) return;
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const toggleContact = (
    phone: string,
    name: string | undefined,
    isRegistered: boolean
  ) => {
    if (isRegistered) return;
    setSelectedContacts((prev) =>
      prev.some((c) => c.phone === phone)
        ? prev.filter((c) => c.phone !== phone)
        : [...prev, { phone, name }]
    );
  };

  const toggleInvite = (id: string) => {
    setSelectedInvites((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllEmails = () => {
    if (!emailUsers) return;
    const selectableEmails = emailUsers.filter((u) => !u.isRegistered).map((u) => u.email);
    const allSelected = selectableEmails.every((e) => selectedEmails.includes(e));
    if (allSelected) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(selectableEmails);
    }
  };

  const selectAllContacts = () => {
    if (!whatsappUsers) return;
    const selectableContacts = whatsappUsers
      .filter((u) => !u.isRegistered && u.phone)
      .map((u) => ({ phone: u.phone!, name: u.name }));
    const allSelected = selectableContacts.every((c) =>
      selectedContacts.some((sc) => sc.phone === c.phone)
    );
    if (allSelected) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(selectableContacts);
    }
  };

  const selectAllInvites = () => {
    if (!invitesData?.invites) return;
    const selectableIds = invitesData.invites.filter((i) => !i.used && !i.invalidated).map((i) => i.id);
    const allSelected = selectableIds.every((id) => selectedInvites.includes(id));
    if (allSelected) {
      setSelectedInvites([]);
    } else {
      setSelectedInvites(selectableIds);
    }
  };

  // Handle confirmed action
  const handleConfirmedAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "invalidateSingle" && confirmAction.inviteId) {
      invalidateMutation.mutate({ inviteId: confirmAction.inviteId });
    } else if (confirmAction.type === "invalidateBulk") {
      bulkInvalidateMutation.mutate({ inviteIds: selectedInvites });
    } else if (confirmAction.type === "resendBulk") {
      bulkResendMutation.mutate({ inviteIds: selectedInvites });
    }
    setConfirmAction(null);
  };

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  const stats = invitesData?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/sessions/${sessionId}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">إدارة الدعوات</h1>
          <p className="text-muted-foreground">{session.title}</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإجمالي</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">سارية</CardTitle>
              <MailCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">منتهية</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مستخدمة</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ملغاة</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.invalidated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 ml-2" />
            بريد إلكتروني
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Phone className="h-4 w-4 ml-2" />
            واتساب
          </TabsTrigger>
          <TabsTrigger value="manage">
            <RefreshCw className="h-4 w-4 ml-2" />
            إدارة الدعوات
          </TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>دعوة عبر البريد الإلكتروني</CardTitle>
              <CardDescription>ابحث عن المستخدمين وأرسل لهم دعوات عبر البريد الإلكتروني</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>البحث عن مستخدمين</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم، البريد، أو الشركة..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-md">
                {loadingEmailUsers ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : emailUsers && emailUsers.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {/* Select All */}
                    <div
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer border-b mb-2"
                      onClick={selectAllEmails}
                    >
                      <Checkbox
                        checked={
                          emailUsers.filter((u) => !u.isRegistered).length > 0 &&
                          emailUsers.filter((u) => !u.isRegistered).every((u) => selectedEmails.includes(u.email))
                        }
                      />
                      <span className="font-medium">تحديد الكل</span>
                      <span className="text-sm text-muted-foreground">
                        ({emailUsers.filter((u) => !u.isRegistered).length} متاح)
                      </span>
                    </div>

                    {emailUsers.map((user: UserWithStatus) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted ${
                          user.isRegistered ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        onClick={() => toggleEmail(user.email, user.isRegistered)}
                      >
                        <Checkbox
                          checked={selectedEmails.includes(user.email)}
                          disabled={user.isRegistered}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.isRegistered && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                                مسجل
                              </Badge>
                            )}
                            {user.isInvited && !user.isRegistered && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 text-xs">
                                مدعو
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                            {user.companyName && ` • ${user.companyName}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {emailSearch ? "لا توجد نتائج" : "ابدأ البحث للعثور على مستخدمين"}
                  </div>
                )}
              </ScrollArea>

              {selectedEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleEmail(email, false)}
                    >
                      {email} ×
                    </Badge>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>رسالة مخصصة (اختياري)</Label>
                <Textarea
                  placeholder="أضف رسالة مخصصة للدعوة..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSendInvites}
                disabled={selectedEmails.length === 0 || sendInvitesMutation.isPending}
                className="w-full"
              >
                {sendInvitesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                إرسال {selectedEmails.length} دعوة
                {selectedEmails.length > 0 && (
                  <span className="text-xs opacity-70 mr-2">({selectedEmails.length}/100)</span>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>دعوة عبر واتساب</CardTitle>
              <CardDescription>اختر المستخدمين أو أدخل أرقام الهواتف لإنشاء روابط واتساب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>البحث عن مستخدمين</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم، الهاتف، أو الشركة..."
                    value={whatsappSearch}
                    onChange={(e) => setWhatsappSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-48 border rounded-md">
                {loadingWhatsappUsers ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : whatsappUsers && whatsappUsers.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {/* Select All */}
                    <div
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer border-b mb-2"
                      onClick={selectAllContacts}
                    >
                      <Checkbox
                        checked={
                          whatsappUsers.filter((u) => !u.isRegistered && u.phone).length > 0 &&
                          whatsappUsers
                            .filter((u) => !u.isRegistered && u.phone)
                            .every((u) => selectedContacts.some((c) => c.phone === u.phone))
                        }
                      />
                      <span className="font-medium">تحديد الكل</span>
                      <span className="text-sm text-muted-foreground">
                        ({whatsappUsers.filter((u) => !u.isRegistered && u.phone).length} متاح)
                      </span>
                    </div>

                    {whatsappUsers.map((user: UserWithStatus) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted ${
                          user.isRegistered || !user.phone ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        onClick={() => user.phone && toggleContact(user.phone, user.name, user.isRegistered)}
                      >
                        <Checkbox
                          checked={user.phone ? selectedContacts.some((c) => c.phone === user.phone) : false}
                          disabled={user.isRegistered || !user.phone}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.isRegistered && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                                مسجل
                              </Badge>
                            )}
                            {user.isInvited && !user.isRegistered && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 text-xs">
                                مدعو
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate" dir="ltr">
                            {user.phone || "بدون رقم"}
                            {user.companyName && ` • ${user.companyName}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {whatsappSearch ? "لا توجد نتائج" : "ابدأ البحث للعثور على مستخدمين"}
                  </div>
                )}
              </ScrollArea>

              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((contact) => (
                    <Badge
                      key={contact.phone}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleContact(contact.phone, contact.name, false)}
                    >
                      {contact.name || contact.phone} ×
                    </Badge>
                  ))}
                </div>
              )}

              {/* Manual phone input */}
              <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    إضافة أرقام يدوياً
                    <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {manualPhones.map((phone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 border rounded-md px-3 py-2">
                        <PhoneInput
                          international
                          defaultCountry="SA"
                          value={phone}
                          onChange={(value) => updatePhoneInput(index, value || "")}
                          className="phone-input-container"
                          placeholder="5XXXXXXXX"
                        />
                      </div>
                      {manualPhones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhoneInput(index)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhoneInput}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 me-2" />
                    إضافة رقم
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Button
                onClick={handleGenerateWhatsApp}
                disabled={
                  (selectedContacts.length === 0 && !manualPhones.some((p) => p.trim())) ||
                  generateWhatsAppMutation.isPending
                }
                className="w-full"
              >
                {generateWhatsAppMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Phone className="h-4 w-4 ml-2" />
                )}
                إنشاء روابط واتساب
              </Button>

              {whatsappLinks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>الروابط المنشأة ({whatsappLinks.length})</Label>
                    <Button size="sm" variant="outline" onClick={handleCopyAllLinks}>
                      <Copy className="h-4 w-4 ml-2" />
                      نسخ جميع الروابط
                    </Button>
                  </div>
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-2 space-y-2">
                      {whatsappLinks.map(({ phone, name, link }) => (
                        <div
                          key={phone}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex flex-col">
                            {name && <span className="text-sm font-medium">{name}</span>}
                            <span className="font-mono text-sm text-muted-foreground" dir="ltr">
                              {phone}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleCopyLink(phone, link)}>
                              {copiedPhone === phone ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(link, "_blank")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>إدارة الدعوات</CardTitle>
                  <CardDescription>عرض وإدارة جميع الدعوات المرسلة</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                  {(["all", "valid", "expired", "used", "invalidated"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={statusFilter === status ? "default" : "outline"}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all" && "الكل"}
                      {status === "valid" && "سارية"}
                      {status === "expired" && "منتهية"}
                      {status === "used" && "مستخدمة"}
                      {status === "invalidated" && "ملغاة"}
                      {stats && (
                        <span className="text-xs opacity-70 mr-1">
                          ({status === "all" ? stats.total : stats[status]})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالبريد أو الرقم..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedInvites.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm">تم تحديد {selectedInvites.length} دعوة</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAction({ type: "resendBulk", count: selectedInvites.length })}
                    disabled={bulkResendMutation.isPending}
                  >
                    {bulkResendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 ml-1" />
                    )}
                    إعادة إرسال
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setConfirmAction({ type: "invalidateBulk", count: selectedInvites.length })}
                    disabled={bulkInvalidateMutation.isPending}
                  >
                    {bulkInvalidateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Ban className="h-4 w-4 ml-1" />
                    )}
                    إلغاء
                  </Button>
                </div>
              )}

              {/* Table */}
              <ScrollArea className="h-96">
                {loadingInvites ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : invitesData?.invites && invitesData.invites.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              invitesData.invites.filter((i) => !i.used && !i.invalidated).length > 0 &&
                              invitesData.invites
                                .filter((i) => !i.used && !i.invalidated)
                                .every((i) => selectedInvites.includes(i.id))
                            }
                            onCheckedChange={selectAllInvites}
                          />
                        </TableHead>
                        <TableHead>البريد / الرقم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="hidden md:table-cell">تاريخ الإرسال</TableHead>
                        <TableHead className="hidden md:table-cell">إجراءات</TableHead>
                        <TableHead className="md:hidden w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitesData.invites.map((invite) => {
                        const isWhatsApp = invite.email.includes("@placeholder.local");
                        const displayValue = isWhatsApp
                          ? invite.email.replace("whatsapp-", "").replace("@placeholder.local", "")
                          : invite.email;
                        const expanded = isExpanded(invite.id);

                        return (
                          <React.Fragment key={invite.id}>
                            <TableRow>
                              <TableCell>
                                <Checkbox
                                  checked={selectedInvites.includes(invite.id)}
                                  onCheckedChange={() => toggleInvite(invite.id)}
                                  disabled={invite.used || invite.invalidated}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isWhatsApp ? (
                                    <Phone className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Mail className="h-4 w-4 text-blue-600" />
                                  )}
                                  <span className={cn(isWhatsApp && "font-mono", "truncate max-w-[150px] md:max-w-none")} dir={isWhatsApp ? "ltr" : "rtl"}>
                                    {displayValue}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {invite.used ? (
                                  <Badge variant="default" className="bg-blue-500">مستخدمة</Badge>
                                ) : invite.invalidated ? (
                                  <Badge variant="destructive">ملغاة</Badge>
                                ) : invite.isExpired ? (
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">منتهية</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600">سارية</Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {invite.sentAt ? formatArabicDate(new Date(invite.sentAt)) : "-"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex gap-1">
                                  {!invite.used && !invite.invalidated && !isWhatsApp && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => resendMutation.mutate({ inviteId: invite.id })}
                                      disabled={resendMutation.isPending}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!invite.used && !invite.invalidated && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setConfirmAction({ type: "invalidateSingle", inviteId: invite.id })}
                                      disabled={invalidateMutation.isPending}
                                    >
                                      <Ban className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="md:hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleRow(invite.id)}
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
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">تاريخ الإرسال:</span>
                                        <span className="mr-1">
                                          {invite.sentAt ? formatArabicDate(new Date(invite.sentAt)) : "-"}
                                        </span>
                                      </div>
                                      {(!invite.used && !invite.invalidated) && (
                                        <div className="flex gap-2">
                                          {!isWhatsApp && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => resendMutation.mutate({ inviteId: invite.id })}
                                              disabled={resendMutation.isPending}
                                            >
                                              <RefreshCw className="h-3 w-3 ml-1" />
                                              إعادة إرسال
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-destructive"
                                            onClick={() => setConfirmAction({ type: "invalidateSingle", inviteId: invite.id })}
                                            disabled={invalidateMutation.isPending}
                                          >
                                            <Ban className="h-3 w-3 ml-1" />
                                            إلغاء
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
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    لا توجد دعوات
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "invalidateSingle" && "إلغاء الدعوة"}
              {confirmAction?.type === "invalidateBulk" && "إلغاء الدعوات"}
              {confirmAction?.type === "resendBulk" && "إعادة إرسال الدعوات"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "invalidateSingle" &&
                "هل أنت متأكد من إلغاء هذه الدعوة؟ لن يتمكن المستلم من استخدامها."}
              {confirmAction?.type === "invalidateBulk" &&
                `هل أنت متأكد من إلغاء ${confirmAction?.count} دعوة؟ لن يتمكن المستلمون من استخدامها.`}
              {confirmAction?.type === "resendBulk" &&
                `هل أنت متأكد من إعادة إرسال ${confirmAction?.count} دعوة؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "invalidateSingle" || confirmAction?.type === "invalidateBulk"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
