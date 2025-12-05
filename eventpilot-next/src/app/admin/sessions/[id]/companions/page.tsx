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
import { ArrowRight, Search, Users, Mail, Download } from "lucide-react";

interface CompanionItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  inviteSent: boolean;
  registrantName?: string | null;
  registrantEmail?: string | null;
}

export default function SessionCompanionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [search, setSearch] = useState("");

  const { data: session, isLoading: sessionLoading } = api.session.getById.useQuery({ id });
  const { data: companions, isLoading: companionsLoading, refetch } = api.companion.getSessionCompanions.useQuery(
    { sessionId: id },
    { enabled: !!id }
  );

  // Filter companions by search
  const filteredCompanions = useMemo(() => {
    if (!companions) return [];
    if (!search.trim()) return companions;

    const searchLower = search.toLowerCase();
    return companions.filter((c: CompanionItem) =>
      c.name?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search) ||
      c.company?.toLowerCase().includes(searchLower) ||
      c.registrantName?.toLowerCase().includes(searchLower)
    );
  }, [companions, search]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!companions) return { total: 0, withEmail: 0, invitesSent: 0 };
    return {
      total: companions.length,
      withEmail: companions.filter((c: CompanionItem) => c.email).length,
      invitesSent: companions.filter((c: CompanionItem) => c.inviteSent).length,
    };
  }, [companions]);

  const handleExportCSV = () => {
    if (!companions || companions.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = ["الاسم", "الشركة", "المنصب", "الهاتف", "البريد", "المسجل", "حالة الدعوة"];
    const rows = companions.map((c: CompanionItem) => [
      c.name,
      c.company || "",
      c.title || "",
      c.phone || "",
      c.email || "",
      c.registrantName || "",
      c.inviteSent ? "مرسلة" : "غير مرسلة",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `companions-session-${session?.sessionNumber || id}.csv`;
    link.click();
    toast.success("تم تصدير البيانات");
  };

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
            <h1 className="text-2xl font-bold">المرافقين</h1>
            <p className="text-muted-foreground">
              {session.title} - {formatArabicDate(new Date(session.date))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!companions?.length}>
            <Download className="me-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المرافقين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">لديهم بريد إلكتروني</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withEmail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">تم إرسال الدعوة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.invitesSent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الشركة أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pe-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {companionsLoading ? (
            <div className="p-6">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : filteredCompanions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{search ? "لا توجد نتائج مطابقة" : "لا يوجد مرافقين"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>المنصب</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>المسجل</TableHead>
                  <TableHead>حالة الدعوة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanions.map((companion: CompanionItem) => (
                  <TableRow key={companion.id}>
                    <TableCell className="font-medium">{companion.name}</TableCell>
                    <TableCell>{companion.company || "-"}</TableCell>
                    <TableCell>{companion.title || "-"}</TableCell>
                    <TableCell dir="ltr">{companion.phone || "-"}</TableCell>
                    <TableCell>{companion.email || "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{companion.registrantName}</div>
                        <div className="text-xs text-muted-foreground">
                          {companion.registrantEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {companion.email ? (
                        <Badge
                          variant="outline"
                          className={
                            companion.inviteSent
                              ? "bg-green-500/10 text-green-600 border-green-200"
                              : "bg-gray-500/10 text-gray-600 border-gray-200"
                          }
                        >
                          <Mail className="me-1 h-3 w-3" />
                          {companion.inviteSent ? "مرسلة" : "غير مرسلة"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                          لا يوجد بريد
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Navigation Links */}
      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href={`/admin/sessions/${id}/attendees`}>
            عرض المسجلين
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/checkin/${id}`}>
            تسجيل الحضور
          </Link>
        </Button>
      </div>
    </div>
  );
}
