"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Car,
  UserX,
  UserCheck,
  Loader2,
  Pencil,
} from "lucide-react";

interface ValetEmployee {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
}

export default function ValetEmployeesPage() {
  // Create employee dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<ValetEmployee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    phone: "",
  });

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "deactivate" | "delete";
    employeeId: string;
    employeeName: string;
  } | null>(null);

  // Fetch valet employees
  const { data: employees, isLoading, refetch } = api.valet.listEmployees.useQuery();

  const createMutation = api.valet.createEmployee.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء حساب موظف الفاليه بنجاح");
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ في إنشاء الحساب");
    },
  });

  const updateMutation = api.valet.updateEmployee.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الموظف");
      refetch();
      setEditEmployee(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteMutation = api.valet.deleteEmployee.useMutation({
    onSuccess: () => {
      toast.success("تم تعطيل الحساب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      password: "",
      phone: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (employee: ValetEmployee) => {
    setEditEmployee(employee);
    setFormData({
      name: employee.name,
      username: employee.username,
      password: "",
      phone: employee.phone || "",
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      toast.error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }

    if (editEmployee) {
      // Update existing
      updateMutation.mutate({
        id: editEmployee.id,
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password || undefined,
        phone: formData.phone.trim() || null,
        isActive: editEmployee.isActive,
      });
    } else {
      // Create new
      if (!formData.password || formData.password.length < 6) {
        toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      createMutation.mutate({
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
      });
    }
  };

  const handleConfirmedAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "delete") {
      deleteMutation.mutate({ id: confirmAction.employeeId });
    } else {
      const employee = employees?.find((e) => e.id === confirmAction.employeeId);
      if (employee) {
        updateMutation.mutate({
          id: employee.id,
          isActive: confirmAction.type === "activate",
        });
      }
    }
    setConfirmAction(null);
  };

  const activeCount = employees?.filter((e) => e.isActive).length ?? 0;
  const inactiveCount = employees?.filter((e) => !e.isActive).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">إدارة الموظفين</h2>
          <p className="text-sm text-muted-foreground">إنشاء وتعديل حسابات موظفي الفاليه</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-2 h-4 w-4" />
          إضافة موظف
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موظفين نشطين</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موظفين معطلين</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Car className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد موظفين</p>
              <Button
                variant="link"
                onClick={handleOpenCreate}
                className="mt-2"
              >
                إضافة موظف جديد
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead className="hidden md:table-cell">الهاتف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden md:table-cell">تاريخ الإنشاء</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <p className="font-medium">{employee.name}</p>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {employee.username}
                      </code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {employee.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          employee.isActive
                            ? "bg-green-500/10 text-green-600 border-green-200"
                            : "bg-red-500/10 text-red-600 border-red-200"
                        }
                      >
                        {employee.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatArabicDate(new Date(employee.createdAt))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(employee)}>
                            <Pencil className="me-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({
                                type: employee.isActive ? "deactivate" : "activate",
                                employeeId: employee.id,
                                employeeName: employee.name,
                              })
                            }
                            className={
                              employee.isActive ? "text-red-600" : "text-green-600"
                            }
                          >
                            {employee.isActive ? (
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

      {/* Create/Edit Employee Dialog */}
      <Dialog
        open={createDialogOpen || !!editEmployee}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditEmployee(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editEmployee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </DialogTitle>
            <DialogDescription>
              {editEmployee
                ? "قم بتحديث بيانات موظف الفاليه"
                : "أنشئ حساب موظف فاليه جديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="emp-name">الاسم</Label>
              <Input
                id="emp-name"
                placeholder="أدخل اسم الموظف"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="emp-username">اسم المستخدم</Label>
              <Input
                id="emp-username"
                placeholder="اسم مستخدم للدخول"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="emp-password">
                كلمة المرور
                {editEmployee && (
                  <span className="text-muted-foreground text-xs mr-1">
                    (اتركها فارغة للإبقاء على الحالية)
                  </span>
                )}
              </Label>
              <Input
                id="emp-password"
                type="password"
                placeholder={editEmployee ? "كلمة مرور جديدة" : "6 أحرف على الأقل"}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="emp-phone">رقم الهاتف (اختياري)</Label>
              <Input
                id="emp-phone"
                placeholder="05xxxxxxxx"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditEmployee(null);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {editEmployee ? "تحديث" : "إنشاء"}
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
              {confirmAction?.type === "delete" && "تأكيد الحذف"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "deactivate" &&
                `هل أنت متأكد من تعطيل حساب "${confirmAction.employeeName}"؟ لن يتمكن من تسجيل الدخول.`}
              {confirmAction?.type === "activate" &&
                `هل أنت متأكد من تفعيل حساب "${confirmAction?.employeeName}"؟`}
              {confirmAction?.type === "delete" &&
                `هل أنت متأكد من حذف "${confirmAction?.employeeName}"؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "deactivate" || confirmAction?.type === "delete"
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
