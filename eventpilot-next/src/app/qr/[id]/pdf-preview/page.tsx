"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Download, Loader2 } from "lucide-react";

export default function PDFPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = api.attendance.getPublicBrandedQR.useQuery(
    { registrationId: id },
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-full aspect-[3/4]" />
        </div>
      </div>
    );
  }

  if (error || !data?.qrCode) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <h1 className="text-2xl font-bold">فشل تحميل PDF</h1>
          <p className="text-muted-foreground">
            {error?.message || "لم يتم العثور على التسجيل"}
          </p>
          <Button asChild>
            <Link href={`/qr/${id}`}>
              <ArrowRight className="h-4 w-4 me-2" />
              العودة
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = data.qrCode;
    link.download = `qr-${data.session.title.replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">معاينة PDF</h1>
            <p className="text-sm text-muted-foreground">{data.session.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/qr/${id}`}>
                <ArrowRight className="h-4 w-4 me-2" />
                العودة
              </Link>
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 me-2" />
              تحميل
            </Button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="border rounded-lg overflow-hidden bg-muted">
          <iframe
            src={data.qrCode}
            className="w-full aspect-[3/4] bg-white"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
}
