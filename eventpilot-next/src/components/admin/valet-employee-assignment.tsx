"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import {
  Car,
  Plus,
  X,
  Loader2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

interface ValetEmployeeAssignmentProps {
  sessionId: string;
  valetEnabled: boolean;
}

export function ValetEmployeeAssignment({
  sessionId,
  valetEnabled,
}: ValetEmployeeAssignmentProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);

  // Fetch assigned employees
  const {
    data: assignedEmployees,
    isLoading: assignedLoading,
    refetch: refetchAssigned,
  } = api.valet.getSessionEmployees.useQuery(
    { sessionId },
    { enabled: valetEnabled }
  );

  // Fetch all employees for the add dialog
  const { data: allEmployees, isLoading: allLoading } = api.valet.listEmployees.useQuery(
    undefined,
    { enabled: addDialogOpen }
  );

  // Assign mutation
  const assignMutation = api.valet.assignEmployeeToSession.useMutation({
    onSuccess: (_, variables) => {
      const employee = allEmployees?.find((e) => e.id === variables.employeeId);
      toast.success(`تم تعيين ${employee?.name || "الموظف"} للحدث`);
      refetchAssigned();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تعيين الموظف");
    },
  });

  // Unassign mutation
  const unassignMutation = api.valet.unassignEmployeeFromSession.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء تعيين الموظف");
      refetchAssigned();
      setRemoveConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "فشل إلغاء التعيين");
    },
  });

  // Get list of unassigned active employees
  const assignedIds = new Set(assignedEmployees?.map((e) => e.id) ?? []);
  const unassignedEmployees =
    allEmployees?.filter((e) => e.isActive && !assignedIds.has(e.id)) ?? [];

  if (!valetEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">موظفي الفاليه</CardTitle>
              <CardDescription>
                إدارة موظفي الفاليه المعينين لهذا الحدث
              </CardDescription>
            </div>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة موظف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة موظف للحدث</DialogTitle>
                <DialogDescription>
                  اختر موظف الفاليه لتعيينه في هذا الحدث
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {allLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : unassignedEmployees.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>لا يوجد موظفين متاحين للتعيين</p>
                    <p className="text-xs mt-1">جميع الموظفين معينين أو غير نشطين</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {unassignedEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => {
                          assignMutation.mutate({
                            employeeId: employee.id,
                            sessionId,
                          });
                        }}
                        disabled={assignMutation.isPending}
                        className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-right"
                      >
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{employee.username}
                          </p>
                        </div>
                        {assignMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {assignedLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !assignedEmployees || assignedEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>لا يوجد موظفين معينين لهذا الحدث</p>
            <p className="text-xs mt-1">
              قم بتعيين موظفي الفاليه ليتمكنوا من رؤية الحدث في بوابتهم
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>@{employee.username}</span>
                      {employee.phone && (
                        <>
                          <span>•</span>
                          <span dir="ltr">{employee.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      employee.isActive
                        ? "bg-green-50 text-green-600 border-green-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    }
                  >
                    {employee.isActive ? "نشط" : "معطل"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setRemoveConfirm({
                        employeeId: employee.id,
                        employeeName: employee.name,
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Remove Confirmation */}
      <AlertDialog
        open={!!removeConfirm}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء تعيين الموظف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء تعيين "{removeConfirm?.employeeName}" من هذا
              الحدث؟ لن يتمكن من رؤية الحدث في بوابة الفاليه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeConfirm &&
                unassignMutation.mutate({
                  employeeId: removeConfirm.employeeId,
                  sessionId,
                })
              }
              disabled={unassignMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unassignMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              )}
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
