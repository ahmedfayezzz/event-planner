"use client";

import React, { useRef, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Paperclip,
  X,
  FileText,
  Trash2,
  Loader2,
  Eye,
  Edit,
  File,
  Image as ImageIcon,
} from "lucide-react";
import { RichTextEditor, PlaceholderButtons } from "@/components/admin/rich-text-editor";
import { EmailPreviewInline } from "@/components/admin/email-preview";
import type { SelectedUser, Attachment } from "./types";

interface StepComposeProps {
  subject: string;
  setSubject: (subject: string) => void;
  content: string;
  setContent: (content: string) => void;
  attachments: Attachment[];
  setAttachments: (attachments: Attachment[]) => void;
  selectedUsers: SelectedUser[];
  onNext: () => void;
  onBack: () => void;
}

export function StepCompose({
  subject,
  setSubject,
  content,
  setContent,
  attachments,
  setAttachments,
  selectedUsers,
  onNext,
  onBack,
}: StepComposeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const [loadDraftDialogOpen, setLoadDraftDialogOpen] = useState(false);
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  // Queries
  const { data: drafts } = api.bulkEmail.getDrafts.useQuery();
  const { data: templates } = api.bulkEmail.getTemplates.useQuery();

  const { data: previewData, isLoading: loadingPreview } = api.bulkEmail.previewEmail.useQuery(
    {
      htmlContent: content,
      subject,
      sampleUserId: selectedUsers[0]?.id,
    },
    { enabled: !!content && !!subject }
  );

  const deleteDraftMutation = api.bulkEmail.deleteDraft.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المسودة");
      utils.bulkEmail.getDrafts.invalidate();
    },
  });

  const deleteTemplateMutation = api.bulkEmail.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القالب");
      utils.bulkEmail.getTemplates.invalidate();
    },
  });

  // Allowed file types for attachments
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`نوع الملف غير مدعوم: ${file.name}`);
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast.error("حجم الملف يجب أن يكون أقل من 10 ميجابايت");
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (base64) {
            setAttachments([
              ...attachments,
              { filename: file.name, content: base64, type: file.type },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [attachments, setAttachments]
  );

  const removeAttachment = useCallback(
    (filename: string) => {
      setAttachments(attachments.filter((a) => a.filename !== filename));
    },
    [attachments, setAttachments]
  );

  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      setContent(content + placeholder);
    },
    [content, setContent]
  );

  const loadDraft = useCallback(
    async (draftId: string) => {
      const draft = await utils.bulkEmail.getDraft.fetch({ id: draftId });
      if (draft) {
        setSubject(draft.subject ?? "");
        setContent(draft.content ?? "");
        setLoadDraftDialogOpen(false);
        toast.success("تم تحميل المسودة");
      }
    },
    [utils, setSubject, setContent]
  );

  const loadTemplate = useCallback(
    async (templateId: string) => {
      const template = await utils.bulkEmail.getTemplate.fetch({ id: templateId });
      if (template) {
        setSubject(template.subject);
        setContent(template.content);
        setLoadTemplateDialogOpen(false);
        toast.success("تم تحميل القالب");
      }
    },
    [utils, setSubject, setContent]
  );

  const canProceed = subject.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <span className="text-muted-foreground">|</span>
          <Badge variant="secondary">{selectedUsers.length} مستلم</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Load buttons */}
          <Dialog open={loadDraftDialogOpen} onOpenChange={setLoadDraftDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 ml-1" />
                مسودة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تحميل مسودة</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {drafts?.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">لا توجد مسودات</p>
                ) : (
                  drafts?.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => loadDraft(draft.id)}>
                        <div className="font-medium">{draft.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {draft.subject || "بدون عنوان"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDraftMutation.mutate({ id: draft.id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={loadTemplateDialogOpen} onOpenChange={setLoadTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 ml-1" />
                قالب
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تحميل قالب</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {templates?.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">لا توجد قوالب</p>
                ) : (
                  templates?.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(template.id)}>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.subject}</div>
                      </div>
                      {!template.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={onNext} disabled={!canProceed} className="gap-2">
            التالي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile: Edit/Preview Toggle */}
      <div className="lg:hidden">
        <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as "edit" | "preview")}>
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1 gap-2">
              <Edit className="h-4 w-4" />
              تحرير
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 gap-2">
              <Eye className="h-4 w-4" />
              معاينة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <EditorPanel
              subject={subject}
              setSubject={setSubject}
              content={content}
              setContent={setContent}
              attachments={attachments}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              removeAttachment={removeAttachment}
              insertPlaceholder={insertPlaceholder}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <PreviewPanel
              subject={previewData?.subject ?? subject}
              html={previewData?.html ?? ""}
              sampleUser={previewData?.sampleUser}
              isLoading={loadingPreview}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Edit className="h-4 w-4" />
              تحرير الرسالة
            </h3>
            <EditorPanel
              subject={subject}
              setSubject={setSubject}
              content={content}
              setContent={setContent}
              attachments={attachments}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              removeAttachment={removeAttachment}
              insertPlaceholder={insertPlaceholder}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              معاينة
            </h3>
            <PreviewPanel
              subject={previewData?.subject ?? subject}
              html={previewData?.html ?? ""}
              sampleUser={previewData?.sampleUser}
              isLoading={loadingPreview}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <Button onClick={onNext} disabled={!canProceed} className="flex-1">
            التالي
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Editor Panel Component
function EditorPanel({
  subject,
  setSubject,
  content,
  setContent,
  attachments,
  fileInputRef,
  handleFileUpload,
  removeAttachment,
  insertPlaceholder,
}: {
  subject: string;
  setSubject: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  attachments: Attachment[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (filename: string) => void;
  insertPlaceholder: (placeholder: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">عنوان الرسالة</Label>
        <Input
          id="subject"
          placeholder="أدخل عنوان الرسالة..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Placeholders */}
      <PlaceholderButtons onInsert={insertPlaceholder} />

      {/* Rich Text Editor */}
      <div className="space-y-2">
        <Label>محتوى الرسالة</Label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="اكتب محتوى الرسالة هنا..."
        />
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <Label>المرفقات</Label>
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => {
            const isImage = att.type?.startsWith("image/");
            const isPdf = att.type === "application/pdf";
            return (
              <Badge key={att.filename} variant="secondary" className="gap-1.5 py-1">
                {isImage ? (
                  <ImageIcon className="h-3 w-3" />
                ) : isPdf ? (
                  <FileText className="h-3 w-3" />
                ) : (
                  <File className="h-3 w-3" />
                )}
                <span className="max-w-[120px] truncate">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.filename)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 ml-1" />
            إضافة مرفق
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          يمكنك إرفاق صور، PDF، مستندات Word و Excel (حد أقصى 10 ميجابايت لكل ملف)
        </p>
      </div>
    </div>
  );
}

// Preview Panel Component
function PreviewPanel({
  subject,
  html,
  sampleUser,
  isLoading,
}: {
  subject: string;
  html: string;
  sampleUser?: { name: string; email: string; companyName: string; position: string; phone: string };
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {sampleUser && (
        <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
          <span className="font-medium">معاينة لـ: </span>
          {sampleUser.name} ({sampleUser.email})
        </div>
      )}

      {/* Subject Preview */}
      <div className="bg-muted p-3 rounded-lg">
        <div className="text-sm text-muted-foreground mb-1">الموضوع:</div>
        <div className="font-medium">{subject || "بدون عنوان"}</div>
      </div>

      {/* Email Preview */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <EmailPreviewInline html={html} className="min-h-[400px]" />
      )}
    </div>
  );
}
