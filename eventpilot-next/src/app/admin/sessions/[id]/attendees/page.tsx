"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { ArrowRight, Search, Check, Download, Users, CheckCheck } from "lucide-react";

interface RegistrationItem {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isGuest: boolean;
  isApproved: boolean;
  registeredAt: Date;
  companions?: { id: string }[];
}

export default function SessionAttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [search, setSearch] = useState("");

  const { data: session, isLoading: sessionLoading } = api.session.getById.useQuery({ id });
  const { data: registrations, isLoading: registrationsLoading, refetch } = api.registration.getSessionRegistrations.useQuery(
    { sessionId: id },
    { enabled: !!id }
  );

  const approveMutation = api.registration.approve.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد التسجيل");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const approveAllMutation = api.registration.approveAll.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تأكيد ${data.approvedCount} تسجيل`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const { refetch: fetchCsv } = api.admin.exportSessionRegistrations.useQuery(
    { sessionId: id },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendees-${session?.sessionNumber || id}.csv`;
      link.click();
      toast.success("تم تصدير البيانات");
    }
  };

  // Filter registrations by search
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    if (!search.trim()) return registrations;

    const searchLower = search.toLowerCase();
    return registrations.filter((reg: RegistrationItem) =>
      reg.name?.toLowerCase().includes(searchLower) ||
      reg.email?.toLowerCase().includes(searchLower) ||
      reg.phone?.includes(search)
    );
  }, [registrations, search]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!registrations) return { total: 0, approved: 0, pending: 0 };
    return {
      total: registrations.length,
      approved: registrations.filter((r: RegistrationItem) => r.isApproved).length,
      pending: registrations.filter((r: RegistrationItem) => !r.isApproved).length,
    };
  }, [registrations]);

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الجلسة غير موجودة</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للجلسات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">المسجلين</h1>
            <p className="text-muted-foreground">
              {session.title} - {formatArabicDate(new Date(session.date))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <Button
              variant="outline"
              onClick={() => approveAllMutation.mutate({ sessionId: id })}
              disabled={approveAllMutation.isPending}
            >
              <CheckCheck className="me-2 h-4 w-4" />
              تأكيد الكل ({stats.pending})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="me-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المسجلين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total} / {session.maxParticipants}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المؤكدين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو البريد أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pe-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {registrationsLoading ? (
            <div className="p-6">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{search ? "لا توجد نتائج مطابقة" : "لا يوجد مسجلين"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المرافقين</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg: RegistrationItem) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.name}</TableCell>
                    <TableCell>{reg.email}</TableCell>
                    <TableCell dir="ltr">{reg.phone}</TableCell>
                    <TableCell>
                      <Badge variant={reg.isGuest ? "secondary" : "default"}>
                        {reg.isGuest ? "زائر" : "عضو"}
                      </Badge>
                    </TableCell>
                    <TableCell>{reg.companions?.length || 0}</TableCell>
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
                    <TableCell>
                      {formatArabicDate(new Date(reg.registeredAt))}
                    </TableCell>
                    <TableCell>
                      {!reg.isApproved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            approveMutation.mutate({
                              registrationId: reg.id,
                            })
                          }
                          disabled={approveMutation.isPending}
                          title="تأكيد التسجيل"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
