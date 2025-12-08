"use client";

import React, { use } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserLabelManager } from "@/components/admin/user-label-manager";
import { UserNotes } from "@/components/admin/user-notes";
import { formatArabicDate } from "@/lib/utils";
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Tag,
  ExternalLink,
  Shield,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
  MessageSquare,
} from "lucide-react";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isExpanded, toggleRow } = useExpandableRows();

  const { data: user, isLoading, refetch } = api.admin.getUserById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">المستخدم غير موجود</h2>
        <Button asChild>
          <Link href="/admin/users">العودة للمستخدمين</Link>
        </Button>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">مدير رئيسي</Badge>;
      case "ADMIN":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">مدير</Badge>;
      default:
        return <Badge variant="secondary">مستخدم</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {getRoleBadge(user.role)}
              {user.isActive ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                  <UserCheck className="h-3 w-3 me-1" />
                  نشط
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                  <UserX className="h-3 w-3 me-1" />
                  معطل
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              انضم في {formatArabicDate(new Date(user.createdAt))}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">التسجيلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.totalRegistrations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الحضور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{user.stats.totalAttendances}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user.stats.totalRegistrations > 0
                ? `${Math.round((user.stats.totalAttendances / user.stats.totalRegistrations) * 100)}%`
                : "0%"}{" "}
              معدل الحضور
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المرافقين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{user.stats.totalCompanions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">طلبات الضيافة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{user.stats.hostingRequests}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات المستخدم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" dir="ltr">{user.phone}</span>
              </div>
            )}
            {user.companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.companyName}</span>
              </div>
            )}
            {user.position && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.position}</span>
              </div>
            )}
            {user.twitter && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={user.twitter.startsWith("http") ? user.twitter : `https://twitter.com/${user.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  X (Twitter)
                </a>
              </div>
            )}
            {user.instagram && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={user.instagram.startsWith("http") ? user.instagram : `https://instagram.com/${user.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Instagram
                </a>
              </div>
            )}
            {user.snapchat && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Snapchat: {user.snapchat}</span>
              </div>
            )}
            {user.wantsToHost && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">يرغب بتقديم الضيافة</span>
              </div>
            )}

            {/* Labels */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  التصنيفات
                </span>
                <UserLabelManager
                  userId={user.id}
                  userLabels={user.labels}
                  onUpdate={() => refetch()}
                  trigger={
                    <Button variant="ghost" size="sm">
                      تعديل
                    </Button>
                  }
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.labels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">لا توجد تصنيفات</span>
                ) : (
                  user.labels.map((label) => (
                    <Badge
                      key={label.id}
                      style={{
                        backgroundColor: label.color + "20",
                        color: label.color,
                        borderColor: label.color + "40",
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  الملاحظات
                  {user.notes && user.notes.length > 0 && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {user.notes.length}
                    </span>
                  )}
                </span>
                <UserNotes
                  userId={user.id}
                  notes={user.notes}
                  noteCount={user.notes?.length ?? 0}
                  onUpdate={() => refetch()}
                  trigger={
                    <Button variant="ghost" size="sm">
                      {user.notes && user.notes.length > 0 ? "عرض الكل" : "إضافة"}
                    </Button>
                  }
                />
              </div>
              {user.notes && user.notes.length > 0 ? (
                <div className="space-y-2">
                  {user.notes.slice(0, 2).map((note) => (
                    <div key={note.id} className="text-sm bg-muted/50 p-2 rounded">
                      <p className="line-clamp-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdBy.name}
                      </p>
                    </div>
                  ))}
                  {user.notes.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{user.notes.length - 2} ملاحظات أخرى
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              سجل التسجيلات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {user.registrations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>لا توجد تسجيلات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحدث</TableHead>
                    <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                    <TableHead className="hidden md:table-cell">المرافقين</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden md:table-cell">الحضور</TableHead>
                    <TableHead className="md:hidden w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.registrations.map((reg) => {
                    const expanded = isExpanded(reg.id);
                    return (
                      <React.Fragment key={reg.id}>
                        <TableRow>
                          <TableCell>
                            <Link
                              href={`/admin/sessions/${reg.session.id}`}
                              className="font-medium hover:underline"
                            >
                              {reg.session.title}
                            </Link>
                            <p className="text-xs text-muted-foreground hidden md:block">
                              #{reg.session.sessionNumber}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatArabicDate(new Date(reg.session.date))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {reg.invitedRegistrations.length > 0 ? (
                              <Badge variant="outline">
                                {reg.invitedRegistrations.length} مرافق
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={reg.isApproved ? "default" : "outline"}
                              className={
                                reg.isApproved
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : "bg-orange-500/10 text-orange-600 border-orange-200"
                              }
                            >
                              {reg.isApproved ? "مؤكد" : "معلق"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {reg.attendance?.attended ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 me-1" />
                                حضر
                              </Badge>
                            ) : new Date(reg.session.date) < new Date() ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                                لم يحضر
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Clock className="h-3 w-3 me-1" />
                                قادم
                              </Badge>
                            )}
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
                                  <div>
                                    <span className="text-muted-foreground">رقم الحدث:</span>
                                    <span className="mr-1">#{reg.session.sessionNumber}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">التاريخ:</span>
                                    <span className="mr-1">{formatArabicDate(new Date(reg.session.date))}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">المرافقين:</span>
                                    <span className="mr-1">
                                      {reg.invitedRegistrations.length > 0
                                        ? `${reg.invitedRegistrations.length} مرافق`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">الحضور:</span>
                                    <span className="mr-1">
                                      {reg.attendance?.attended ? (
                                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                          <CheckCircle className="h-3 w-3 me-1" />
                                          حضر
                                        </Badge>
                                      ) : new Date(reg.session.date) < new Date() ? (
                                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                                          لم يحضر
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground">
                                          <Clock className="h-3 w-3 me-1" />
                                          قادم
                                        </Badge>
                                      )}
                                    </span>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
