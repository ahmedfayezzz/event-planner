"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Search,
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Phone,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface InvitationModalProps {
  sessionId: string;
  sessionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationModal({
  sessionId,
  sessionTitle,
  open,
  onOpenChange,
}: InvitationModalProps) {
  const utils = api.useUtils();

  // Email tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  // WhatsApp tab state
  const [phoneInput, setPhoneInput] = useState("");
  const [whatsappLinks, setWhatsappLinks] = useState<
    { phone: string; link: string }[]
  >([]);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Queries
  const { data: users, isLoading: loadingUsers } =
    api.invitation.getUsersForInvite.useQuery(
      { sessionId, search: searchQuery || undefined },
      { enabled: open }
    );

  const { data: invites, isLoading: loadingInvites } =
    api.invitation.getSessionInvites.useQuery(
      { sessionId },
      { enabled: open }
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
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال الدعوات");
    },
  });

  const generateWhatsAppMutation = api.invitation.generateWhatsAppLinks.useQuery(
    { sessionId, phones: phoneInput.split("\n").filter((p) => p.trim()) },
    { enabled: false }
  );

  const resendMutation = api.invitation.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة إرسال الدعوة");
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إعادة الإرسال");
    },
  });

  const deleteMutation = api.invitation.deleteInvite.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدعوة");
      utils.invitation.getSessionInvites.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل الحذف");
    },
  });

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

  const handleGenerateWhatsApp = async () => {
    const phones = phoneInput.split("\n").filter((p) => p.trim());
    if (phones.length === 0) {
      toast.error("الرجاء إدخال أرقام الهواتف");
      return;
    }
    const result = await generateWhatsAppMutation.refetch();
    if (result.data?.links) {
      setWhatsappLinks(result.data.links);
      toast.success(`تم إنشاء ${result.data.links.length} رابط`);
    }
  };

  const handleCopyLink = async (phone: string, link: string) => {
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
      toast.success("تم نسخ الرابط");
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>دعوة مستخدمين - {sessionTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
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

          {/* Email Invitations Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>البحث عن مستخدمين</Label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم، البريد، أو الشركة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            <ScrollArea className="h-48 border rounded-md">
              {loadingUsers ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : users && users.length > 0 ? (
                <div className="p-2 space-y-1">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleEmail(user.email)}
                    >
                      <Checkbox checked={selectedEmails.includes(user.email)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
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
                  {searchQuery ? "لا توجد نتائج" : "ابدأ البحث للعثور على مستخدمين"}
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
                    onClick={() => toggleEmail(email)}
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
            </Button>
          </TabsContent>

          {/* WhatsApp Invitations Tab */}
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>أرقام الهواتف (رقم واحد في كل سطر)</Label>
              <Textarea
                placeholder="966500000000&#10;966501234567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                rows={4}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                أدخل أرقام الهواتف بالتنسيق الدولي بدون + أو مسافات
              </p>
            </div>

            <Button
              onClick={handleGenerateWhatsApp}
              disabled={!phoneInput.trim() || generateWhatsAppMutation.isFetching}
              className="w-full"
            >
              {generateWhatsAppMutation.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Phone className="h-4 w-4 ml-2" />
              )}
              إنشاء روابط واتساب
            </Button>

            {whatsappLinks.length > 0 && (
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-2">
                  {whatsappLinks.map(({ phone, link }) => (
                    <div
                      key={phone}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <span className="font-mono text-sm" dir="ltr">
                        {phone}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(phone, link)}
                        >
                          {copiedPhone === phone ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(link, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Manage Invitations Tab */}
          <TabsContent value="manage" className="mt-4">
            <ScrollArea className="h-80">
              {loadingInvites ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : invites && invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>البريد</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الإرسال</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">
                          {invite.email.includes("@placeholder.local")
                            ? invite.email.replace("whatsapp-", "").replace("@placeholder.local", "")
                            : invite.email}
                        </TableCell>
                        <TableCell>
                          {invite.used ? (
                            <Badge variant="default">مستخدمة</Badge>
                          ) : invite.isExpired ? (
                            <Badge variant="destructive">منتهية</Badge>
                          ) : (
                            <Badge variant="secondary">سارية</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {invite.sentAt
                            ? new Date(invite.sentAt).toLocaleDateString("ar-SA")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!invite.used && !invite.email.includes("@placeholder.local") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  resendMutation.mutate({ inviteId: invite.id })
                                }
                                disabled={resendMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteMutation.mutate({ inviteId: invite.id })
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  لا توجد دعوات مرسلة لهذه الجلسة
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
