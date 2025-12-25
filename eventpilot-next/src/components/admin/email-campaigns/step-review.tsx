"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  Send,
  Users,
  Mail,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  FileText,
  CheckCircle2,
  TestTube,
} from "lucide-react";
import { EmailPreviewInline } from "@/components/admin/email-preview";
import type { SelectedUser, Attachment, CampaignFilters } from "./types";

interface StepReviewProps {
  subject: string;
  content: string;
  attachments: Attachment[];
  selectedUsers: SelectedUser[];
  filters: CampaignFilters;
  onBack: () => void;
  onSuccess: () => void;
}

export function StepReview({
  subject,
  content,
  attachments,
  selectedUsers,
  filters,
  onBack,
  onSuccess,
}: StepReviewProps) {
  const utils = api.useUtils();

  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Save dialogs
  const [saveDraftDialogOpen, setSaveDraftDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Test email
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Queries
  const { data: previewData } = api.bulkEmail.previewEmail.useQuery(
    {
      htmlContent: content,
      subject,
      sampleUserId: selectedUsers[0]?.id,
    },
    { enabled: !!content && !!subject }
  );

  // Mutations
  const createCampaignMutation = api.bulkEmail.createCampaign.useMutation();
  const sendCampaignMutation = api.bulkEmail.sendCampaign.useMutation();

  const saveDraftMutation = api.bulkEmail.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ المسودة");
      setSaveDraftDialogOpen(false);
      setDraftName("");
      utils.bulkEmail.getDrafts.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ في حفظ المسودة: ${error.message}`);
    },
  });

  const saveTemplateMutation = api.bulkEmail.saveTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ القالب");
      setSaveTemplateDialogOpen(false);
      setTemplateName("");
      utils.bulkEmail.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ في حفظ القالب: ${error.message}`);
    },
  });

  const sendTestEmailMutation = api.bulkEmail.sendBulkEmail.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال رسالة الاختبار");
      setTestEmailDialogOpen(false);
      setTestEmail("");
    },
    onError: (error) => {
      toast.error(`خطأ في إرسال رسالة الاختبار: ${error.message}`);
    },
  });

  const handleSend = useCallback(async () => {
    setIsSending(true);
    try {
      // Create campaign first
      const campaign = await createCampaignMutation.mutateAsync({
        name: `حملة ${new Date().toLocaleDateString("ar-SA")}`,
        subject,
        content,
        recipientUserIds: selectedUsers.map((u) => u.id),
        attachments: attachments.length > 0 ? attachments : undefined,
        recipientFilters: filters as unknown as Record<string, unknown>,
      });

      // Send campaign
      const result = await sendCampaignMutation.mutateAsync({
        campaignId: campaign.id,
      });

      toast.success(
        `تم إرسال ${result.sentCount} رسالة بنجاح${result.failedCount > 0 ? ` (${result.failedCount} فشل)` : ""}`
      );

      setSendConfirmOpen(false);
      utils.bulkEmail.getCampaigns.invalidate();
      onSuccess();
    } catch (error) {
      toast.error(`خطأ في الإرسال: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    } finally {
      setIsSending(false);
    }
  }, [
    createCampaignMutation,
    sendCampaignMutation,
    subject,
    content,
    selectedUsers,
    attachments,
    filters,
    utils,
    onSuccess,
  ]);

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          {/* Save Draft */}
          <Dialog open={saveDraftDialogOpen} onOpenChange={setSaveDraftDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">حفظ كمسودة</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>حفظ المسودة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="draft-name">اسم المسودة</Label>
                  <Input
                    id="draft-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="أدخل اسم المسودة..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    saveDraftMutation.mutate({
                      name: draftName,
                      subject,
                      content,
                    });
                  }}
                  disabled={!draftName.trim() || saveDraftMutation.isPending}
                >
                  {saveDraftMutation.isPending && (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  )}
                  حفظ
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Template */}
          <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">حفظ كقالب</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>حفظ القالب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">اسم القالب</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="أدخل اسم القالب..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    saveTemplateMutation.mutate({
                      name: templateName,
                      subject,
                      content,
                    });
                  }}
                  disabled={!templateName.trim() || saveTemplateMutation.isPending}
                >
                  {saveTemplateMutation.isPending && (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  )}
                  حفظ
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Test Email */}
          <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <TestTube className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">اختبار</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إرسال رسالة اختبار</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">البريد الإلكتروني</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني..."
                    dir="ltr"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    // Send test email to the specified address
                    sendTestEmailMutation.mutate({
                      userIds: selectedUsers.slice(0, 1).map((u) => u.id),
                      subject: `[اختبار] ${subject}`,
                      htmlContent: content,
                      attachments: attachments.length > 0 ? attachments : undefined,
                      testEmail: testEmail.trim(),
                    });
                  }}
                  disabled={!testEmail.trim() || sendTestEmailMutation.isPending}
                >
                  {sendTestEmailMutation.isPending && (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  )}
                  إرسال رسالة اختبار
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setSendConfirmOpen(true)} className="gap-2">
            <Send className="h-4 w-4" />
            إرسال
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          label="المستلمين"
          value={`${selectedUsers.length} مستخدم`}
        />
        <SummaryCard
          icon={<Mail className="h-5 w-5" />}
          label="الموضوع"
          value={subject}
        />
        <SummaryCard
          icon={<Paperclip className="h-5 w-5" />}
          label="المرفقات"
          value={attachments.length > 0 ? `${attachments.length} ملف` : "لا يوجد"}
        />
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {/* Recipients */}
        <Collapsible open={recipientsOpen} onOpenChange={setRecipientsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                قائمة المستلمين ({selectedUsers.length})
              </span>
              {recipientsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Email Preview */}
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                معاينة الرسالة
              </span>
              {previewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="overflow-hidden">
              <div className="bg-muted p-3 border-b">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">الموضوع:</span>
                  <span>{previewData?.subject ?? subject}</span>
                </div>
              </div>
              <CardContent className="p-0">
                <EmailPreviewInline html={previewData?.html ?? ""} className="min-h-[300px]" />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                المرفقات
              </h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <Badge key={att.filename} variant="secondary">
                    {att.filename}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile: Sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <Button onClick={() => setSendConfirmOpen(true)} className="flex-1 gap-2">
            <Send className="h-4 w-4" />
            إرسال
          </Button>
        </div>
      </div>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإرسال</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إرسال هذه الرسالة إلى {selectedUsers.length} مستخدم؟
              <br />
              <span className="font-medium">العنوان: </span>
              {subject}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  إرسال
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <div className="font-medium truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
