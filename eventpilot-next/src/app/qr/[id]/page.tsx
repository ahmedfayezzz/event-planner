"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeImage } from "@/components/qr-display";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import {
  Download,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export default function PublicQRPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: qrData,
    isLoading,
    error,
  } = api.attendance.getPublicQR.useQuery({ registrationId: id });

  const utils = api.useUtils();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Fetch branded QR code for download
      const brandedQR = await utils.attendance.getPublicBrandedQR.fetch({
        registrationId: id,
      });

      if (brandedQR?.qrCode) {
        // Convert data URL to Blob for better Safari compatibility
        const base64Data = brandedQR.qrCode.split(",")[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        // Create a link to download the PDF
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `qr-${brandedQR.session.title.replace(
          /\s+/g,
          "-"
        )}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
        toast.success("تم تحميل رمز QR");
      }
    } catch {
      toast.error("حدث خطأ أثناء التحميل");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="flex justify-center">
              <Skeleton className="w-64 h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <Card>
            <CardContent className="py-8">
              <h1 className="text-2xl font-bold mb-4">رمز QR غير متوفر</h1>
              <p className="text-muted-foreground mb-6">
                {error?.message ||
                  "لم يتم العثور على التسجيل أو أنه غير مؤكد بعد"}
              </p>
              <Button asChild>
                <Link href="/">
                  <ArrowRight className="h-4 w-4 me-2" />
                  الرئيسية
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* QR Code Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">رمز QR للحضور</CardTitle>
            <CardDescription>
              {qrData.attendeeName && (
                <span className="block text-base font-medium text-foreground mb-1">
                  {qrData.attendeeName}
                </span>
              )}
              {qrData.session.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <QRCodeImage qrCode={qrData.qrCode} size="lg" />
            </div>

            {/* Session Details */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">
                    {formatArabicDate(new Date(qrData.session.date))}
                  </span>
                  <span className="text-muted-foreground mx-2">-</span>
                  <span className="text-muted-foreground">
                    {formatArabicTime(new Date(qrData.session.date))}
                  </span>
                </div>
              </div>

              {qrData.session.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  {qrData.session.locationUrl ? (
                    <a
                      href={qrData.session.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {qrData.session.location}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span>{qrData.session.location}</span>
                  )}
                </div>
              )}
            </div>

            {/* Download & Preview Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="flex-1"
                size="lg"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 me-2" />
                    تحميل PDF
                  </>
                )}
              </Button>
              {/* <Button variant="outline" size="lg" asChild>
                <Link href={`/qr/${id}/pdf-preview`}>
                  <Eye className="h-4 w-4 me-2" />
                  معاينة
                </Link>
              </Button> */}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-2">تعليمات الحضور</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. احفظ هذه الصفحة أو حمّل رمز QR</li>
              <li>2. أظهر الرمز للمشرف عند الوصول</li>
              <li>3. تأكد من وضوح الرمز على الشاشة</li>
              <li>4. سيتم مسح الرمز لتسجيل حضورك</li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer Link */}
        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link href={`/session/${qrData.session.id}`}>عرض تفاصيل الحدث</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
