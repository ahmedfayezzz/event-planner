"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2 } from "lucide-react";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionDialog({ open, onOpenChange }: SuggestionDialogProps) {
  const [content, setContent] = useState("");

  const createMutation = api.suggestion.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال اقتراحك بنجاح، شكراً لك!");
      setContent("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال الاقتراح");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      toast.error("الاقتراح يجب أن يكون 10 أحرف على الأقل");
      return;
    }
    createMutation.mutate({ content: content.trim() });
  };

  const charCount = content.length;
  const isValid = charCount >= 10 && charCount <= 1000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 justify-end">
            <span>اقتراح لتحسين النظام</span>
            <MessageSquare className="h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-right">
            نحن نقدر ملاحظاتك واقتراحاتك لتحسين النظام. شاركنا أفكارك!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggestion" className="text-right block">
              اقتراحك
            </Label>
            <Textarea
              id="suggestion"
              placeholder="اكتب اقتراحك هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] text-right resize-none"
              dir="rtl"
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={charCount > 0 && charCount < 10 ? "text-destructive" : ""}>
                {charCount > 0 && charCount < 10 ? `${10 - charCount} أحرف متبقية للحد الأدنى` : ""}
              </span>
              <span className={charCount > 900 ? "text-orange-500" : ""}>
                {charCount}/1000
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                "إرسال الاقتراح"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
