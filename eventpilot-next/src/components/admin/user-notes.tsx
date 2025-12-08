"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Trash2, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface UserNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: { id: string; name: string };
}

interface UserNotesProps {
  userId: string;
  notes?: UserNote[];
  noteCount?: number;
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

export function UserNotes({
  userId,
  notes: initialNotes,
  noteCount = 0,
  trigger,
  onUpdate,
}: UserNotesProps) {
  const [open, setOpen] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Fetch notes when dialog opens (if not passed as prop)
  const { data: fetchedNotes, refetch } = api.note.getByUserId.useQuery(
    { userId },
    { enabled: open && !initialNotes }
  );

  const notes = initialNotes ?? fetchedNotes ?? [];

  const createMutation = api.note.create.useMutation({
    onSuccess: () => {
      setNewNote("");
      refetch();
      onUpdate?.();
      toast.success("تمت إضافة الملاحظة");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteMutation = api.note.delete.useMutation({
    onSuccess: () => {
      refetch();
      onUpdate?.();
      toast.success("تم حذف الملاحظة");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    createMutation.mutate({ userId, content: newNote.trim() });
  };

  const handleDelete = (noteId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
      deleteMutation.mutate({ id: noteId });
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
    >
      <MessageSquare className="h-4 w-4" />
      {noteCount > 0 && (
        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          {noteCount}
        </span>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            ملاحظات المستخدم
            {notes.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({notes.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>لا توجد ملاحظات</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-muted/50 rounded-lg p-3 space-y-2"
              >
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span>{note.createdBy.name}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add note form */}
        <form onSubmit={handleSubmit} className="border-t pt-3 space-y-2">
          <Textarea
            placeholder="أضف ملاحظة جديدة..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newNote.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 ml-1" />
                  إضافة
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
