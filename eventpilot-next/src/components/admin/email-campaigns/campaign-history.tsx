"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn, formatArabicDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  MoreVertical,
  Eye,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  Mail,
  Calendar,
} from "lucide-react";
import { EmailPreviewInline } from "@/components/admin/email-preview";

type CampaignStatus = "all" | "draft" | "sending" | "completed" | "failed";

export function CampaignHistory() {
  const utils = api.useUtils();

  const [statusFilter, setStatusFilter] = useState<CampaignStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Queries
  const { data: campaignsData, isLoading, isFetching } = api.bulkEmail.getCampaigns.useQuery({
    status: statusFilter,
    search: search || undefined,
    limit: 20,
  });

  const { data: selectedCampaign, isLoading: loadingCampaign } = api.bulkEmail.getCampaign.useQuery(
    { id: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );

  const { data: recipients, isLoading: loadingRecipients } = api.bulkEmail.getCampaignRecipients.useQuery(
    { campaignId: selectedCampaignId!, limit: 100 },
    { enabled: !!selectedCampaignId }
  );

  // Mutations
  const deleteCampaignMutation = api.bulkEmail.deleteCampaign.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحملة");
      setDeleteConfirmId(null);
      utils.bulkEmail.getCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const resendToFailedMutation = api.bulkEmail.resendToFailed.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة تعيين الرسائل الفاشلة");
      utils.bulkEmail.getCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const sendCampaignMutation = api.bulkEmail.sendCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال ${data.sentCount} رسالة`);
      utils.bulkEmail.getCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const campaigns = campaignsData?.campaigns ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الحملات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="sending">جاري الإرسال</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="failed">فاشلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد حملات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={() => setSelectedCampaignId(campaign.id)}
              onDelete={() => setDeleteConfirmId(campaign.id)}
              onResend={() => {
                if (campaign.status === "draft") {
                  sendCampaignMutation.mutate({ campaignId: campaign.id });
                } else {
                  resendToFailedMutation.mutate({ campaignId: campaign.id });
                }
              }}
              isResending={sendCampaignMutation.isPending || resendToFailedMutation.isPending}
            />
          ))}
        </div>
      )}

      {isFetching && !isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Campaign Details Modal */}
      <Dialog open={!!selectedCampaignId} onOpenChange={() => setSelectedCampaignId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>تفاصيل الحملة</DialogTitle>
          </DialogHeader>

          {loadingCampaign ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedCampaign ? (
            <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full">
                <TabsTrigger value="preview" className="flex-1">معاينة</TabsTrigger>
                <TabsTrigger value="recipients" className="flex-1">
                  المستلمين ({selectedCampaign._count.recipients})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard
                      icon={<Users className="h-4 w-4" />}
                      label="المستلمين"
                      value={selectedCampaign.totalRecipients}
                    />
                    <StatCard
                      icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                      label="تم الإرسال"
                      value={selectedCampaign.sentCount}
                    />
                    <StatCard
                      icon={<XCircle className="h-4 w-4 text-red-500" />}
                      label="فشل"
                      value={selectedCampaign.failedCount}
                    />
                  </div>

                  {/* Subject */}
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">الموضوع:</div>
                    <div className="font-medium">{selectedCampaign.subject}</div>
                  </div>

                  {/* Email Preview */}
                  <EmailPreviewInline html={selectedCampaign.content} className="min-h-[300px]" />
                </div>
              </TabsContent>

              <TabsContent value="recipients" className="flex-1 overflow-hidden mt-4">
                {loadingRecipients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {recipients?.recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <StatusIcon status={recipient.status} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {recipient.name ?? recipient.email}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {recipient.email}
                            </div>
                          </div>
                          {recipient.sentAt && (
                            <div className="text-xs text-muted-foreground">
                              {formatArabicDate(recipient.sentAt)}
                            </div>
                          )}
                          {recipient.errorMessage && (
                            <Badge variant="destructive" className="text-xs">
                              {recipient.errorMessage}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الحملة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteCampaignMutation.mutate({ id: deleteConfirmId });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampaignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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

// Campaign Card Component
function CampaignCard({
  campaign,
  onView,
  onDelete,
  onResend,
  isResending,
}: {
  campaign: {
    id: string;
    name: string | null;
    subject: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    createdAt: Date;
    sentAt: Date | null;
    completedAt: Date | null;
    createdBy: { name: string } | null;
  };
  onView: () => void;
  onDelete: () => void;
  onResend: () => void;
  isResending: boolean;
}) {
  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={campaign.status} />
            {campaign.name && (
              <span className="text-sm text-muted-foreground">{campaign.name}</span>
            )}
          </div>
          <div className="font-medium truncate">{campaign.subject}</div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.sentCount}/{campaign.totalRecipients}
            </span>
            {campaign.failedCount > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" />
                {campaign.failedCount} فشل
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatArabicDate(campaign.createdAt)}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 ml-2" />
              عرض
            </DropdownMenuItem>
            {(campaign.status === "draft" || campaign.failedCount > 0) && (
              <DropdownMenuItem onClick={onResend} disabled={isResending}>
                {isResending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-2" />
                )}
                {campaign.status === "draft" ? "إرسال" : "إعادة الإرسال"}
              </DropdownMenuItem>
            )}
            {campaign.status !== "sending" && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "مسودة", variant: "secondary" },
    sending: { label: "جاري الإرسال", variant: "default" },
    completed: { label: "مكتملة", variant: "outline" },
    failed: { label: "فاشلة", variant: "destructive" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "secondary" as const };

  return <Badge variant={variant}>{label}</Badge>;
}

// Status Icon Component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "pending":
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
