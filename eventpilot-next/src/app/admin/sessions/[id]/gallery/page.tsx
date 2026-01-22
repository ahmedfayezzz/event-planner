"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  Plus,
  Images,
  Users,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  pending: "في الانتظار",
  uploading: "جاري الرفع",
  processing: "جاري المعالجة",
  clustering: "تجميع الوجوه",
  matching: "مطابقة الأشخاص",
  ready: "جاهز",
  error: "خطأ",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-600 border-gray-200",
  uploading: "bg-blue-500/10 text-blue-600 border-blue-200",
  processing: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  clustering: "bg-purple-500/10 text-purple-600 border-purple-200",
  matching: "bg-orange-500/10 text-orange-600 border-orange-200",
  ready: "bg-green-500/10 text-green-600 border-green-200",
  error: "bg-red-500/10 text-red-600 border-red-200",
};

export default function GalleryListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  const { data: config, isLoading: configLoading } = api.gallery.isConfigured.useQuery();
  const { data: session } = api.session.getAdminDetails.useQuery({ id: sessionId });
  const { data: galleries, isLoading, refetch } = api.gallery.listBySession.useQuery({
    sessionId,
  });

  const utils = api.useUtils();

  const createMutation = api.gallery.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المعرض بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء المعرض");
    },
  });

  const deleteMutation = api.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المعرض بنجاح");
      utils.gallery.listBySession.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل حذف المعرض");
    },
  });

  if (configLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!config?.configured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${sessionId}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">معرض الصور</h1>
            <p className="text-muted-foreground">{session?.title}</p>
          </div>
        </div>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              الميزة غير مفعلة
            </CardTitle>
            <CardDescription>
              يرجى إعداد متغيرات البيئة المطلوبة لتفعيل ميزة معرض الصور
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>المتغيرات المطلوبة:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 rounded">AWS_REKOGNITION_ACCESS_KEY_ID</code></li>
                <li><code className="bg-muted px-1 rounded">AWS_REKOGNITION_SECRET_ACCESS_KEY</code></li>
                <li><code className="bg-muted px-1 rounded">AWS_GALLERY_S3_BUCKET</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${sessionId}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">معرض الصور</h1>
            <p className="text-muted-foreground">{session?.title}</p>
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate({ sessionId })}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="ml-2 h-4 w-4" />
          )}
          إنشاء معرض جديد
        </Button>
      </div>

      {/* Galleries Grid */}
      {galleries && galleries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {galleries.map((gallery) => (
            <Card key={gallery.id} className="group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {gallery.title || "معرض الصور"}
                    </CardTitle>
                    <CardDescription>
                      {formatArabicDate(new Date(gallery.createdAt))}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusColors[gallery.status]}
                  >
                    {statusLabels[gallery.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Images className="h-4 w-4" />
                    <span>{gallery._count.images} صورة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{gallery._count.faceClusters} شخص</span>
                  </div>
                </div>

                {gallery.status === "processing" || gallery.status === "clustering" || gallery.status === "matching" ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>جاري المعالجة...</span>
                      <span>{gallery.processedImages}/{gallery.totalImages}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${gallery.totalImages > 0 ? (gallery.processedImages / gallery.totalImages) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/admin/sessions/${sessionId}/gallery/${gallery.id}`}>
                      <Eye className="ml-2 h-4 w-4" />
                      عرض المعرض
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف المعرض</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف هذا المعرض؟ سيتم حذف جميع الصور والوجوه المكتشفة. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate({ galleryId: gallery.id })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          ) : null}
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Images className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد معارض</h3>
            <p className="text-muted-foreground mb-4">
              قم بإنشاء معرض جديد لرفع صور الحدث
            </p>
            <Button
              onClick={() => createMutation.mutate({ sessionId })}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="ml-2 h-4 w-4" />
              )}
              إنشاء معرض جديد
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
