"use client";

import React, { useCallback } from "react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Users,
  Tag,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowLeft,
} from "lucide-react";
import type { SelectedUser, CampaignFilters } from "./types";

interface StepRecipientsProps {
  selectedUsers: SelectedUser[];
  setSelectedUsers: (users: SelectedUser[]) => void;
  filters: CampaignFilters;
  setFilters: (filters: CampaignFilters) => void;
  onNext: () => void;
}

export function StepRecipients({
  selectedUsers,
  setSelectedUsers,
  filters,
  setFilters,
  onNext,
}: StepRecipientsProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "session">("all");
  const [search, setSearch] = React.useState(filters.search ?? "");
  const debouncedSearch = useDebounce(search, 300);
  const [labelDialogOpen, setLabelDialogOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Queries
  const { data: usersData, isLoading: loadingUsers, isFetching: fetchingUsers } =
    api.bulkEmail.getUsersForBulkEmail.useQuery(
      activeTab === "all"
        ? {
            search: debouncedSearch || undefined,
            roleFilter: filters.roleFilter,
            labelIds: filters.labelIds?.length ? filters.labelIds : undefined,
            isActive: filters.isActive,
            limit: 200,
          }
        : {
            sessionId: filters.sessionId || undefined,
            registrationStatus: filters.registrationStatus !== "all" ? filters.registrationStatus : undefined,
            approvalStatus: filters.approvalStatus !== "all" ? filters.approvalStatus : undefined,
            attendanceStatus: filters.attendanceStatus !== "all" ? filters.attendanceStatus : undefined,
            roleFilter: filters.roleFilter,
            limit: 200,
          },
      { enabled: activeTab === "all" || !!filters.sessionId }
    );

  const { data: labels } = api.bulkEmail.getLabels.useQuery();
  const { data: sessions } = api.bulkEmail.getSessions.useQuery();

  const users = usersData?.users ?? [];
  const selectedIds = new Set(selectedUsers.map((u) => u.id));

  const toggleUser = useCallback(
    (user: { id: string; name: string; email: string; companyName?: string | null; position?: string | null }) => {
      if (selectedIds.has(user.id)) {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        setSelectedUsers([
          ...selectedUsers,
          {
            id: user.id,
            name: user.name,
            email: user.email,
            companyName: user.companyName ?? undefined,
            position: user.position ?? undefined,
          },
        ]);
      }
    },
    [selectedUsers, setSelectedUsers, selectedIds]
  );

  const selectAll = useCallback(() => {
    const currentIds = users.map((u) => u.id);
    const allSelected = currentIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedUsers(selectedUsers.filter((u) => !currentIds.includes(u.id)));
    } else {
      const newUsers = users
        .filter((u) => !selectedIds.has(u.id))
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          companyName: u.companyName ?? undefined,
          position: u.position ?? undefined,
        }));
      setSelectedUsers([...selectedUsers, ...newUsers]);
    }
  }, [users, selectedUsers, setSelectedUsers, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedUsers([]);
  }, [setSelectedUsers]);

  const allCurrentSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  return (
    <div className="space-y-4">
      {/* Header with selected count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-4 py-2">
            <Users className="h-4 w-4 ml-2" />
            {selectedUsers.length} مستخدم محدد
          </Badge>
          {selectedUsers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 ml-1" />
              مسح
            </Button>
          )}
        </div>
        <Button
          onClick={onNext}
          disabled={selectedUsers.length === 0}
          className="gap-2"
        >
          التالي
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Selection Panel */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "session")}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">كل المستخدمين</TabsTrigger>
              <TabsTrigger value="session" className="flex-1">حسب الجلسة</TabsTrigger>
            </TabsList>

            {/* All Users Tab */}
            <TabsContent value="all" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد أو الهاتف..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setFilters({ ...filters, search: e.target.value });
                  }}
                  className="pr-9"
                />
              </div>

              {/* Collapsible Filters (Mobile) */}
              <div className="lg:hidden">
                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        الفلاتر
                        {(filters.roleFilter !== "all" || (filters.labelIds?.length ?? 0) > 0 || filters.isActive !== undefined) && (
                          <Badge variant="secondary" className="mr-2">مفعلة</Badge>
                        )}
                      </span>
                      {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <FiltersRow
                      filters={filters}
                      setFilters={setFilters}
                      labels={labels}
                      labelDialogOpen={labelDialogOpen}
                      setLabelDialogOpen={setLabelDialogOpen}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Filters Row (Desktop) */}
              <div className="hidden lg:block">
                <FiltersRow
                  filters={filters}
                  setFilters={setFilters}
                  labels={labels}
                  labelDialogOpen={labelDialogOpen}
                  setLabelDialogOpen={setLabelDialogOpen}
                />
              </div>
            </TabsContent>

            {/* By Session Tab */}
            <TabsContent value="session" className="space-y-4 mt-4">
              <Select
                value={filters.sessionId ?? ""}
                onValueChange={(v) => setFilters({ ...filters, sessionId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الجلسة" />
                </SelectTrigger>
                <SelectContent>
                  {sessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title} - #{session.sessionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filters.sessionId && (
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={filters.registrationStatus ?? "all"}
                    onValueChange={(v) => setFilters({ ...filters, registrationStatus: v as typeof filters.registrationStatus })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="التسجيل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="registered">مسجل</SelectItem>
                      <SelectItem value="not_registered">غير مسجل</SelectItem>
                    </SelectContent>
                  </Select>

                  {filters.registrationStatus === "registered" && (
                    <>
                      <Select
                        value={filters.approvalStatus ?? "all"}
                        onValueChange={(v) => setFilters({ ...filters, approvalStatus: v as typeof filters.approvalStatus })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="الموافقة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="approved">مؤكد</SelectItem>
                          <SelectItem value="pending">معلق</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.attendanceStatus ?? "all"}
                        onValueChange={(v) => setFilters({ ...filters, attendanceStatus: v as typeof filters.attendanceStatus })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="الحضور" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="attended">حضر</SelectItem>
                          <SelectItem value="not_attended">لم يحضر</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Select All */}
          {users.length > 0 && (
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allCurrentSelected}
                  onCheckedChange={selectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  تحديد الكل ({users.length})
                </label>
              </div>
              {fetchingUsers && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}

          {/* Users List */}
          <ScrollArea className="h-[400px]">
            {loadingUsers ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeTab === "session" && !filters.sessionId
                  ? "اختر جلسة للبدء"
                  : "لا يوجد مستخدمين"}
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedIds.has(user.id) && "bg-muted"
                    )}
                    onClick={() => toggleUser(user)}
                  >
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleUser(user)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {user.labels?.slice(0, 2).map((label) => (
                        <span
                          key={label.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                          title={label.name}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          </CardContent>
        </Card>

        {/* Selected Users Panel */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
            <h3 className="font-medium">المحددين ({selectedUsers.length})</h3>
            {selectedUsers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                مسح الكل
              </Button>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            {selectedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لم يتم تحديد أي مستخدم
              </div>
            ) : (
              <div className="space-y-1">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50">
        <Button
          onClick={onNext}
          disabled={selectedUsers.length === 0}
          className="w-full gap-2"
        >
          التالي - {selectedUsers.length} مستخدم
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Filters Row Component
function FiltersRow({
  filters,
  setFilters,
  labels,
  labelDialogOpen,
  setLabelDialogOpen,
}: {
  filters: CampaignFilters;
  setFilters: (filters: CampaignFilters) => void;
  labels: { id: string; name: string; color: string }[] | undefined;
  labelDialogOpen: boolean;
  setLabelDialogOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.roleFilter}
        onValueChange={(v) => setFilters({ ...filters, roleFilter: v as typeof filters.roleFilter })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="النوع" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="USER">عضو</SelectItem>
          <SelectItem value="GUEST">ضيف</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn((filters.labelIds?.length ?? 0) > 0 && "border-primary")}
          >
            <Tag className="h-4 w-4 ml-2" />
            {(filters.labelIds?.length ?? 0) > 0 ? `${filters.labelIds?.length} تصنيف` : "التصنيفات"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اختر التصنيفات</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {labels?.map((label) => (
              <div key={label.id} className="flex items-center gap-2">
                <Checkbox
                  id={label.id}
                  checked={filters.labelIds?.includes(label.id)}
                  onCheckedChange={(checked) => {
                    const newLabelIds = checked
                      ? [...(filters.labelIds ?? []), label.id]
                      : (filters.labelIds ?? []).filter((id) => id !== label.id);
                    setFilters({ ...filters, labelIds: newLabelIds });
                  }}
                />
                <label
                  htmlFor={label.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </label>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Select
        value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"}
        onValueChange={(v) => {
          if (v === "all") setFilters({ ...filters, isActive: undefined });
          else if (v === "active") setFilters({ ...filters, isActive: true });
          else setFilters({ ...filters, isActive: false });
        }}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="active">نشط</SelectItem>
          <SelectItem value="inactive">غير نشط</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
