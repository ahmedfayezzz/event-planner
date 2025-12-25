"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { useState } from "react";

interface EmailPreviewProps {
  subject: string;
  html: string;
  isLoading?: boolean;
  sampleUser?: {
    name: string;
    email: string;
    companyName: string;
    position: string;
    phone: string;
  };
}

export function EmailPreview({
  subject,
  html,
  isLoading = false,
  sampleUser,
}: EmailPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Eye className="h-4 w-4 ml-2" />
          )}
          معاينة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>معاينة البريد الإلكتروني</DialogTitle>
        </DialogHeader>

        {sampleUser && (
          <div className="text-sm text-muted-foreground mb-2 p-2 bg-muted rounded">
            <span className="font-medium">معاينة باستخدام بيانات: </span>
            {sampleUser.name} ({sampleUser.email})
          </div>
        )}

        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
          {/* Email Header */}
          <div className="bg-muted p-3 border-b">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">الموضوع:</span>
              <span>{subject || "بدون عنوان"}</span>
            </div>
          </div>

          {/* Email Content in iframe for isolation */}
          <div className="flex-1 overflow-auto bg-gray-100">
            <iframe
              srcDoc={html || "<p>لا يوجد محتوى</p>"}
              className="w-full h-full min-h-[500px] border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline preview component (non-modal)
interface EmailPreviewInlineProps {
  html: string;
  className?: string;
}

export function EmailPreviewInline({ html, className }: EmailPreviewInlineProps) {
  return (
    <div className={className}>
      <iframe
        srcDoc={html || "<p style='text-align:center;color:#666;padding:40px;'>لا يوجد محتوى للمعاينة</p>"}
        className="w-full h-full min-h-[400px] border rounded-lg bg-gray-50"
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
