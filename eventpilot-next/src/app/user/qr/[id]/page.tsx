"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeImage } from "@/components/qr-display";
import { formatArabicDate, formatArabicTime } from "@/lib/utils";
import { ArrowRight, Download, Loader2, ExternalLink } from "lucide-react";

export default function UserQRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status: authStatus } = useSession();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: qrData, isLoading, error } = api.attendance.getMyQR.useQuery(
    { sessionId: id },
    { enabled: authStatus === "authenticated" }
  );

  const utils = api.useUtils();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Fetch branded QR code
      const brandedQR = await utils.attendance.getBrandedQR.fetch({ sessionId: id });

      if (brandedQR?.qrCode) {
        // Create download link
        const link = document.createElement("a");
        link.href = brandedQR.qrCode;
        link.download = `qr-${brandedQR.session.title.replace(/\s+/g, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download QR:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-48" />
          </div>
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

  if (authStatus === "unauthenticated") {
    redirect("/user/login");
  }

  if (error || !qrData) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <h1 className="text-2xl font-bold">رمز QR غير متوفر</h1>
          <p className="text-muted-foreground">
            {error?.message || "لم يتم العثور على تسجيل مؤكد لهذا الحدث"}
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/user/registrations">العودة لتسجيلاتي</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sessions">استعرض الأحداث</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/user/registrations">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">رمز QR للحضور</h1>
            <p className="text-sm text-muted-foreground">
              أظهر هذا الرمز عند تسجيل الحضور
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{qrData.session.title}</CardTitle>
            <CardDescription>
              {formatArabicDate(new Date(qrData.session.date))} -{" "}
              {formatArabicTime(new Date(qrData.session.date))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <QRCodeImage qrCode={qrData.qrCode} size="lg" />
            </div>

            {qrData.session.location && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">المكان</p>
                {qrData.session.locationUrl ? (
                  <a
                    href={qrData.session.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline inline-flex items-center justify-center gap-1"
                  >
                    {qrData.session.location}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="font-medium">{qrData.session.location}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-2">تعليمات الحضور</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. أظهر هذا الرمز للمشرف عند الوصول</li>
              <li>2. تأكد من وضوح الرمز على الشاشة</li>
              <li>3. سيتم مسح الرمز لتسجيل حضورك</li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <Download className="ml-2 h-4 w-4" />
                تحميل رمز QR
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/session/${id}`}>عرض تفاصيل الحدث</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/user/registrations">العودة لتسجيلاتي</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
