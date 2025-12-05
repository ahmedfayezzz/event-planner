"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { Search, Users, MoreVertical, Shield, UserX, UserCheck, Download } from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  companyName?: string | null;
  position?: string | null;
  registrationCount: number;
  attendanceCount: number;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch } = api.admin.getUsers.useQuery({
    search: search || undefined,
    role: roleFilter !== "all" ? (roleFilter as "USER" | "ADMIN") : undefined,
    isActive: statusFilter !== "all" ? statusFilter === "active" : undefined,
  });

  const toggleActiveMutation = api.admin.toggleUserActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateRoleMutation = api.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const { refetch: fetchCsv } = api.admin.exportUsers.useQuery(
    { includeInactive: statusFilter !== "active" },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success(`تم تصدير ${result.data.count} مستخدم`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المستخدمين</h1>
          <p className="text-muted-foreground">
            إدارة حسابات المستخدمين
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="me-2 h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الصلاحية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="USER">مستخدم</SelectItem>
                <SelectItem value="ADMIN">مدير</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {!data || data.users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد مستخدمين</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الصلاحية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التسجيلات</TableHead>
                  <TableHead>الحضور</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user: UserItem) => (
                  <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {user.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{user.companyName || "-"}</p>
                        <p className="text-sm text-muted-foreground">{user.position || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role === "ADMIN" ? "مدير" : "مستخدم"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? "bg-green-500/10 text-green-600 border-green-200"
                            : "bg-red-500/10 text-red-600 border-red-200"
                        }
                      >
                        {user.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.registrationCount}</TableCell>
                    <TableCell>{user.attendanceCount}</TableCell>
                    <TableCell>
                      {formatArabicDate(new Date(user.createdAt))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateRoleMutation.mutate({
                                userId: user.id,
                                role: user.role === "ADMIN" ? "USER" : "ADMIN",
                              })
                            }
                          >
                            <Shield className="me-2 h-4 w-4" />
                            {user.role === "ADMIN" ? "إزالة صلاحية المدير" : "ترقية لمدير"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              toggleActiveMutation.mutate({ userId: user.id })
                            }
                            className={user.isActive ? "text-red-600" : "text-green-600"}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="me-2 h-4 w-4" />
                                تعطيل الحساب
                              </>
                            ) : (
                              <>
                                <UserCheck className="me-2 h-4 w-4" />
                                تفعيل الحساب
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
