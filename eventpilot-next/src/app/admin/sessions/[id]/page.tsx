"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  Edit,
  Users,
  QrCode,
  Mail,
  Eye,
  Calendar,
  MapPin,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  CheckCircle,
  MailCheck,
  Loader2,
  Trash2,
  ExternalLink,
  UtensilsCrossed,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getHostingTypeLabel } from "@/lib/constants";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isExpanded, toggleRow } = useExpandableRows();

  const { data: session, isLoading } = api.session.getAdminDetails.useQuery({ id });
  const { data: caterings } = api.catering.getSessionCatering.useQuery({ sessionId: id });

  const deleteMutation = api.session.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحدث بنجاح");
      router.push("/admin/sessions");
    },
    onError: (error) => {
      toast.error(error.message || "فشل حذف الحدث");
    },
  });

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-600 border-green-200",
    closed: "bg-red-500/10 text-red-600 border-red-200",
    completed: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const statusLabels: Record<string, string> = {
    open: "مفتوح",
    closed: "مغلق",
    completed: "منتهي",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  const stats = session.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/sessions">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <Badge variant="outline" className={statusColors[session.status]}>
                {statusLabels[session.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              التجمع رقم {session.sessionNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/session/${session.id}`} target="_blank">
              <Eye className="ml-2 h-4 w-4" />
              معاينة
              <ExternalLink className="mr-2 h-3 w-3" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/sessions/${id}/edit`}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </Button>
        </div>
      </div>

      {/* Session Info Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">معلومات الحدث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">
                  {formatArabicDate(new Date(session.date))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوقت</p>
                <p className="font-medium">
                  {new Date(session.date).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            {session.location && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المكان</p>
                  <p className="font-medium">{session.location}</p>
                </div>
              </div>
            )}
            {session.guestName && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الضيف</p>
                  <p className="font-medium">{session.guestName}</p>
                </div>
              </div>
            )}
          </div>
          {session.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">الوصف</p>
              <p className="text-sm">{session.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              المسجلين الموافق عليهم
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              من أصل {session.maxParticipants} مقعد
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-green-500"
                style={{ width: `${stats.fillRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              بانتظار الموافقة
            </CardTitle>
            <UserX className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.guestRegistrations} ضيوف
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحضور الفعلي</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendance}</div>
            <p className="text-xs text-muted-foreground">
              نسبة الحضور {stats.attendanceRate}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${stats.attendanceRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الدعوات المرسلة</CardTitle>
            <MailCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invitesSent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableSpots} مقعد متاح
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/admin/sessions/${id}/invitations`}>
                <Mail className="ml-2 h-4 w-4" />
                دعوة مستخدمين
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/sessions/${id}/attendees`}>
                <Users className="ml-2 h-4 w-4" />
                إدارة المسجلين
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/checkin/${id}`}>
                <QrCode className="ml-2 h-4 w-4" />
                تسجيل الحضور
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/sessions/${id}/catering`}>
                <UtensilsCrossed className="ml-2 h-4 w-4" />
                إدارة الضيافة
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catering Section */}
      {caterings && caterings.caterings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>الضيافة</CardTitle>
                <CardDescription>{caterings.caterings.length} عنصر ضيافة</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/sessions/${id}/catering`}>
                  إدارة الضيافة
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caterings.caterings.map((catering) => (
                <div
                  key={catering.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">
                        {getHostingTypeLabel(catering.hostingType)}
                      </Badge>
                      {catering.isSelfCatering ? (
                        <span className="text-sm text-muted-foreground">
                          ضيافة ذاتية
                        </span>
                      ) : catering.host ? (
                        <span className="text-sm font-medium">
                          {catering.host.name}
                          {catering.host.companyName && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              - {catering.host.companyName}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                    {catering.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {catering.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>أحدث التسجيلات</CardTitle>
              <CardDescription>آخر 10 تسجيلات في الحدث</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/sessions/${id}/attendees`}>
                عرض الكل
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {session.recentRegistrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead className="hidden md:table-cell">البريد / الهاتف</TableHead>
                  <TableHead className="hidden md:table-cell">النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden md:table-cell">المرافقين</TableHead>
                  <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                  <TableHead className="md:hidden w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.recentRegistrations.map((reg) => {
                  const expanded = isExpanded(reg.id);
                  return (
                    <React.Fragment key={reg.id}>
                      <TableRow>
                        <TableCell className="font-medium">{reg.name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            {reg.email && <div>{reg.email}</div>}
                            {reg.phone && (
                              <div className="text-muted-foreground">{reg.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={reg.isGuest ? "bg-orange-500/10 text-orange-600" : ""}>
                            {reg.isGuest ? "ضيف" : "عضو"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              reg.isApproved
                                ? "bg-green-500/10 text-green-600"
                                : "bg-yellow-500/10 text-yellow-600"
                            }
                          >
                            {reg.isApproved ? "موافق عليه" : "بانتظار الموافقة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{reg.companionCount}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatArabicDate(new Date(reg.registeredAt))}
                        </TableCell>
                        <TableCell className="md:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(reg.id)}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      <tr className="md:hidden">
                        <td colSpan={3} className="p-0">
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              expanded
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="p-4 bg-muted/30 border-b space-y-2 text-sm">
                                {(reg.email || reg.phone) && (
                                  <div>
                                    <span className="text-muted-foreground">التواصل:</span>
                                    <span className="mr-1">
                                      {reg.email || reg.phone}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">النوع:</span>
                                  <Badge variant="outline" className={cn("mr-1", reg.isGuest ? "bg-orange-500/10 text-orange-600" : "")}>
                                    {reg.isGuest ? "ضيف" : "عضو"}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">المرافقين:</span>
                                  <span className="mr-1">{reg.companionCount}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">التاريخ:</span>
                                  <span className="mr-1">{formatArabicDate(new Date(reg.registeredAt))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد تسجيلات بعد</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف الحدث؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الحدث &quot;{session.title}&quot; وجميع التسجيلات المرتبطة به.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
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
