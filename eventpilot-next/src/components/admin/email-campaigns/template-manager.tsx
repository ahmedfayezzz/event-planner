"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  FileText,
  Lock,
  Copy,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { RichTextEditor, PlaceholderButtons } from "@/components/admin/rich-text-editor";

export function TemplateManager() {
  const utils = api.useUtils();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    id?: string;
    name: string;
    subject: string;
    content: string;
    isSystem?: boolean;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Queries
  const { data: templates, isLoading } = api.bulkEmail.getTemplates.useQuery();

  // Mutations
  const saveTemplateMutation = api.bulkEmail.saveTemplate.useMutation({
    onSuccess: () => {
      toast.success(editingTemplate?.id ? "تم حفظ القالب" : "تم إنشاء القالب");
      setEditDialogOpen(false);
      setEditingTemplate(null);
      utils.bulkEmail.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const deleteTemplateMutation = api.bulkEmail.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القالب");
      setDeleteConfirmId(null);
      utils.bulkEmail.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleCreate = useCallback(() => {
    setEditingTemplate({
      name: "",
      subject: "",
      content: "",
    });
    setEditDialogOpen(true);
  }, []);

  const handleEdit = useCallback((template: {
    id: string;
    name: string;
    subject: string;
    isSystem: boolean;
  }) => {
    utils.bulkEmail.getTemplate.fetch({ id: template.id }).then((full) => {
      if (full) {
        setEditingTemplate({
          id: full.id,
          name: full.name,
          subject: full.subject,
          content: full.content,
          isSystem: full.isSystem,
        });
        setEditDialogOpen(true);
      }
    });
  }, [utils]);

  const handleDuplicate = useCallback((template: {
    id: string;
    name: string;
    subject: string;
  }) => {
    utils.bulkEmail.getTemplate.fetch({ id: template.id }).then((full) => {
      if (full) {
        setEditingTemplate({
          name: `${full.name} (نسخة)`,
          subject: full.subject,
          content: full.content,
        });
        setEditDialogOpen(true);
      }
    });
  }, [utils]);

  const handleSave = useCallback(() => {
    if (!editingTemplate) return;

    if (!editingTemplate.name.trim() || !editingTemplate.subject.trim() || !editingTemplate.content.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    saveTemplateMutation.mutate({
      id: editingTemplate.id,
      name: editingTemplate.name,
      subject: editingTemplate.subject,
      content: editingTemplate.content,
    });
  }, [editingTemplate, saveTemplateMutation]);

  const insertPlaceholder = useCallback((placeholder: string) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content: editingTemplate.content + placeholder,
      });
    }
  }, [editingTemplate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          إنشاء وإدارة قوالب البريد الإلكتروني القابلة لإعادة الاستخدام
        </p>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          قالب جديد
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">اسم القالب</TableHead>
              <TableHead>الموضوع</TableHead>
              <TableHead className="w-[100px]">النوع</TableHead>
              <TableHead className="w-[150px]">تاريخ التعديل</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-60" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : templates?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-50" />
                    <p>لا توجد قوالب</p>
                    <Button variant="outline" size="sm" onClick={handleCreate}>
                      إنشاء قالب جديد
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              templates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {template.isSystem && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{template.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[300px]">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    {template.isSystem ? (
                      <Badge variant="secondary">نظام</Badge>
                    ) : (
                      <Badge variant="outline">مخصص</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatArabicDate(template.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 ml-2" />
                          نسخ
                        </DropdownMenuItem>
                        {!template.isSystem && (
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmId(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "تعديل القالب" : "قالب جديد"}
              {editingTemplate?.isSystem && (
                <span className="text-sm font-normal text-muted-foreground mr-2">
                  (قالب نظام - يمكن تعديل المحتوى فقط)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">اسم القالب</Label>
              <Input
                id="template-name"
                value={editingTemplate?.name ?? ""}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="أدخل اسم القالب..."
                disabled={editingTemplate?.isSystem}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="template-subject">عنوان الرسالة</Label>
              <Input
                id="template-subject"
                value={editingTemplate?.subject ?? ""}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                placeholder="أدخل عنوان الرسالة..."
              />
            </div>

            {/* Placeholders */}
            <PlaceholderButtons onInsert={insertPlaceholder} />

            {/* Content */}
            <div className="space-y-2">
              <Label>محتوى الرسالة</Label>
              <RichTextEditor
                content={editingTemplate?.content ?? ""}
                onChange={(html) => setEditingTemplate(prev => prev ? { ...prev, content: html } : null)}
                placeholder="اكتب محتوى القالب هنا..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saveTemplateMutation.isPending}>
              {saveTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا القالب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteTemplateMutation.mutate({ id: deleteConfirmId });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
