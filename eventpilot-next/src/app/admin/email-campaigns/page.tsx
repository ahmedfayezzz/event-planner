"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { CampaignHistory } from "@/components/admin/email-campaigns";

export default function EmailCampaignsPage() {
  // Stats query
  const { data: stats, isLoading: loadingStats } = api.bulkEmail.getCampaignStats.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">حملات البريد</h1>
          <p className="text-muted-foreground">
            إرسال رسائل بريد إلكتروني مخصصة للمستخدمين
          </p>
        </div>

        {/* Actions & Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Stats */}
          {loadingStats ? (
            <>
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </>
          ) : (
            <>
              <StatBadge
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                label="مكتملة"
                value={stats?.completed ?? 0}
              />
              <StatBadge
                icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                label="فاشلة"
                value={stats?.failed ?? 0}
              />
            </>
          )}

          {/* Action Buttons */}
          <Button variant="outline" asChild className="gap-2">
            <Link href="/admin/email-campaigns/templates">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">القوالب</span>
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/email-campaigns/new">
              <Plus className="h-4 w-4" />
              حملة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Campaign History */}
      <CampaignHistory />
    </div>
  );
}

// Stat Badge Component
function StatBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Badge variant="outline" className="gap-1.5 py-2 px-3">
      {icon}
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </Badge>
  );
}
