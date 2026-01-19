"use client";

import React, { use, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { normalizeArabic } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatArabicDateTime } from "@/lib/utils";
import {
  ArrowRight,
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  RefreshCw,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Percent,
  PlayCircle,
  Search,
  Tag,
  MessageSquare,
  Bot,
  User,
} from "lucide-react";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          في الانتظار
        </Badge>
      );
    case "initiated":
      return (
        <Badge variant="default" className="gap-1 bg-blue-500">
          <PhoneCall className="h-3 w-3" />
          تم الإرسال
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          مكتملة
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          فشلت
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Confirmation response badge
function ResponseBadge({ response }: { response: string | null }) {
  if (!response) return <span className="text-muted-foreground">-</span>;

  switch (response) {
    case "confirmed":
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          مؤكد
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          اعتذر
        </Badge>
      );
    case "no_response":
      return (
        <Badge variant="secondary" className="gap-1">
          <PhoneMissed className="h-3 w-3" />
          لم يرد
        </Badge>
      );
    default:
      return <Badge variant="outline">{response}</Badge>;
  }
}

type TypeFilterType = "all" | "member" | "guest";
type LabelFilterType = "all" | string;

export default function VoiceCallsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<{
    recipientName: string;
    history: Array<{ role: string; content: string; timeAdded?: string }>;
  } | null>(null);

  // Batch dialog filters
  const [batchSearch, setBatchSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all");
  const [labelFilter, setLabelFilter] = useState<LabelFilterType>("all");
  const debouncedBatchSearch = useDebounce(batchSearch, 300);

  // Queries
  const { data: session, isLoading: sessionLoading } =
    api.session.getAdminDetails.useQuery({ id });

  const {
    data: calls,
    isLoading: callsLoading,
    refetch: refetchCalls,
  } = api.voiceCall.getBySession.useQuery({ sessionId: id });

  const { data: stats, refetch: refetchStats } =
    api.voiceCall.getStatistics.useQuery({ sessionId: id });

  const { data: callableRegistrations } =
    api.voiceCall.getCallableRegistrations.useQuery({ sessionId: id });

  const { data: allLabels } = api.label.getAll.useQuery();

  const { data: callLogs, isLoading: logsLoading } =
    api.voiceCall.getLogs.useQuery(
      { callId: selectedCallId! },
      { enabled: !!selectedCallId }
    );

  // Mutations
  const dispatchSingleMutation = api.voiceCall.dispatchSingle.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetchCalls();
        refetchStats();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const dispatchBatchMutation = api.voiceCall.dispatchBatch.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setSelectedIds(new Set());
        setShowBatchDialog(false);
        refetchCalls();
        refetchStats();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const retryMutation = api.voiceCall.retry.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetchCalls();
        refetchStats();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  // Handlers
  const handleDispatchSingle = (registrationId: string) => {
    dispatchSingleMutation.mutate({ registrationId, sessionId: id });
  };

  const handleDispatchBatch = () => {
    if (selectedIds.size === 0) {
      toast.error("يرجى اختيار مشارك واحد على الأقل");
      return;
    }
    dispatchBatchMutation.mutate({
      sessionId: id,
      registrationIds: Array.from(selectedIds),
    });
  };

  const handleRetry = (callId: string) => {
    retryMutation.mutate({ callId });
  };

  const handleViewLogs = (callId: string) => {
    setSelectedCallId(callId);
    setShowLogsDialog(true);
  };

  const handleViewConversation = (
    recipientName: string,
    history: Array<{ role: string; content: string; timeAdded?: string }> | null
  ) => {
    if (!history || history.length === 0) {
      toast.error("لا يوجد سجل محادثة لهذه المكالمة");
      return;
    }
    setSelectedConversation({ recipientName, history });
    setShowConversationDialog(true);
  };

  const toggleSelect = (regId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(regId)) {
      newSet.delete(regId);
    } else {
      newSet.add(regId);
    }
    setSelectedIds(newSet);
  };

  // Filter callable registrations for batch dialog
  const filteredCallableRegistrations = useMemo(() => {
    if (!callableRegistrations) return [];

    let filtered = callableRegistrations;

    // Filter by type (member/guest)
    if (typeFilter === "member") {
      filtered = filtered.filter((reg) => !reg.isGuest);
    } else if (typeFilter === "guest") {
      filtered = filtered.filter((reg) => reg.isGuest);
    }

    // Filter by label
    if (labelFilter !== "all") {
      filtered = filtered.filter((reg) =>
        reg.labels?.some((label) => label.id === labelFilter)
      );
    }

    // Filter by search (name, email, phone)
    if (debouncedBatchSearch.trim()) {
      const normalizedSearch = normalizeArabic(debouncedBatchSearch);
      filtered = filtered.filter(
        (reg) =>
          normalizeArabic(reg.name || "").includes(normalizedSearch) ||
          normalizeArabic(reg.email || "").includes(normalizedSearch) ||
          normalizeArabic(reg.phone || "").includes(normalizedSearch)
      );
    }

    return filtered;
  }, [callableRegistrations, typeFilter, labelFilter, debouncedBatchSearch]);

  // Reset filters when dialog closes
  const handleCloseBatchDialog = () => {
    setShowBatchDialog(false);
    setBatchSearch("");
    setTypeFilter("all");
    setLabelFilter("all");
  };

  // Select all filtered registrations
  const toggleSelectAllFiltered = () => {
    if (selectedIds.size === filteredCallableRegistrations.length && filteredCallableRegistrations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCallableRegistrations.map((r) => r.id)));
    }
  };

  if (sessionLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">الجلسة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/admin/sessions/${id}/attendees`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">مكالمات تأكيد الحضور</h1>
          </div>
          <p className="text-muted-foreground">
            {session.title} - الجلسة #{session.sessionNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchCalls();
              refetchStats();
            }}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={() => setShowBatchDialog(true)}>
            <Phone className="h-4 w-4 ml-2" />
            إرسال مكالمات
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              إجمالي المكالمات
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {stats?.initiated ?? 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <PhoneCall className="h-3 w-3" />
              قيد التنفيذ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {stats?.completed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              مكتملة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {stats?.confirmed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              أكدوا الحضور
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">
              {stats?.declined ?? 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              اعتذروا
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.failed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <PhoneOff className="h-3 w-3" />
              فشلت
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {stats?.confirmationRate?.toFixed(1) ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              نسبة التأكيد
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            سجل المكالمات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !calls || calls.length === 0 ? (
            <div className="text-center py-12">
              <PhoneOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">لا توجد مكالمات بعد</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإرسال مكالمات تأكيد للمسجلين
              </p>
              <Button onClick={() => setShowBatchDialog(true)}>
                <Phone className="h-4 w-4 ml-2" />
                إرسال مكالمات
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>المشارك</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الرد</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead className="w-32">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call, index) => (
                  <TableRow key={call.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {call.recipientName}
                    </TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {call.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell>
                      <ResponseBadge response={call.confirmationResponse} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatArabicDateTime(call.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewLogs(call.id)}
                          title="السجل"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {call.conversationHistory && call.conversationHistory.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleViewConversation(
                                call.recipientName || "المشارك",
                                call.conversationHistory
                              )
                            }
                            title="عرض المحادثة"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {call.recordingUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="تشغيل التسجيل"
                          >
                            <a
                              href={call.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {call.status === "failed" &&
                          call.retryCount < call.maxRetries && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(call.id)}
                              disabled={retryMutation.isPending}
                              title="إعادة المحاولة"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Batch Call Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={handleCloseBatchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إرسال مكالمات جماعية</DialogTitle>
            <DialogDescription>
              اختر المشاركين لإرسال مكالمات تأكيد الحضور
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد أو الهاتف..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="pe-10"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TypeFilterType)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="member">عضو</SelectItem>
                  <SelectItem value="guest">زائر</SelectItem>
                </SelectContent>
              </Select>
              {allLabels && allLabels.length > 0 && (
                <Select
                  value={labelFilter}
                  onValueChange={(v) => setLabelFilter(v as LabelFilterType)}
                >
                  <SelectTrigger className="w-40">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <SelectValue placeholder="التصنيف" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {allLabels.map((label) => (
                      <SelectItem key={label.id} value={label.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Select All */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="selectAll"
                checked={
                  filteredCallableRegistrations.length > 0 &&
                  selectedIds.size === filteredCallableRegistrations.length
                }
                onCheckedChange={toggleSelectAllFiltered}
              />
              <label htmlFor="selectAll" className="text-sm font-medium">
                تحديد الكل ({filteredCallableRegistrations.length} مشارك)
              </label>
              {filteredCallableRegistrations.length !== (callableRegistrations?.length ?? 0) && (
                <span className="text-xs text-muted-foreground">
                  من أصل {callableRegistrations?.length ?? 0}
                </span>
              )}
            </div>

            {/* Registrations List */}
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-2">
                {filteredCallableRegistrations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد نتائج مطابقة
                  </p>
                ) : (
                  filteredCallableRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(reg.id)}
                          onCheckedChange={() => toggleSelect(reg.id)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{reg.name}</p>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {reg.isGuest ? "زائر" : "عضو"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" dir="ltr">
                            {reg.phone}
                          </p>
                          {reg.labels && reg.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reg.labels.slice(0, 3).map((label) => (
                                <Badge
                                  key={label.id}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                  style={{
                                    backgroundColor: label.color + "20",
                                    color: label.color,
                                    borderColor: label.color + "40",
                                  }}
                                >
                                  {label.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {reg.lastCall && (
                        <div className="text-left">
                          <StatusBadge status={reg.lastCall.status} />
                          {reg.lastCall.confirmationResponse && (
                            <div className="mt-1">
                              <ResponseBadge
                                response={reg.lastCall.confirmationResponse}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              تم اختيار {selectedIds.size} مشارك
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseBatchDialog}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDispatchBatch}
              disabled={
                selectedIds.size === 0 || dispatchBatchMutation.isPending
              }
            >
              {dispatchBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Phone className="h-4 w-4 ml-2" />
              )}
              إرسال {selectedIds.size} مكالمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سجل المكالمة</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !callLogs || callLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                لا توجد سجلات
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-center p-2 border rounded-md"
                    >
                      <div>
                        <Badge variant="outline">{log.eventType}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatArabicDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation History Dialog */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              محادثة المكالمة - {selectedConversation?.recipientName}
            </DialogTitle>
            <DialogDescription>
              سجل المحادثة بين النظام والمشارك
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] px-1">
            <div className="space-y-3 py-4">
              {selectedConversation?.history.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "assistant" ? "flex-row" : "flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "assistant"
                        ? "bg-primary/10 text-primary"
                        : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-lg p-3 ${
                      message.role === "assistant"
                        ? "bg-muted text-foreground"
                        : "bg-green-500/10 text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.timeAdded && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {message.timeAdded}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
