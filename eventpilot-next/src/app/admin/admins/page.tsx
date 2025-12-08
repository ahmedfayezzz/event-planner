"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useExpandableRows } from "@/hooks/use-expandable-rows";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import {
  Plus,
  MoreVertical,
  Settings,
  Crown,
  Shield,
  UserX,
  UserCheck,
  Loader2,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { PERMISSION_LABELS, type PermissionKey } from "@/lib/permissions";

// All available permissions
const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard",
  "sessions",
  "users",
  "hosts",
  "analytics",
  "checkin",
  "settings",
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  canAccessDashboard: boolean;
  canAccessSessions: boolean;
  canAccessUsers: boolean;
  canAccessHosts: boolean;
  canAccessAnalytics: boolean;
  canAccessCheckin: boolean;
  canAccessSettings: boolean;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const { isExpanded, toggleRow } = useExpandableRows();

  // Permission dialog state
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  // Create admin dialog state
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminPermissions, setNewAdminPermissions] = useState<PermissionKey[]>(ALL_PERMISSIONS);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "deactivate" | "demote";
    adminId: string;
    adminName: string;
  } | null>(null);

  // Fetch admin users
  const { data, isLoading, refetch } = api.admin.getAdminUsers.useQuery();

  const updatePermissionsMutation = api.admin.updateUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات الوصول");
      refetch();
      setPermissionDialogOpen(false);
      setSelectedAdmin(null);
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

  const toggleActiveMutation = api.admin.toggleUserActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const createAdminMutation = api.admin.createAdmin.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء حساب المدير "${data.user.name}" بنجاح`);
      refetch();
      setCreateAdminDialogOpen(false);
      resetCreateAdminForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ في إنشاء الحساب");
    },
  });

  const resetCreateAdminForm = () => {
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setNewAdminPhone("");
    setNewAdminPermissions(ALL_PERMISSIONS);
  };

  const handleCreateAdmin = () => {
    if (!newAdminName.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (!newAdminEmail.trim()) {
      toast.error("البريد الإلكتروني مطلوب");
      return;
    }
    if (!newAdminPassword || newAdminPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (!newAdminPhone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }

    createAdminMutation.mutate({
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      password: newAdminPassword,
      phone: newAdminPhone.trim(),
      permissions: newAdminPermissions,
    });
  };

  const handleNewAdminPermissionToggle = (permission: PermissionKey) => {
    setNewAdminPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const openPermissionDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    // Initialize with current permissions
    const currentPermissions: PermissionKey[] = [];
    if (admin.canAccessDashboard) currentPermissions.push("dashboard");
    if (admin.canAccessSessions) currentPermissions.push("sessions");
    if (admin.canAccessUsers) currentPermissions.push("users");
    if (admin.canAccessHosts) currentPermissions.push("hosts");
    if (admin.canAccessAnalytics) currentPermissions.push("analytics");
    if (admin.canAccessCheckin) currentPermissions.push("checkin");
    if (admin.canAccessSettings) currentPermissions.push("settings");
    setSelectedPermissions(currentPermissions);
    setPermissionDialogOpen(true);
  };

  const handlePermissionToggle = (permission: PermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedAdmin) return;
    updatePermissionsMutation.mutate({
      userId: selectedAdmin.id,
      permissions: selectedPermissions,
    });
  };

  const getPermissionCount = (admin: AdminUser) => {
    let count = 0;
    if (admin.canAccessDashboard) count++;
    if (admin.canAccessSessions) count++;
    if (admin.canAccessUsers) count++;
    if (admin.canAccessHosts) count++;
    if (admin.canAccessAnalytics) count++;
    if (admin.canAccessCheckin) count++;
    if (admin.canAccessSettings) count++;
    return count;
  };

  // Handle confirmed action
  const handleConfirmedAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "demote") {
      updateRoleMutation.mutate({
        userId: confirmAction.adminId,
        role: "USER",
      });
    } else {
      toggleActiveMutation.mutate({ userId: confirmAction.adminId });
    }
    setConfirmAction(null);
  };

  const admins = data?.admins ?? [];
  const currentUserId = data?.currentUserId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المديرين</h1>
          <p className="text-muted-foreground">إدارة حسابات المديرين وصلاحياتهم</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreateAdminDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            إضافة مدير
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المديرين</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المديرين الرئيسيين</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.role === "SUPER_ADMIN").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المديرين العاديين</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.role === "ADMIN").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admins Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد مديرين</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المدير</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead className="hidden md:table-cell">الصلاحيات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden md:table-cell">تاريخ الإنشاء</TableHead>
                  <TableHead className="hidden md:table-cell"></TableHead>
                  <TableHead className="md:hidden w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isCurrentUser = admin.id === currentUserId;
                  const isSuperAdminUser = admin.role === "SUPER_ADMIN";
                  const permissionCount = getPermissionCount(admin);
                  const expanded = isExpanded(admin.id);

                  return (
                    <React.Fragment key={admin.id}>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{admin.name}</p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">
                                  أنت
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground hidden md:block">
                              {admin.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isSuperAdminUser ? "destructive" : "default"}
                            className="gap-1"
                          >
                            {isSuperAdminUser ? (
                              <Crown className="h-3 w-3" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                            {isSuperAdminUser ? "مدير رئيسي" : "مدير"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {isSuperAdminUser ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              جميع الصلاحيات
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {permissionCount} من {ALL_PERMISSIONS.length}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              admin.isActive
                                ? "bg-green-500/10 text-green-600 border-green-200"
                                : "bg-red-500/10 text-red-600 border-red-200"
                            }
                          >
                            {admin.isActive ? "نشط" : "معطل"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatArabicDate(new Date(admin.createdAt))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {isSuperAdmin && !isCurrentUser && !isSuperAdminUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openPermissionDialog(admin)}
                                >
                                  <Settings className="me-2 h-4 w-4" />
                                  إدارة صلاحيات الوصول
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "demote",
                                      adminId: admin.id,
                                      adminName: admin.name,
                                    })
                                  }
                                  className="text-amber-600"
                                >
                                  <Shield className="me-2 h-4 w-4" />
                                  إزالة صلاحية المدير
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: admin.isActive ? "deactivate" : "activate",
                                      adminId: admin.id,
                                      adminName: admin.name,
                                    })
                                  }
                                  className={
                                    admin.isActive ? "text-red-600" : "text-green-600"
                                  }
                                >
                                  {admin.isActive ? (
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
                          )}
                        </TableCell>
                        <TableCell className="md:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(admin.id)}
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
                        <td colSpan={4} className="p-0">
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              expanded
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="p-4 bg-muted/30 border-b space-y-3">
                                <div className="text-sm space-y-2">
                                  <div>
                                    <span className="text-muted-foreground">البريد:</span>
                                    <span className="mr-1" dir="ltr">{admin.email}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">الصلاحيات:</span>
                                    <span className="mr-1">
                                      {isSuperAdminUser ? (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                          جميع الصلاحيات
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline">
                                          {permissionCount} من {ALL_PERMISSIONS.length}
                                        </Badge>
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                                    <span className="mr-1">{formatArabicDate(new Date(admin.createdAt))}</span>
                                  </div>
                                </div>
                                {isSuperAdmin && !isCurrentUser && !isSuperAdminUser && (
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPermissionDialog(admin)}
                                    >
                                      <Settings className="ml-1 h-3 w-3" />
                                      الصلاحيات
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-amber-600"
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "demote",
                                          adminId: admin.id,
                                          adminName: admin.name,
                                        })
                                      }
                                    >
                                      <Shield className="ml-1 h-3 w-3" />
                                      إزالة المدير
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={admin.isActive ? "text-red-600" : "text-green-600"}
                                      onClick={() =>
                                        setConfirmAction({
                                          type: admin.isActive ? "deactivate" : "activate",
                                          adminId: admin.id,
                                          adminName: admin.name,
                                        })
                                      }
                                    >
                                      {admin.isActive ? (
                                        <>
                                          <UserX className="ml-1 h-3 w-3" />
                                          تعطيل
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="ml-1 h-3 w-3" />
                                          تفعيل
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
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

      {/* Permission Management Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              صلاحيات الوصول: {selectedAdmin?.name}
            </DialogTitle>
            <DialogDescription>
              حدد الأقسام التي يمكن لهذا المدير الوصول إليها
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ALL_PERMISSIONS.map((permission) => (
              <div
                key={permission}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <Label htmlFor={permission} className="cursor-pointer flex-1">
                  {PERMISSION_LABELS[permission]}
                </Label>
                <Switch
                  id={permission}
                  checked={selectedPermissions.includes(permission)}
                  onCheckedChange={() => handlePermissionToggle(permission)}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPermissionDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminDialogOpen} onOpenChange={(open) => {
        setCreateAdminDialogOpen(open);
        if (!open) resetCreateAdminForm();
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مدير جديد</DialogTitle>
            <DialogDescription>
              أنشئ حساب مدير جديد مع الصلاحيات المحددة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="admin-name">الاسم</Label>
              <Input
                id="admin-name"
                placeholder="أدخل اسم المدير"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="admin-email">البريد الإلكتروني</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="example@domain.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="admin-password">كلمة المرور</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="6 أحرف على الأقل"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="admin-phone">رقم الهاتف</Label>
              <Input
                id="admin-phone"
                placeholder="05xxxxxxxx"
                value={newAdminPhone}
                onChange={(e) => setNewAdminPhone(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>صلاحيات الوصول</Label>
              <div className="border rounded-lg p-3 space-y-2">
                {ALL_PERMISSIONS.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center justify-between py-1.5"
                  >
                    <Label
                      htmlFor={`new-admin-${permission}`}
                      className="cursor-pointer flex-1 text-sm"
                    >
                      {PERMISSION_LABELS[permission]}
                    </Label>
                    <Switch
                      id={`new-admin-${permission}`}
                      checked={newAdminPermissions.includes(permission)}
                      onCheckedChange={() => handleNewAdminPermissionToggle(permission)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateAdminDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending}
            >
              {createAdminMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="me-2 h-4 w-4" />
              )}
              إنشاء المدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "deactivate" && "تأكيد تعطيل الحساب"}
              {confirmAction?.type === "activate" && "تأكيد تفعيل الحساب"}
              {confirmAction?.type === "demote" && "إزالة صلاحيات المدير"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "deactivate" &&
                `هل أنت متأكد من تعطيل حساب "${confirmAction.adminName}"؟ لن يتمكن من تسجيل الدخول.`}
              {confirmAction?.type === "activate" &&
                `هل أنت متأكد من تفعيل حساب "${confirmAction?.adminName}"؟`}
              {confirmAction?.type === "demote" &&
                `هل أنت متأكد من إزالة صلاحيات المدير من "${confirmAction?.adminName}"؟ سيصبح عضواً عادياً.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "deactivate" || confirmAction?.type === "demote"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
